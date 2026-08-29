# Cheat-resistance checklist

Three real bypasses were found in the source project's own verifier, two of them by writing the
exploit and running it rather than by inspection. Assume yours has some too.

- [ ] An implementation that never performs the side effect trivially never duplicates it — measured as a live bypass at 113/113 with an empty ledger — so the grader must assert an expected execution count as a floor, not only as a ceiling.
- [ ] If the implementation can read or write the external system's call ledger, it can prune the duplicates after the fact; the durable-outbox audit found a genuinely double-executing engine scoring perfectly by rebinding the verifier's ledger accessor at import.
- [ ] Counting the implementation's own log of calls instead of the tool's independent record grades the implementation's self-report.
- [ ] An implementation can deny everything and pass every negative test, so the permitted-path checks must carry equal weight in the score.
- [ ] If the grader's own credentials are reachable from the implementation's process, the boundary is decorative; trust-auth for all roles was the measured form of this.
- [ ] Checking that a guard function was called, rather than that the effect was prevented, is satisfied by calling it and discarding the result.
- [ ] An implementation can avoid ambiguity entirely by never calling the tool, so the grader must assert an expected call count against the tool's own record.
- [ ] If the ambiguous case is signalled by an out-of-band marker the implementation can read, the task degrades from modelling to lookup.
- [ ] Asserting merely that some branch handled the case lets an implementation handle it by assuming failure, which is the guess the mechanism exists to catch.

## Structural requirements

- [ ] Ground truth lives in a process the implementation under test cannot reach.
- [ ] The grading process never imports the implementation's code.
- [ ] Scenario inputs are regenerated from the seed, not taken from the implementation's own report.
- [ ] A deliberately empty run (no external calls at all) scores zero.
- [ ] An implementation that rebinds or monkeypatches the ground-truth accessor scores zero, and
      fails identically to the plain no-op so the tampering is provably inert.
- [ ] The reward channel is writable only by the grader.
