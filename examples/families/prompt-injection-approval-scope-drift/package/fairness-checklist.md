# Fairness checklist

A family that punishes a correct implementation is worse than no family: it produces failures that
teach the wrong lesson. Work through every risk the registry records for these mechanisms.

- [ ] If the interleaving that opens the window is not reachable through the documented stepping API, a correct implementation cannot demonstrate its guard and an incorrect one cannot be caught — the check grades nothing in either direction.
- [ ] Wall-clock-dependent windows make the grade a function of machine speed rather than of the implementation; step-numbered expiry is the fair form.
- [ ] Requiring re-validation on every read punishes an implementation that has correctly proven the value cannot change on that path.
- [ ] If the authority model is not fully stated, a correct implementation can be graded down for a reasonable interpretation of a case the spec left silent.
- [ ] Grading the mechanism of enforcement rather than its effect punishes a sound alternative architecture that reaches the same guarantee differently.
- [ ] Denying an operation the spec permits is as much a failure as allowing one it forbids, so the suite must grade both directions or it quietly rewards over-refusal.
- [ ] Over-aggressive isolation strips resources a correct implementation legitimately needs, failing it for the harness's caution rather than for its own behaviour.
- [ ] Grading a trajectory for 'suspicious' reads punishes an implementation that explored its workspace honestly, which is normal and correct behaviour.
- [ ] If the declared input set is itself incomplete, a correct implementation gets flagged for reading something it was entitled to read.

## Kill taxonomy — apply before building

- [ ] **already-solved** — do current models already handle this correctly? Measure before building.
- [ ] **self-verifiable** — can the agent cheaply brute-force a check and confirm its own answer?
- [ ] **unfair-or-defused** — is the mechanism that makes the task solvable the same one that
      defuses its trap?
- [ ] **no-window** — is the race or interleaving this depends on reliably reachable?

Four of nine gated mechanisms in the source project died of the first category alone.
