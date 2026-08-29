# Fairness checklist

A family that punishes a correct implementation is worse than no family: it produces failures that
teach the wrong lesson. Work through every risk the registry records for these mechanisms.

- [ ] If the injected instruction is genuinely indistinguishable from a legitimate one from the principal, no implementation can separate them and the task grades luck rather than architecture.
- [ ] Grading breadth of refusal punishes a system that correctly uses retrieved content as evidence while denying it authority — reading the document is not the failure, obeying it is.
- [ ] Keyword-shaped lures reward filtering over provenance, so a sound architecture and a regex score the same and the task measures neither.
- [ ] If the authority model is not fully stated, a correct implementation can be graded down for a reasonable interpretation of a case the spec left silent.
- [ ] Grading the mechanism of enforcement rather than its effect punishes a sound alternative architecture that reaches the same guarantee differently.
- [ ] Denying an operation the spec permits is as much a failure as allowing one it forbids, so the suite must grade both directions or it quietly rewards over-refusal.
- [ ] If the ambiguity is never resolvable from any shipped channel, a correct implementation is permanently stuck and the task is unfair; an authoritative narrowing source has to exist.
- [ ] Grading a specific internal representation of the indeterminate case punishes an equivalent one that carries the same information differently.
- [ ] If the ambiguous return never occurs in a graded scenario, the check measures nothing while appearing to measure something, and guessing scores full marks.

## Kill taxonomy — apply before building

- [ ] **already-solved** — do current models already handle this correctly? Measure before building.
- [ ] **self-verifiable** — can the agent cheaply brute-force a check and confirm its own answer?
- [ ] **unfair-or-defused** — is the mechanism that makes the task solvable the same one that
      defuses its trap?
- [ ] **no-window** — is the race or interleaving this depends on reliably reachable?

Four of nine gated mechanisms in the source project died of the first category alone.
