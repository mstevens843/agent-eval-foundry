# External intake

Returned third-party packets are preserved under `external-intake/received/<run-id>/` by:

```bash
node dist/cli.js external import <packet-dir>
```

Invalid, stale, refused, infrastructure-error, contaminated, or incomplete packets are kept here as
no-count evidence. Completed current-hash packets with transcript, submission, verifier output and
provider identity may also be re-graded into `trials/<family>/<run-id>/`.
