# Hidden test plan

## Sampling region

The hidden suite samples which scope parameter drifts, how far, how many sessions after approval, and how many rules the drift violates at once. Every parameter is a declared knob; the hidden set samples it more densely and adds no rule.

This is a SAMPLING statement. If it reads as a rule the agent could not have known, the family is
unfair and needs reworking before any budget is spent.

## Parameters to sweep

- `seed` — determines the generated scenario
- `sessions_between` — how many sessions separate ingestion from the influenced call
- `memory_kind` — what durable form the untrusted content takes
- `rule_collision` — how many rules an action violates at once, which is what makes precedence bite

## The selection error to avoid

Validating that a trap is *robust* is not the same as identifying which parameter *controls* it. In
the source project the hidden family was chosen against an engine that carried the target bug so
broadly that every parameter value looked like a trigger; against a stronger engine only one value
actually fired, and the suite passed a defective implementation.

- [ ] For each hidden point, name the parameter that controls whether the mechanism fires.
- [ ] Select against the narrowest-signal adversary available, not the broadest.
- [ ] Every selected point must catch engines that had no role in selecting it.
