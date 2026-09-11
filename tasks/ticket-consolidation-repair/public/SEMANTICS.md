# Ticket migration contract, version two
view contains tenants (allowed tenant IDs), team (target team name), marker and
storage and operationBudget. api.page({cursor:null|string}) reads a frozen snapshot population and
returns {status:"OK",rows,next:null|string} or {status:"EXPIRED",resume:string}.
Cursors are opaque. EXPIRED.resume is a fresh continuation at the same unread
position. An empty page with non-null next is valid. Pages can overlap: identity
is (tenant,id), not id alone. Snapshot rows have tenant,id,status,revision,owner,
labels,note.

The migration population is exactly snapshot rows whose tenant is allowed and
status is "open" AT SNAPSHOT TIME (the page data). This membership is frozen:
a row's later status or content drift never removes it from, or adds another
row to, the population. Never use a live read to decide whether a row belongs;
only the frozen page data determines membership. Closed and unrelated-tenant
tickets (at snapshot time) must never be targets of attempted batch writes,
including attempts that return CONFLICT or MISSING. Directory resolution is
tenant-specific: api.resolve({tenant,team}) returns {owner:string}.
Tenant and ticket IDs are opaque, exact strings. Case, whitespace, and numeric
or structured-looking text carry no special meaning; do not normalize or decode
an identity when selecting its directory entry or matching a ticket.

For every selected ticket, set owner to its tenant's resolved target and add
view.marker to its labels, preserving all other labels and every other field.
At completion the marker occurs once (labels are sets).
The marker is a completion requirement, not a requirement on every intermediate
write: ownership may be settled first while preserving the current labels, and
the marker added by a later write before returning. Label preservation still
applies to every landed write.
api.read({tenant,id})
returns the CURRENT row, which may differ from the frozen page data (see
below); it is never itself a membership signal.
api.batch({updates:[{tenant,id,revision,patch:{owner,labels}}]}) returns
{results:[{tenant,id,status:"APPLIED"|"CONFLICT"|"MISSING"}]}; results may be
reordered. Each update is independent; an HTTP/batch success is not all-row
success. A stale revision causes CONFLICT with no effect. Refresh and settle
conflicts. A selected row is never deleted. At most two conflicts per selected
row; after that a current-revision patch succeeds. Do not overwrite notes,
status, revision or other columns. Already-complete rows need no write.
Every attempted patch, including a conflicting or missing-row attempt, must
contain an owner string and a labels array, and may contain no other fields.
Every labels element must be a string, including on non-landed requests, as in
api.d.ts. Extra fields beside tenant, id, revision and patch on an update request
are ignored request metadata; only patch fields can change ticket columns.
The exact-field restriction applies to patch, not to this outer request object.
Request membership and patch shape apply regardless of the returned status.
An otherwise valid selected-row request that conflicts has no write effect;
it need not contain the current labels. Label preservation applies to updates
that land. The resolved owner is required at completion; a selected ticket may
temporarily have another string owner if all other rules remain satisfied and
its correct target owner is restored before returning.
All operations are synchronous and finish. At most 100 rows, 30 pages and 4
tenants. Returning a claim does not migrate anything; grader reads its own
backing state and log. Repeated equivalent updates are allowed but do not
justify any collateral field changes.

# Concurrent drift
Concurrent edits affect labels and note on any selected row, exactly as before.
For a subset of runs, a concurrent edit may also change a SELECTED row's status
away from "open" (visible from then on through api.read, never through
api.page's frozen data) after that row was captured as part of the population.
Per the membership rule above, such a row remains in the population and must
still be fully migrated (owner set, marker added); its status must never be
written back, inferred as disqualifying, or otherwise overwritten by the
candidate — the same "do not overwrite status" rule as always, now genuinely
reachable.

# Crash and redelivery
A process may be interrupted at most once per run: after one api.batch call's
effect lands on the backing rows, but before its response reaches the process.
The identical run is then redelivered to a fresh process against the now-
mutated backing rows; api.resolve, api.read and api.page continue to reflect
real state (page's frozen snapshot is unaffected by the interruption itself).
view.storage is a writable directory that survives the interruption for this
purpose; any disk format is valid, and using it is optional — resyncing from
fresh reads and a fresh page walk is an equally valid strategy, provided it
finishes within the execution envelope below. Do not assume redelivery when
none is promised, and do not rely on any particular process or attempt count.

# Execution envelope

The submitted program has 45 seconds per invocation and up to 4000 API
operations. This budget is shared across an interrupted attempt and its
redelivery, not reset between them, and a minority of runs exercise a much
tighter effective bound than 4000, supplied as view.operationBudget before execution. These are generous execution limits for the
typical run, not the human repair time budget, and not license to redo
settled, already-correct work indefinitely after every redelivery: a strategy
that discards all progress and reprocesses every row from scratch, without
regard to rows already confirmed complete, risks exceeding the operation
budget on some runs. The public API and hidden data obey the bounds below; no
delay or starvation is used for hardness, and most runs — including most that
involve an interruption — leave ample headroom for a full resync. Execution
errors, including exceeding the operation budget, are invalid results.
