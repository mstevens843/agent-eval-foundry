# UI action record and replay

> DRAFT. This is a starting point, not a shippable instruction. Everything below is derived from the
> mechanism registry; the domain specifics are yours to write.

Repair the browser and desktop UI automation without an API system in `/app/` so that it behaves correctly under the conditions described
below.

## What must hold

- Re-validate the fencing token — epoch, version, generation — at the point of use and inside the same transaction as the effect, and make an action under a stale token a silent no-op rather than a slow-path retry.
- Bind to stable semantic identity, re-observe before each act rather than replaying a plan, assert the expected post-condition after every step, and halt loudly when the surface does not match the assumption instead of continuing into the next step.
- Declare every dependency explicitly, pin versions, and verify inside a container built only from that declaration — treating a successful build in a fresh environment, not a successful run in the current one, as the passing signal.

## The conditions that make this hard

- Stale State: A decision is taken against a snapshot of state that has since changed, so the action is correct for a world that no longer exists at the moment it takes effect.
- UI Replay Mismatch: A recorded interaction with an interface replays cleanly against a snapshot but not against the live surface, because it bound to coordinates, ordering or transient text instead of to stable identity.
- Hidden Environment Dependency: The implementation works because of something in the authoring environment that was never declared — a preinstalled package, a set variable, network egress, a locale, a file left behind by an earlier step.

## Author's checklist before this instruction ships

- [ ] Every rule the verifier grades appears above. Fairness requires the agent can read it.
- [ ] The instruction states that invariants hold for every seed and configuration the harness can
      generate, not only the shipped examples. Without that sentence the hidden sampling region is
      indistinguishable from a secret rule.
- [ ] Absolute paths throughout.
- [ ] The required timeout sentence from the current contributing guide is the last line.
