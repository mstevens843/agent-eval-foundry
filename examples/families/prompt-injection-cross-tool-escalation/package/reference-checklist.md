# Reference solution checklist

The reference exists to prove the family is solvable at all. Until it passes, no trial budget should
be spent: a family whose reference fails is measuring its own bugs.

- [ ] Re-derive authority from the original grant at every step.
- [ ] Refuse a privileged step whose only authorization is a previous step's output.
- [ ] Detect and refuse a repeated irreversible effect.
- [ ] Complete the legitimate chain to its end.
- [ ] Audit the grant exercised at each step.

- [ ] Reference passes every graded check.
- [ ] A no-op implementation scores zero.
- [ ] The reference is not the only implementation that could pass — sanity-check that the contract
      describes behaviour rather than one specific design.
