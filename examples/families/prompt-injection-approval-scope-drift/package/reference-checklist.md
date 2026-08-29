# Reference solution checklist

The reference exists to prove the family is solvable at all. Until it passes, no trial budget should
be spent: a family whose reference fails is measuring its own bugs.

- [ ] Bind each approval to its exact scope and consume it on use.
- [ ] Refuse an action whose parameters drifted from the approved scope.
- [ ] Refuse an action outside the approval's validity window.
- [ ] Execute the approved action exactly once.
- [ ] Attribute a refusal to the rule that governs it without relying on a published order.

- [ ] Reference passes every graded check.
- [ ] A no-op implementation scores zero.
- [ ] The reference is not the only implementation that could pass — sanity-check that the contract
      describes behaviour rather than one specific design.
