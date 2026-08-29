# Capability routing across documents and tools

> DRAFT. This is a starting point, not a shippable instruction. Everything below is derived from the
> mechanism registry; the domain specifics are yours to write.

Repair the agent tool routing over mixed-trust document sets system in `/app/` so that it behaves correctly under the conditions described
below.

## What must hold

- Carry provenance on every span of context, deny retrieved content the authority to change goals, widen permissions or name new destinations, and gate every privileged action on an instruction traceable to the principal rather than on the action merely seeming reasonable.
- Enforce at the point where the effect happens, against the identity that will bear it, deny by default on any path that does not name a subject, and make the enforcement point structural — a separate role, a separate process — rather than a call every future path has to remember.
- Model the tool's result as a sum type that includes the indeterminate case, refuse to widen an ambiguous result into a definite one, and carry the ambiguity into the caller's own persisted state until an independent source narrows it.

## The conditions that make this hard

- Prompt Injection via Retrieval: Content fetched at runtime — a document, a tool result, a web page, another agent's message — carries instructions, and the agent executes them as if they came from its principal.
- Permission Boundary: An operation is performed with authority the requester did not hold, because the check that would have stopped it sat in the wrong place, ran against the wrong subject, or was absent from one path.
- Tool Result Ambiguity: A tool returns a value whose shape does not distinguish outcomes the caller must distinguish — success from no-op, empty from missing, error text from data — and the caller collapses them into the nearest confident case.

## Author's checklist before this instruction ships

- [ ] Every rule the verifier grades appears above. Fairness requires the agent can read it.
- [ ] The instruction states that invariants hold for every seed and configuration the harness can
      generate, not only the shipped examples. Without that sentence the hidden sampling region is
      indistinguishable from a secret rule.
- [ ] Absolute paths throughout.
- [ ] The required timeout sentence from the current contributing guide is the last line.
