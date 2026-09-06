# Durable outbox recovery specification

This task isolates one rule: an idempotency key committed before an uncertain external call is
durable authority. A later worker recovers it; it does not recompute it from mutable lease state.

There are no acknowledgement or revocation states in this task. No rule depends on a transition to
or from ACKED or REVOKED.

## Public state

Each call receives a `RecoveryView` containing a durable `intent`, the current `workerId`, the
current `leaseEpoch`, and the attempt number. The same action may be delivered to multiple workers
after an earlier worker loses its lease following an uncertain tool call.

## Rules

- **DOR1_RECOVER_COMMITTED_KEY**: Every retry MUST use the idempotency key committed in the durable intent. Never derive a replacement from the current worker or lease epoch.
- **DOR2_EXACTLY_ONCE**: All attempts for one action collectively produce exactly one external effect.
- **DOR3_RETRY_AFTER_UNKNOWN**: After a worker can no longer know whether its call completed, a later worker retries with the committed key. An OK deduplication receipt is success, not a reason to emit a second key.
- **DOR4_TRUTHFUL_REPORT**: Each attempt reports the action, worker, lease epoch, exact key sent, and tool outcome it observed.
- **DOR5_LIVENESS**: At least one attempt must call the tool; refusing every action is incorrect.

## External tool

`tool.execute(actionId, { idempotencyKey, payload })` is idempotent by key. A repeated key returns
`ok: true` and the original effect id without creating another effect. A different key creates a
different external effect even when the action id is unchanged.

The tool's effect ledger is owned by the harness and is not readable through the subject API. The
hidden verifier grades that ledger and the harness-owned call record rather than trusting the
subject's report.

## Hidden scenarios

Hidden scenarios sample only the declared dimensions: seed, number of workers, number of queued
keys, and crash position. Multi-worker `after_tool` cases model a completed external call whose
first worker did not durably publish completion before the next lease epoch. All rules needed to
handle those cases are above.

## Submission consistency

External effects must perform only the requested work, using its specified identities and
argument values. Completing the requested work does not authorize additional unrelated effects.
Every requested action or replay attempt needs its own truthful report; do not duplicate decisions
within a report or invent action/step identifiers. Repeated deliveries retain the family-specific
idempotency semantics above.

Where this specification defines state-transition audit events, the events for an action form one
continuous history from its initial state through a permitted terminal state. Each event's source
state equals the preceding event's destination. The history must agree with actual execution.
These are output obligations, not a prescribed internal implementation.

## Protected execution interface

Each scenario starts a fresh isolated process. Its ordered sessions or replay attempts share the
same module and stable facade objects; independent scenarios do not share process state. Generated
checker cases start independent subject processes with fresh case-local memory. Only public views
and documented facade responses are provided. Do not depend on filesystem access to grading state,
raw protocol descriptors, additional local modules or network services. Submit self-contained ES
modules, at most 8 MiB each (subject and, where required, checker).

Per subject process: at most 4000 protocol messages (including lifecycle messages), 64 KiB per
serialized request or response, 16 MiB each for total requests, responses and diagnostics, and
45 seconds of execution. These are grading-execution limits, not the task-authoring time budget.
Exceeding them or terminating without all required reports invalidates execution; it does not
establish a semantic model failure. Repeated valid queries and equivalent operation orders remain
permitted within these bounds. Checker-specific case limits are documented in its own contract.
