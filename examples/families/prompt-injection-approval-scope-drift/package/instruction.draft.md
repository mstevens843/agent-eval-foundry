# Approval scope drift after the fact

> DRAFT. This is a starting point, not a shippable instruction. Everything below is derived from the
> mechanism registry; the domain specifics are yours to write.

Repair the human-in-the-loop approval for agent actions system in `/app/` so that it behaves correctly under the conditions described
below.

## What must hold

- Re-validate the fencing token — epoch, version, generation — at the point of use and inside the same transaction as the effect, and make an action under a stale token a silent no-op rather than a slow-path retry.
- Enforce at the point where the effect happens, against the identity that will bear it, deny by default on any path that does not name a subject, and make the enforcement point structural — a separate role, a separate process — rather than a call every future path has to remember.
- Isolate every instance in a fresh container with an enumerated input set, verify that hidden material is unreachable from the implementation's process rather than merely undocumented, and audit the trajectory for reads outside the declared inputs before trusting a pass.

## The conditions that make this hard

- Stale State: A decision is taken against a snapshot of state that has since changed, so the action is correct for a world that no longer exists at the moment it takes effect.
- Permission Boundary: An operation is performed with authority the requester did not hold, because the check that would have stopped it sat in the wrong place, ran against the wrong subject, or was absent from one path.
- Context Contamination: Information reaches the implementation through a channel the task never intended — an earlier turn, a sibling agent's workspace, a cached artifact, a leaked fixture — so the behaviour observed is not attributable to the capability being measured.

## Author's checklist before this instruction ships

- [ ] Every rule the verifier grades appears above. Fairness requires the agent can read it.
- [ ] The instruction states that invariants hold for every seed and configuration the harness can
      generate, not only the shipped examples. Without that sentence the hidden sampling region is
      indistinguishable from a secret rule.
- [ ] Absolute paths throughout.
- [ ] The required timeout sentence from the current contributing guide is the last line.
