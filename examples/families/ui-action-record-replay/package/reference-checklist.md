# Reference solution checklist

The reference exists to prove the family is solvable at all. Until it passes, no trial budget should
be spent: a family whose reference fails is measuring its own bugs.

- [ ] Record a trace whose every action carries a selector, a precondition and a postcondition.
- [ ] Resolve each selector against the live tree at replay time.
- [ ] Halt with a named reason when a precondition fails, rather than continuing on the recorded assumption.
- [ ] Observe the confirmation state for irreversible steps instead of assuming it.
- [ ] Guard irreversible steps so a second replay is a no-op.
- [ ] Emit a replay audit naming the resolved selector and the observed pre/postconditions per action.
- [ ] Refuse to store a trace that cannot replay deterministically.

- [ ] Reference passes every graded check.
- [ ] A no-op implementation scores zero.
- [ ] The reference is not the only implementation that could pass — sanity-check that the contract
      describes behaviour rather than one specific design.
