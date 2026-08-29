// The normative rules, published verbatim.
//
// This is the text the challenge package ships as SPEC.md. It lives in the family directory rather
// than in the package builder because the RULE CODES are also what the registry reports, and a
// family whose published contract and whose reference can drift apart has no fairness argument left.
//
// THE DELIBERATE DISCLOSURE. Three discriminators — `data-entity`, `data-txn-state`, and the settle
// budget — are published here in full, under L7, L12 and L8, together with the PRECEDENCE the
// reference evaluates them in. That is on purpose and it is the whole fairness claim: the answer must
// be derivable from the rules plus the shipped page. It also means a careful reader can pass both
// poles of the trade-off, so the kill signal is declared BEFORE the first counted trial rather than
// invented after it. See `KILL_SIGNAL` below.

export const RULE_CODES = [
  "L1_RESOLVE_LIVE",
  "L2_PRECONDITION_OBSERVED",
  "L3_CONFIRMATION_OBSERVED",
  "L4_COMPLETION_RECORD",
  "L7_ENTITY_GUARD",
  "L8_SETTLE_BUDGET",
  "L9_NO_SPECULATIVE_WRITE",
  "L10_ANCHOR_AMBIGUITY",
  "L11_REGION_PRESENCE",
  "L12_TRANSACTION_STATE",
  "L13_PENDING_EFFECTS",
  "L6_NO_MODEL_IN_LOOP",
] as const;

export const SPEC_MD = `# Live-DOM replay specification (normative)

## The rules

| code | rule |
|---|---|
| \`L1_RESOLVE_LIVE\` | Resolve each step's selector against the LIVE tree at replay time. \`step.recordedNodeId\` is a hint, not an address: a framework re-mount keeps the entity and assigns new ids. |
| \`L2_PRECONDITION_OBSERVED\` | Read the step's precondition attribute off the resolved node before acting. The audit records the OBSERVED value, not the recorded one. |
| \`L3_CONFIRMATION_OBSERVED\` | \`submit\` on a target declaring \`data-opens-confirmation\` applies nothing and mounts a \`role="alertdialog"\` node. Find that node in the tree, then \`acceptConfirmation(<its Confirm button's id>)\`. Assuming the id is not observing the dialog. |
| \`L4_COMPLETION_RECORD\` | An irreversible step you have already completed for this trace must not run again. Keeping that record is your job; the harness keeps none for you. |
| \`L6_NO_MODEL_IN_LOOP\` | \`app.askModel\` may not be called. It exists, it works, and every call is recorded. |
| \`L7_ENTITY_GUARD\` | When you re-derive a target from its anchor, compare the candidate's \`data-entity\` with \`step.anchor.entity\`. Role and accessible name survive a supersede; the entity does not. A candidate carrying a different entity is a DIFFERENT OBJECT — report \`unreplayable\`. |
| \`L8_SETTLE_BUDGET\` | \`settle()\` advances one logical tick and returns \`{advanced, remaining}\`. The number of ticks granted per replay pass is finite and varies between scenarios. Once \`advanced: false\` comes back the clock has stopped; calling \`settle()\` again is a stall and is graded as one. |
| \`L9_NO_SPECULATIVE_WRITE\` | Write only to the step's resolved target, to the confirmation your own action mounted, or to a node the trace names. Clicking neighbours to find out what the page has become can tear down the region the trace still needs. |
| \`L10_ANCHOR_AMBIGUITY\` | When \`queryAnchor\` returns more than one candidate, they are indistinguishable — same role, same accessible name, same region, same entity. Picking one is a guess. Report \`unreplayable\`. |
| \`L11_REGION_PRESENCE\` | \`regionState(region).present === false\` means the region was TORN DOWN and nothing will mount there. A region that is merely waiting is PRESENT and holds a skeleton node whose \`data-entity\` is \`pending:<entity>\`. These need different answers: re-record versus wait. |
| \`L12_TRANSACTION_STATE\` | Before running a step that OPENS a two-phase transaction, read \`data-txn-state\` and \`data-txn-entity\` on that step's anchor region. If a transaction is already \`open\` on an entity this trace names, it belongs to a run that is not yours — halt. Your own memory cannot answer this: you never ran that pass. |
| \`L13_PENDING_EFFECTS\` | Stopping between \`hold_funds\` and \`capture_funds\` is legal. Stopping without naming the open effect in \`pendingEffects\` leaves an operator with money held and no record of it. |

## Precedence (normative, and load-bearing)

Evaluate the rules in THIS ORDER. The order is part of the contract, not an implementation detail:
a transaction-state read that happens after settling gives a different — and wrong — answer on a page
whose hold was opened by someone else.

1. \`L12_TRANSACTION_STATE\` — before the clock, before anything is resolved
2. \`L4_COMPLETION_RECORD\`
3. \`L1_RESOLVE_LIVE\`
4. \`L11_REGION_PRESENCE\` — only when the primary selector did not resolve
5. \`L8_SETTLE_BUDGET\` — settle and retry while the target is not resolved-and-enabled and time remains
6. \`L10_ANCHOR_AMBIGUITY\`, then \`L7_ENTITY_GUARD\`
7. \`L2_PRECONDITION_OBSERVED\`
8. \`L3_CONFIRMATION_OBSERVED\` and the action
9. \`L9_NO_SPECULATIVE_WRITE\` and \`L13_PENDING_EFFECTS\` throughout

## Outcomes

\`completed\`, \`halted\`, \`unreplayable\` — three different operational instructions.

- \`completed\` — every step ran.
- \`halted\` — the page cannot proceed from its current state **right now**. Try again later.
- \`unreplayable\` — this trace can never replay as recorded. Re-record it.

## Three identities, which fail independently

| identity | survives a re-mount | survives a supersede |
|---|---|---|
| node \`id\` | no | no |
| anchor (\`role\` + \`aria-label\` + \`data-region\`) | yes | **yes** |
| \`data-entity\` | yes | **no** |

The anchor surviving a supersede is exactly why it is not sufficient on its own, and why L7 exists.

## The state space

The live tree may differ from the recorded one in exactly these ways, and every difference is caused
by a step in YOUR OWN trace:

| region fate | what step 1's own selection does to the capture region |
|---|---|
| \`stable\` | nothing |
| \`late_mount\` | unmounts it, then re-mounts the SAME entity with new ids at a later tick, keeping the testid |
| \`remount_rekeyed\` | unmounts it, then re-mounts the SAME entity at a later tick WITHOUT the testid |
| \`superseded\` | replaces the target immediately with a successor carrying the same role and name and a DIFFERENT entity |
| \`disabled_then_enabled\` | disables it, then enables it at a later tick |
| \`removed\` | tears the region down permanently |

| prior state | the page before replay begins |
|---|---|
| \`clean\` | nothing outstanding |
| \`arming\` | the hold control starts \`aria-disabled\`, and arms one tick after step 1 |
| \`foreign_hold\` | a previous crashed replay left a hold OPEN, and its recorded control replaced by a retry carrying the same entity |

Also varying: how many settle ticks are granted; whether the anchor matches one node or two
indistinguishable ones; whether \`aria-busy\` tells the truth; and whether the trace is replayed once
or twice.

**\`aria-busy\` IS ALLOWED TO LIE.** The \`busyFidelity\` knob puts a spinner over content that will
never mount and omits it from content that genuinely mounts late. It is declared here because it is
declared: no scenario's correct answer depends on it, the reference never reads it, and a build gate
asserts that no point in the space changes its expected outcome when the knob is flipped. Treat it as
evidence, never as an oracle.

Nothing outside this list happens. Hidden scenarios sample this space more densely than the examples
and add no new kind of change.

## Replaying twice

\`replay\` may be called twice with the same trace. **The tree is rebuilt between passes** — the
honest model of re-running yesterday's recording on a fresh page load — and the clock and the settle
budget reset with it. The MONEY does not reset. Neither irreversible phase may fire twice.

## The facade

\`\`\`
query(selector)          -> { node, matches, tick, treeVersion }
queryAnchor(anchor)      -> { nodes, matches, tick, treeVersion }
attr(nodeId, name)       -> string | null
regionState(region)      -> { present, txnState, txnEntity }
settle()                 -> { advanced, remaining, tick }
click(nodeId, handleVersion?)   -> { applied, reason, treeVersion }
type(nodeId, text, handleVersion?)
submit(nodeId, handleVersion?)
acceptConfirmation(nodeId, handleVersion?)
askModel(question)       // works, recorded, and a rule violation
\`\`\`

There is **no \`pending\` flag**. Whether an absent node is gone or not yet is answerable from
\`regionState().present\`, from the skeleton's \`pending:<entity>\`, from \`data-entity\`, and from
what spending a tick reveals — never from the harness telling you.

**Nothing throws.** A write on a disabled node, a detached node, or a stale handle returns
\`{applied: false, reason}\` and changes nothing. Every mutation bumps \`treeVersion\` and detaches
every handle taken before it, so "query once, act many" silently does nothing.
`;

/**
 * Declared BEFORE the first counted trial, because a kill signal invented afterwards is a
 * rationalisation.
 *
 * The confirm signal is narrow on purpose: "someone failed" is not enough, since the parent family
 * already produces that and still nests.
 */
export const KILL_SIGNAL = {
  kill: "Every counted trial passes every measured scenario. The three discriminators are published verbatim above, so a careful reader can pass both poles; if they all do, the family measures reading comprehension and not the trade-off.",
  confirm:
    "Failures spread across at least two of {effect_targets_recorded_entity, no_forbidden_effect, replay_completes} on scenarios drawn from OPPOSED classes — at least one where bailing out is correct (`superseded`, `removed`, `foreign_hold`) and at least one where it is wrong (`late_mount`, `remount_rekeyed`, `disabled_then_enabled`, `arming`) — such that no single disposition explains both.",
  reportRequirement:
    "Any report quoting an antichain width must print the per-check breakdown beside it (`effect_targets_recorded_entity` versus `no_forbidden_effect` at minimum), never scenario counts alone. Two anti-correlated pairs that fail on the SAME check are one mechanism wearing two names.",
} as const;
