"""Deterministic local controls through the unchanged public artifact/test.sh route.

Only named local implementations are accepted. This never invokes a model.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
sys.path.insert(0, '/tests')
from bounded_process import run_bounded


def main(name):
    allowed = {'oracle', 'alternative', 'feature-alternative', 'nop',
               'artifact-symlink', 'artifact-hardlink', 'artifact-fifo'} | {
        p.name for p in Path('/tests/mutants').iterdir() if p.is_dir()}
    if name not in allowed:
        raise ValueError('unknown local control')
    shutil.copytree('/run/foundry-private/inputs', '/app/certd')
    if name == 'oracle':
        # The actual shipped solution interface, not a shortcut reference binary.
        subprocess.run(['bash', '/run/foundry-private/solution/solve.sh'], check=True, timeout=180)
    elif name.startswith('artifact-'):
        if name == 'artifact-symlink':
            os.symlink('/tests/checks.py', '/app/certd/link')
        elif name == 'artifact-hardlink':
            os.link('/app/certd/go.mod', '/app/certd/link')
        else:
            os.mkfifo('/app/certd/pipe')
    elif name != 'nop':
        shutil.copytree('/tests/reference/certd', '/app/certd', dirs_exist_ok=True)
        overlay = 'alt-reference' if name in {'alternative', 'feature-alternative'} else name
        shutil.copytree('/tests/mutants/' + overlay, '/app/certd', dirs_exist_ok=True)
        if name == 'feature-alternative':
            # This harmless standard-library use hit the previous source-text ban.
            Path('/app/certd/cmd/certd/allowed_feature.go').write_text(
                'package main\nimport "os"\nfunc init() { _ = os.Setenv("GO_ALLOWED_EXAMPLE", "1") }\n')
            # Equivalent absence representations across report/audit are legal.
            writer = Path('/app/certd/internal/audit/writer.go')
            writer.write_text(writer.read_text().replace('json:"authorization"', 'json:"authorization,omitempty"'))
    capture = run_bounded(['bash', '/tests/test.sh'], timeout_sec=1000,
                          output_limit=8*1024*1024, excerpt_limit=4000)
    Path('/logs/local-capture.json').write_text(json.dumps(capture, sort_keys=True))
    print(json.dumps({'control': name, 'status': capture['status']}))
    return 0 if capture['status'] == 'completed' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
