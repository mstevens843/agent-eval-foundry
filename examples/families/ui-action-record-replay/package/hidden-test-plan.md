# Hidden test plan

## Sampling region

The hidden suite samples the declared UI-mutation space: which selector attribute changes between record and replay, how deep in the trace the change occurs, whether a confirmation dialog appears or is suppressed, whether an async region has settled, and whether the trace is replayed once or twice. Every parameter is declared in the knobs below; the hidden set samples it more densely than the visible examples, and adds no rule.

This is a SAMPLING statement. If it reads as a rule the agent could not have known, the family is
unfair and needs reworking before any budget is spent.

## Parameters to sweep

- `seed` — determines the generated UI tree and the action trace
- `mutation` — what changed in the DOM between recording and replay — the core of the family
- `mutation_depth` — how far into the trace the mutation bites; a defect at step 5 survives naive smoke tests that only replay step 1
- `confirmation` — whether the irreversible step raises a confirmation, and whether it is hidden
- `async_settled` — whether the region under the selector has finished loading at replay time
- `replay_count` — exercises idempotency; a second replay must not repeat an irreversible step

## The selection error to avoid

Validating that a trap is *robust* is not the same as identifying which parameter *controls* it. In
the source project the hidden family was chosen against an engine that carried the target bug so
broadly that every parameter value looked like a trigger; against a stronger engine only one value
actually fired, and the suite passed a defective implementation.

- [ ] For each hidden point, name the parameter that controls whether the mechanism fires.
- [ ] Select against the narrowest-signal adversary available, not the broadest.
- [ ] Every selected point must catch engines that had no role in selecting it.
