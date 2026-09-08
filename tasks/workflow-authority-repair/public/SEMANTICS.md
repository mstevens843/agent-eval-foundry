# Workflow authority and completion
## Jobs, deliveries and provenance
view.jobs is a complete immutable job catalog. Each job has id,parent,principal,
resource,action,payload and route. parent is null or another job ID; the graph is
acyclic. The root ancestor's principal is the originating principal for EVERY
descendant, including retries and fan-out. A non-root job's principal and a delivery's
worker describe routing services, not a new grant of authority. Resource/action/payload
come from the job itself. A delivery is {id,jobId,worker}; delivery ID is not job ID.
take({}) yields {delivery} or {done:true}; while a delivery is active it returns
{error:"unfinished"} rather than advance.

## Current policy
policy({}) returns a complete snapshot {revision,owners,grants}. owners maps exact
resource IDs to their authority-root principal. A grant has {id,from,to,resources,
actions,active}. resources and actions are exact allowlists; no wildcard/inheritance
convention is unstated. A job is permitted iff its origin is reachable from its
resource's owner by a path of active grants, EVERY edge allowing that resource and
action. An owner may act by an empty path. Paths cannot repeat a principal.
Several independent valid paths may exist; revoking one does not revoke the others.
No grant or session population is hidden. Cycles can exist in grants and must not
create authority. Grant IDs are unique within a snapshot.

## Atomic admission and history
Policy can change between deliveries and once between the first policy read for a
delivery and its admission attempt. decide({jobId,revision,principal,resource,action,
payload,outcome,path}) takes the active job, outcome executed or denied and the chosen
grant-ID path ([] for denied). A stale revision returns {stale:true} WITHOUT any effect
or decision. Obtain a fresh snapshot and reconsider. The next fresh snapshot is stable
for that delivery; the race is attainable to resolve, not irreducible uncertainty.
The revision barrier checks revision equality ONLY; it does not decide whether your
principal, grant path, outcome or payload is correct. Those are the repair's job.
Accepted admission records a durable decision {id,jobId,revision,principal,resource,
action,payload,outcome,path}; executed also performs the actual effect. Returns {decision}.
receipt({jobId}) returns {decision} or {decision:null}. A job already decided is terminal:
later deliveries refer to that original decision even if policy has since changed.
Do not execute it twice, replace its history or turn an executed job into a denial.
finish({deliveryId,decisionId}) associates the active delivery with its durable decision,
then advances. Host collection records associations; it does not repair a wrong one.
Every delivery must finish, including denied work and duplicates. Exactly one decision
per encountered job and one effect per executed job; no extra work.
The submitted process may also be killed between decide() returning a decision (its effect
already applied, if the outcome was executed) and finish() durably closing that delivery; the
identical delivery is then redelivered to a fresh process against the same storage. Recognize
the already-recorded decision via receipt() before redelivering — do not call decide() again
or reapply its effect. Only storage and durable decisions (queryable through receipt()) survive
this restart; in-memory bookkeeping built up during a run does not.

## APIs, errors and bounds
All calls are asynchronous, one object each. Unknown receipt jobs return {decision:null}.
Wrong active job/operation or malformed bounded shapes return {error:"request"} without
effect. Bad decision semantics that satisfy the shape are captured, not silently fixed.
Recovery after API errors is allowed. Subject return values are diagnostics only.
0–12 jobs, parent depth <=6, 0–24 deliveries, 16 principals, 24 grants, 8 resources,
actions read/write/publish, payload JSON <=1024bytes, 1–24 policy revisions. Exact ID
strings may look similar but are not interchangeable. Each first read/admission race
changes revision once and then stabilizes. No network, external secrets, guessing,
cryptographic implementation or inaccessible population search is needed.
Node 24/built-ins offline. storage is writable. 128 regular files/8MiB/depth16; no
lingering processes. Any correct path search, storage design and scheduling code is allowed.

## Execution envelope
The submitted service has 45 seconds per invocation. This is an execution limit,
not the human or agent repair-time budget. The transport allows 4000 protocol frames
including begin, report and finish (at most 3997 API calls), 64 KiB UTF-8 JSON per
request/response frame, and 16 MiB total per channel and for combined diagnostics.
All provided views/responses and compact correct API request payloads fit within
48 KiB UTF-8 JSON, in addition to the domain bounds above. This includes base64
wrappers where used; it is a joint size guarantee, not an assumption that every
independent maximum is exercised simultaneously. Keep submitted serialization within
the 64 KiB transport envelope. Correct compact output is always attainable.
These generous limits bound execution rather than create timeout-only difficulty.
