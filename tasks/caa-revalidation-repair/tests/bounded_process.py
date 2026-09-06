"""Bounded pipe capture for one isolated local command, not a model runner.

The optional exclusive_uid is only valid in a dedicated verifier container: no
other work may use that uid. It lets cleanup find children that call setsid.
"""
import ctypes
import os
import selectors
import signal
import subprocess
import sys
import time


def _uid_pids(uid):
    found = []
    for name in os.listdir('/proc'):
        if not name.isdigit():
            continue
        try:
            if os.stat('/proc/' + name).st_uid == uid:
                found.append(int(name))
        except FileNotFoundError:
            pass
    return found


def run_bounded(argv, *, timeout_sec, output_limit=1024 * 1024, excerpt_limit=2000,
                cwd=None, env=None, exclusive_uid=None):
    if timeout_sec <= 0 or output_limit <= 0 or not 0 <= excerpt_limit <= output_limit:
        raise ValueError('invalid process bounds')
    if exclusive_uid is not None:
        if sys.platform != 'linux' or os.geteuid() != 0 or exclusive_uid == 0:
            raise ValueError('exclusive uid cleanup requires a dedicated root Linux collector')
        # Adopt orphaned grandchildren so killed descendants are reaped, not just signalled.
        if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
            raise OSError(ctypes.get_errno(), 'PR_SET_CHILD_SUBREAPER')
        if _uid_pids(exclusive_uid):
            raise RuntimeError('exclusive submission uid was not empty before execution')
    start = time.monotonic()
    proc = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, start_new_session=True, cwd=cwd, env=env)
    counts = {'stdout': 0, 'stderr': 0}
    excerpts = {'stdout': bytearray(), 'stderr': bytearray()}
    status = 'completed'
    selector = selectors.DefaultSelector()
    for name, stream in [('stdout', proc.stdout), ('stderr', proc.stderr)]:
        os.set_blocking(stream.fileno(), False)
        selector.register(stream, selectors.EVENT_READ, name)
    descendants = []
    try:
        while selector.get_map():
            remaining = timeout_sec - (time.monotonic() - start)
            if remaining <= 0:
                status = 'timeout'
                break
            events = selector.select(min(remaining, 0.05))
            if not events and proc.poll() is not None:
                # A descendant holding a pipe open must not extend the command lifetime.
                break
            for key, _ in events:
                chunk = os.read(key.fileobj.fileno(), 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                name = key.data
                counts[name] += len(chunk)
                excerpts[name].extend(chunk[:max(0, excerpt_limit - len(excerpts[name]))])
                if counts[name] > output_limit:
                    status = 'output-limit'
                    break
            if status != 'completed':
                break
        if status == 'completed':
            try:
                proc.wait(timeout=max(0.001, timeout_sec - (time.monotonic() - start)))
            except subprocess.TimeoutExpired:
                status = 'timeout'
    finally:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        if exclusive_uid is not None:
            descendants = [p for p in _uid_pids(exclusive_uid) if p != proc.pid]
            for pid in descendants:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        proc.wait(timeout=5)
        selector.close()
        proc.stdout.close()
        proc.stderr.close()
        if exclusive_uid is not None:
            until = time.monotonic() + 5
            while True:
                try:
                    pid, _ = os.waitpid(-1, os.WNOHANG)
                except ChildProcessError:
                    pid = 0
                if not _uid_pids(exclusive_uid):
                    break
                if time.monotonic() >= until:
                    raise RuntimeError('submission descendants survived cleanup')
                if pid == 0:
                    time.sleep(0.01)
    if status == 'completed' and (proc.returncode != 0 or descendants):
        status = 'process-error'
    return {'status': status, 'exit_code': proc.returncode, 'timed_out': status == 'timeout',
            'output_overflow': status == 'output-limit', 'bytes_observed': counts,
            'stdout': excerpts['stdout'].decode('utf-8', 'replace'),
            'stderr': excerpts['stderr'].decode('utf-8', 'replace'),
            'descendants_cleaned': len(descendants), 'reaped': True,
            'elapsed_sec': round(time.monotonic() - start, 3)}
