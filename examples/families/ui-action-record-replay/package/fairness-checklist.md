# Fairness checklist

A family that punishes a correct implementation is worse than no family: it produces failures that
teach the wrong lesson. Work through every risk the registry records for these mechanisms.

- [ ] If the interleaving that opens the window is not reachable through the documented stepping API, a correct implementation cannot demonstrate its guard and an incorrect one cannot be caught — the check grades nothing in either direction.
- [ ] Wall-clock-dependent windows make the grade a function of machine speed rather than of the implementation; step-numbered expiry is the fair form.
- [ ] Requiring re-validation on every read punishes an implementation that has correctly proven the value cannot change on that path.
- [ ] If the surface changes in ways nothing in the observation predicts, no implementation can bind correctly and the instance grades luck.
- [ ] Grading an exact action sequence punishes a correct agent that reaches the same end state by a different route.
- [ ] Non-deterministic rendering — animation, lazy loading, network timing — can fail a correct implementation on rerun unless the harness quiesces the surface first.
- [ ] If the target environment is not fully specified, a correct implementation fails on a dependency the author considered too obvious to state.
- [ ] Network-dependent verification makes the grade a function of registry availability rather than of the artifact under test.
- [ ] Pinning demanded too strictly punishes an implementation that correctly declares a compatible version range.

## Kill taxonomy — apply before building

- [ ] **already-solved** — do current models already handle this correctly? Measure before building.
- [ ] **self-verifiable** — can the agent cheaply brute-force a check and confirm its own answer?
- [ ] **unfair-or-defused** — is the mechanism that makes the task solvable the same one that
      defuses its trap?
- [ ] **no-window** — is the race or interleaving this depends on reliably reachable?

Four of nine gated mechanisms in the source project died of the first category alone.
