"""Offline, bounded, unprivileged compilation of the public submission tree."""
import json
import os
from pathlib import Path
import sys
sys.path.insert(0, '/tests')
from bounded_process import run_bounded

for root in ['/tmp/certd-src', '/tmp/certd-build', '/tmp/certd-go-cache']:
    Path(root).mkdir(exist_ok=True)
    for path in [Path(root), *Path(root).rglob('*')]:
        os.chown(path, 65534, 65534)
r = run_bounded(['setpriv', '--reuid', 'nobody', '--regid', 'nogroup', '--clear-groups',
                 '--no-new-privs', '/usr/local/go/bin/go', 'build', '-o', '/tmp/certd-build/certd', './cmd/certd'],
                cwd='/tmp/certd-src', timeout_sec=180, exclusive_uid=65534,
                env={'PATH':'/usr/local/go/bin:/usr/bin:/bin','HOME':'/tmp/certd-src',
                     'GOCACHE':'/tmp/certd-go-cache','GOFLAGS':'-mod=mod','GOPROXY':'off',
                     'GOTOOLCHAIN':'local','CGO_ENABLED':'0'})
Path('/logs/verifier/build.json').write_text(json.dumps(r,sort_keys=True))
print(r['stdout']);print(r['stderr'])
if r['status'] != 'completed':
    sys.exit(1)
os.chown('/tmp/certd-build',0,0)
os.chmod('/tmp/certd-build',0o755)
os.chown('/tmp/certd-build/certd',0,0)
os.chmod('/tmp/certd-build/certd',0o555)
