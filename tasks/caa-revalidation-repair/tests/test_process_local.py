"""Root-only deterministic capture and actual privilege controls, not model /cheat."""
import json
import os
from pathlib import Path
import tempfile
import unittest
import sys
sys.path.insert(0, '/tests')
import authority
import collect
from bounded_process import run_bounded, _uid_pids


class ProcessControls(unittest.TestCase):
    def run_subject(self, code, timeout=3, limit=65536):
        return run_bounded(['setpriv', '--reuid', 'nobody', '--regid', 'nogroup', '--clear-groups',
                            '--no-new-privs', 'python3', '-I', '-c', code],
                           timeout_sec=timeout, output_limit=limit, exclusive_uid=65534)

    def test_clean(self):
        r = self.run_subject('print("done")')
        self.assertEqual(r['status'], 'completed')
        self.assertEqual(r['stdout'], 'done\n')

    def test_noisy_stdout_and_stderr(self):
        for fd in (1, 2):
            r = self.run_subject('import os\nwhile True: os.write(%d, b"x"*8192)' % fd)
            self.assertEqual(r['status'], 'output-limit')
            self.assertLessEqual(len(r['stdout']), 2000)
            self.assertLessEqual(len(r['stderr']), 2000)
            self.assertTrue(r['reaped'])

    def test_timeout(self):
        r = self.run_subject('import time; time.sleep(30)', timeout=.2)
        self.assertEqual(r['status'], 'timeout')
        self.assertLess(r['elapsed_sec'], 3)
        self.assertFalse(_uid_pids(65534))

    def test_detached_descendant_is_reaped(self):
        r = self.run_subject('import os,time\np=os.fork()\nif p==0:\n os.setsid(); time.sleep(30)\nelse:\n print(p, flush=True)')
        self.assertEqual(r['status'], 'process-error')
        self.assertGreater(r['descendants_cleaned'], 0)
        self.assertFalse(_uid_pids(65534))

    def test_private_files_and_reward_have_positive_controls(self):
        Path('/logs/verifier').mkdir(parents=True, exist_ok=True)
        os.chmod('/logs/verifier', 0o700)
        Path('/logs/verifier/private-canary').write_text('host-owned')
        Path('/run/foundry-private/solution-canary').write_text('private-local-oracle')
        for path in ('/tests/scenarios/selected/sel-01.json', '/tests/reference/certd/go.mod', '/logs/verifier/private-canary', '/run/foundry-private/solution-canary'):
            self.assertTrue(Path(path).read_bytes())
            r = self.run_subject('from pathlib import Path\ntry:\n Path(%r).read_bytes(); print("LEAK")\nexcept PermissionError:\n print("DENIED")' % path)
            self.assertEqual(r['status'], 'completed')
            self.assertEqual(r['stdout'].strip(), 'DENIED')

    def test_actual_order_collector_overflow_and_timeout(self):
        previous = collect.ORDER_TIMEOUT_SEC
        try:
            for code, expected in [('import time;time.sleep(30)', 'timeout'),
                                   ('import os\nwhile True: os.write(1,b"x"*65536)', 'output-limit')]:
                with tempfile.TemporaryDirectory() as directory:
                    os.chmod(directory,0o777)
                    binary=Path(directory)/'local-control'
                    binary.write_text('#!/usr/bin/python3\n'+code+'\n');binary.chmod(0o755)
                    Path(directory,'store.json').write_text('{"authorizations":{}}')
                    collect.ORDER_TIMEOUT_SEC=.2
                    entry={'id':'local-order','identifiers':['example.test'],'at':'2031-03-04T12:00:00Z'}
                    result=collect._run_order(directory,{},entry,str(binary))
                    self.assertEqual(result['status'],expected)
                    self.assertTrue(result['reaped'])
                    self.assertLessEqual(len(result['stdout']),2000)
        finally:
            collect.ORDER_TIMEOUT_SEC=previous

    def test_authority_control_boundary(self):
        public, control = authority.serve()
        try:
            self.assertIn('events', authority.call_control({'op': 'dump'}))
            self.assertEqual(authority.call_control({'op': 'dump'}, path=authority.PUBLIC_SOCK), {'error': 'unknown op'})
            r = self.run_subject('import socket\ns=socket.socket(socket.AF_UNIX)\ntry:\n s.connect(%r); print("LEAK")\nexcept PermissionError:\n print("DENIED")' % authority.CONTROL_SOCK)
            self.assertEqual(r['stdout'].strip(), 'DENIED')
        finally:
            public.shutdown(); control.shutdown(); public.server_close(); control.server_close()


if __name__ == '__main__':
    unittest.main()
