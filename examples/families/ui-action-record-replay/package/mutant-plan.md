# Mutant plan

Each mutant below is a deliberately broken implementation this family's verifier must catch. Running
them is how the verifier is graded: a suite that passes a known-bad engine is not a suite.

## No-op faker (empty external ledger) (`nop-faker`)

**Bug.** The engine leases actions and then drives every one straight to a clean terminal state without ever calling the external tool, so the outbox produces zero side effects. This is the cheat-empty-ledger oracle from the source repo, which scored a perfect 113/113 with an entirely empty tool ledger before check_expected_executions was written.

**Why it is dangerous.** It passes every check that reads only the engine's own state: the audit chain is continuous and legal, no action is left dangling in READY or LEASED, no idempotency key appears twice, and the progress check is satisfied because two workers really do hold leases concurrently. An author looking at a green suite sees safety, ordering, and liveness all confirmed and never notices that the property the task exists to measure — that the side effect happened — is asserted nowhere.

**Must be caught by:**
- compare the external ledger's call count against the number of actions the engine claims reached a terminal executed state, and fail when the ledger is short
- assert a positive lower bound on side effects per scenario, computed from the gate decisions and the schedule, not from the engine's own tables
- assert that every APPROVED action that was never revoked or superseded ends in ACKED, so that REVOKED cannot be used as a universal clean exit
- run the verifier against a known no-op engine as a standing cheat oracle and require reward 0

```
def worker_step(worker_id):
    a = lease_one_ready()          # real lease, real epoch bump
    if a is None:
        return "idle"
    # never touches tool.invoke(); REVOKED is terminal and 'clean'
    db.set_state(a.id, REVOKED)
    db.audit(a.id, LEASED, REVOKED, worker_id, a.epoch, "revoked")
    return "executed_one"

# check_completion flags only READY|LEASED|EXECUTED
# LEGAL[LEASED] contains REVOKED, so the chain is legal
# check_exactly_once needs a count > 1; an empty Counter passes
```

## Eager resolver (guesses the unknown outcome) (`eager-resolver`)

**Bug.** When the tool returns UNKNOWN the engine picks an answer instead of parking the action, and it withdraws already-acknowledged work by writing an ACKED -> REVOKED audit transition. The state machine in SEMANTICS.md §4 gives ACKED no outgoing arrow and §6 names EXECUTED -> REVOKED as the one post-execution withdrawal path, so this is a transition that the normative spec does not contain. Five of the six frontier trials in the source repo wrote exactly this bug.

**Why it is dangerous.** Its audit log is perfectly continuous — every entry's from_state equals the previous to_state — and every action reaches a terminal state promptly, so completeness, append-only ordering, and liveness all pass. The one Opus trial that avoided the bug still wrote a local checker with no legal-transition table, which would have passed ACKED -> REVOKED as a valid chain link; an author who checks chain continuity instead of chain legality gets a green suite over a spec violation stated three separate times.

**Must be caught by:**
- enforce an explicit legal-transition table over the audit log with LEGAL[ACKED] empty, rather than only checking that consecutive entries chain (from_state == current_state)
- grade a scenario where the revoke arrives after the ack has already been written, and assert the engine records no transition out of ACKED
- for every action whose invoke returned UNKNOWN, assert the engine's final state agrees with the receipt's LANDED/NOT_LANDED verdict rather than a guess made before the receipt arrived
- assert no side effect exists in the external ledger for an action the engine resolved as not-landed

```
receipt, outcome = tool.invoke(k, aid, payload)
if outcome == UNKNOWN:
    # guess: assume it landed and move on
    set_state(aid, EXECUTED); audit(aid, LEASED, EXECUTED, w, e, "assumed")

def revoke(key):
    a = action_for(key)
    set_state(a.id, REVOKED)
    # a.state may be ACKED here; the log records it anyway
    audit(a.id, a.state, REVOKED, None, a.epoch, "revoked")
    # chain is continuous: ACKED -> REVOKED reads as a valid link
    # but LEGAL[ACKED] is the empty set
```

## Audit liar (log reconstructed from final state) (`audit-liar`)

**Bug.** The engine mutates action state first and writes the audit log afterwards by inferring what must have happened, so the log records a plausible path rather than the path taken. Lease expiries, re-leases at higher epochs, and IN_DOUBT excursions are smoothed out, and entries carry the current epoch and owner instead of the ones in force at the transition.

**Why it is dangerous.** The log is internally beautiful — continuous, legal under any transition table, monotonically sequenced, and it agrees exactly with the final state of every action, because it was generated from that final state. Any check that validates the log against itself passes. Only a check that validates the log against an independently observed history of the run can tell the difference between a record and a story.

**Must be caught by:**
- replay the audit log from the initial state and assert the reconstructed final state equals the engine's reported actions view for every action
- assert the audit contains one entry per observed epoch bump, so a re-lease after expiry cannot be omitted
- assert append-only: the sequence numbers are strictly increasing and no previously observed entry's fields change between two reads of the log
- cross-check each entry's (worker_id, epoch) against the lease that was actually held at that step, as recorded by the harness driver

```
def finish(aid, final):
    set_state(aid, final)

def audit():
    log = []
    for a in rows():                      # rebuilt on every read
        path = SHORTEST_LEGAL_PATH[a.state]   # READY->LEASED->EXECUTED->ACKED
        for frm, to in pairs(path):
            log.append(Entry(next_seq(), a.id, frm, to,
                             a.owner, a.epoch, ""))
    return log

# an action leased 3 times after 2 expiries still reports one clean lease
# every entry carries the LAST epoch, not the epoch in force at the time
```

## Duplicate executor (writes not conditioned on the held epoch) (`duplicate-executor`)

**Bug.** The engine's state updates match on action_id alone instead of on (action_id, epoch, owner, state). A worker whose lease expired while it was away comes back and completes the transition anyway, on top of the work of the new lease holder, so the action is executed under two epochs and the tool sees two distinct calls.

**Why it is dangerous.** Under the serial and clean schedules an author naturally writes first, no lease ever expires mid-flight, so every write matches its own epoch by construction and the suite is uniformly green. Even the two-worker schedule usually passes, because interleaving alone does not expire a lease. The bug needs expiry and reassignment together, which is a corner of the schedule space rather than a corner of the rules.

**Must be caught by:**
- count entries in the external tool ledger per action_id and assert it is exactly one for every action that reached ACKED and zero for every action that never executed
- run a stale-lease schedule where a lease expires between the lease step and the execute step, and assert the returning worker's step has no effect on the row
- assert the audit contains no two EXECUTED transitions for one action under different epochs
- assert every audit entry's epoch equals the action's current epoch at the moment the transition was applied

```
def try_execute(conn, cur, w, step):
    aid, req_id, epoch, expires = my_lease(cur, w)
    tool.invoke(idem_key(aid, req_id), aid, payload)
    cur.execute(
        "UPDATE actions SET state=%s, executed=TRUE WHERE action_id=%s",
        (EXECUTED, aid))          # no AND epoch=%s AND owner=%s AND state=%s
    db.audit(cur, aid, LEASED, EXECUTED, w, epoch, "ok")
    conn.commit()

# worker A leases at epoch 4, sleeps past expiry
# worker B leases at epoch 5, executes, acks
# worker A returns and executes again: two ledger rows, one action
```

## Stale state reader (trusts the snapshot taken at lease time) (`stale-state-reader`)

**Bug.** The engine reads revocation and supersession status when it takes the lease and caches that decision, then executes at a later step without re-reading. A revoke that lands inside the window between lease and execute is invisible, so an action that was withdrawn still crosses into the outside world.

**Why it is dangerous.** Revocation works perfectly whenever the withdrawal arrives before the lease or after the ack, which is what a hand-written revocation test naturally exercises. The engine also passes exactly-once, the audit legality table, and every completion check, so it looks like a correct implementation with a correct revocation story. Only a schedule that places the revoke strictly inside the lease-to-execute window separates a cached decision from a re-read one.

**Must be caught by:**
- grade a revoke-while-leased schedule and assert the external ledger contains no call for the revoked action
- assert that for every action whose final state is REVOKED without a preceding EXECUTED, the tool ledger holds zero entries under its idempotency key
- assert the ordering constraint directly: no tool call timestamp may fall after the step at which the revoke was submitted, for any action that never reached EXECUTED
- vary the step distance between the lease and the execute so the revoke lands inside the window rather than before it

```
def try_lease(cur, w, step):
    a = pick_ready(cur)
    a.revoked_at_lease = a.revoke_pending      # snapshot, cached on the lease
    take_lease(cur, a.id, w, step)

def try_execute(cur, w, step):
    lease = my_lease(cur, w)
    if lease.revoked_at_lease:                 # trusts lease-time truth
        return skip(lease)
    # no SELECT ... FOR UPDATE of current state/epoch here
    tool.invoke(idem_key(lease.aid, lease.req_id), lease.aid, payload)
    set_state(lease.aid, EXECUTED)
```


## Gate

- [ ] Every mutant above fails at least one named check.
- [ ] Record WHICH check caught it. A mutant caught by an unrelated assertion is luck, not coverage.
- [ ] Re-run the mutant bank on every verifier change.
