# Cheat-resistance checklist

Three real bypasses were found in the source project's own verifier, two of them by writing the
exploit and running it rather than by inspection. Assume yours has some too.

- [ ] An implementation can serialize all work behind one global lock, making staleness unreachable while destroying the concurrency the task exists to exercise, so the grader needs an independent progress property.
- [ ] If the fencing token is supplied by the implementation, it can emit a constant and satisfy any check that only compares tokens against themselves.
- [ ] A grader asserting on retry counts rather than on committed effects rewards defensive retrying that never actually validates.
- [ ] An implementation can deny everything and pass every negative test, so the permitted-path checks must carry equal weight in the score.
- [ ] If the grader's own credentials are reachable from the implementation's process, the boundary is decorative; trust-auth for all roles was the measured form of this.
- [ ] Checking that a guard function was called, rather than that the effect was prevented, is satisfied by calling it and discarding the result.
- [ ] The bypass is the cheat: an implementation that finds the leak scores well without the capability, and a naive grader records that score as evidence of the capability.
- [ ] A per-instance seed derivable from a shipped artifact silently turns the hidden region into a public one.
- [ ] If hidden material is present-but-unreadable rather than absent, any privilege escalation converts directly into a full score.

## Structural requirements

- [ ] Ground truth lives in a process the implementation under test cannot reach.
- [ ] The grading process never imports the implementation's code.
- [ ] Scenario inputs are regenerated from the seed, not taken from the implementation's own report.
- [ ] A deliberately empty run (no external calls at all) scores zero.
- [ ] An implementation that rebinds or monkeypatches the ground-truth accessor scores zero, and
      fails identically to the plain no-op so the tampering is provably inert.
- [ ] The reward channel is writable only by the grader.
