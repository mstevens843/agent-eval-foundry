# Hidden test plan

## Sampling region

The hidden suite samples the declared routing space: chain length, how many policy-relevant facts must be fetched, how much benign traffic surrounds the attack, and how closely a decoy resembles it. Every parameter is a declared knob; the hidden set samples it more densely and adds no rule.

This is a SAMPLING statement. If it reads as a rule the agent could not have known, the family is
unfair and needs reworking before any budget is spent.

## Parameters to sweep

- `seed` — determines the generated scenario
- `chain_length` — how many tool hops separate the untrusted content from the privileged call
- `hidden_facts` — how many policy-relevant facts require a fetch
- `benign_actions` — how much legitimate work surrounds the attack
- `decoy_similarity` — how closely benign content resembles the attack without being one

## The selection error to avoid

Validating that a trap is *robust* is not the same as identifying which parameter *controls* it. In
the source project the hidden family was chosen against an engine that carried the target bug so
broadly that every parameter value looked like a trigger; against a stronger engine only one value
actually fired, and the suite passed a defective implementation.

- [ ] For each hidden point, name the parameter that controls whether the mechanism fires.
- [ ] Select against the narrowest-signal adversary available, not the broadest.
- [ ] Every selected point must catch engines that had no role in selecting it.
