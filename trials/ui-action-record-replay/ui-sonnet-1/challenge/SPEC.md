# Replay specification (normative)

## The rules

| code | rule |
|---|---|
| `R1_SELECTOR_RESOLVED_LIVE` | Every step's selector must be resolved against the live tree at replay time. The recorded node id is a hint, not an address. |
| `R2_PRECONDITION_OBSERVED` | Before a step runs, its precondition must be OBSERVED — read the attribute, do not assume the recorded value still holds. The audit records what was observed. |
| `R3_POSTCONDITION_OBSERVED` | After a step runs, its postcondition is recorded from what the application shows, not from what the recording expected. |
| `R4_CONFIRMATION_OBSERVED` | A step whose target declares `data-opens-confirmation` must not complete until a confirmation has been observed and accepted. An absent dialog is not a confirmation. |
| `R5_IDEMPOTENT_REPLAY` | Replaying a trace that already completed must not repeat an irreversible step. Keeping that record is your job; the harness does not keep it for you. |
| `R6_NO_MODEL_IN_LOOP` | `app.askModel` may not be called. A replay that needs a model is not a replay. |
| `R7_AUDIT_EXPLAINS` | Every step reports the node it resolved, the precondition it observed, and — when it stopped — a named halt reason. |

## Outcomes

`completed`, `halted`, `unreplayable`

- `completed` — every step ran.
- `halted` — the page is in a state this trace cannot proceed from **right now**. Try later.
- `unreplayable` — the trace can never replay as recorded and must be re-recorded.

Those are three different operational instructions and grading distinguishes them. Reporting
`halted` for a trace whose target is gone tells an operator to wait for something that will never
happen.

## The mutation space

The live tree may differ from the recorded one in exactly these ways, at any depth in the trace:

| mutation | what it does |
|---|---|
| `none` | nothing changed |
| `attribute_renamed` | the target's `data-testid` was renamed |
| `node_reordered` | siblings were reordered |
| `node_wrapped` | the target was wrapped in a new element and **re-created, so its id changed** |
| `text_changed` | visible text changed |
| `node_removed` | the target is gone |

Also varying: whether a confirmation dialog is `absent`, `present` or `suppressed`; whether an
async region has settled; and whether the trace is replayed once or twice.

Nothing outside this list happens. A hidden scenario samples this space more densely than the
examples do and adds no new kind of change.

## The facade

```
query(selector) -> { node, matches, pending }
attr(nodeId, name) -> string | null
click(nodeId) / type(nodeId, text) / submit(nodeId)
confirmationPresent() -> boolean
acceptConfirmation()   // throws when none is presented
askModel(question)     // works, recorded, and a rule violation
```

`query` returns `matches` so ambiguity is visible: more than one match means the selector no
longer identifies one node, and picking the first is a guess.

`pending: true` means the region exists and has not finished loading — *not yet*, as opposed to
*not there*. The two need different answers.

## Action kinds

`click`, `type`, `submit`, `confirm`
