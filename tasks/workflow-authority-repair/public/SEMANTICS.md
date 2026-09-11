# Workflow execution boundaries — successor 3.0
## Jobs and authority
view.jobs is the complete immutable catalog. Jobs have id, parent, principal,
resource, action, payload and route. Parent links are acyclic. The root ancestor's
principal is the origin of every descendant; routing workers and intermediate
principals do not confer authority. Each job supplies its own resource/action/payload.
take({}) returns the active delivery {id,jobId,worker}, or activates the next one,
or returns {done:true}. Repeating take while active returns that same delivery.

policy({}) returns {revision,owners,grants}. owners maps exact resource IDs to root
principals. Each grant is {id,from,to,resources,actions,active}. The origin may act
iff reachable from the resource owner through active directed grants, every edge
allowing the exact resource and action. Owner access uses an empty path. Paths
cannot repeat principals. IDs are exact strings. Cycles grant no additional
authority, and revoking one path must not invalidate a different valid path.

## Admission, dispatch and completion
admit({jobId,revision,principal,resource,action,payload,outcome,path}) records an
authorization under the current revision. outcome is authorized or denied; a denial
has path []. Authorized admission returns {authorization}, without an effect.
It replaces any previous pending authorization for this job. Denied admission
returns {decision} and is terminal. Authority must hold at every accepted authorized
admission; deny only if no path exists at that admission. The revision fence checks
revision equality, not the submitted principal, path, decision or payload.

dispatch({authorizationId,revision}) commits the admitted job's external effect
only if this is the latest pending authorization and BOTH supplied and admitted
revisions equal current policy. Otherwise {stale:true} has no effect. A superseded
or unknown token returns {error:"request"}. Authority must hold at dispatch as well.
The atomic revision fence makes changes between inspection and dispatch safe.
A valid dispatch durably records one executed decision and one effect for the job,
then returns {status:"PENDING"}; receipt visibility is a separate boundary.
An earlier pending admission can be replaced, but a terminal decision cannot.

outcome({jobId}) returns {status:"NONE",authorization:null|Authorization},
{status:"PENDING"}, or {status:"TERMINAL",decision}. PENDING means external work
has committed but its receipt is not yet visible. It is never absence or permission
to deny. At most two PENDING observations precede the immutable terminal receipt.
Job ID is the external deduplication key: another dispatch after commitment has no
additional effect. admit on a terminal job returns {error:"terminal"}.

finish({deliveryId,decisionId}) records the active delivery's association and advances.
Every delivery must finish with its own job's terminal decision, including independent
redeliveries under later policy. There is exactly one terminal decision per encountered
job, and exactly one effect per executed job. Pending authorizations may be superseded.
Revocation after dispatch does not erase committed history. Host finish records
associations but does not repair incorrect ones. No unrelated work is permitted.

## Recovery and limits
Policy may change between deliveries, once after the first policy read, and once
after the first authorized admission of a delivery. It then stabilizes. Changes
may revoke one path while another survives. Unknown/malformed operation shapes
return {error:"request"} without an effect; corrected retries are allowed.
Processes may be interrupted after an admission, dispatch, outcome or finish has
completed but before its response arrives. A fresh process receives the same catalog;
active delivery, pending authorizations, external work, decisions and storage survive.
A completed finish advances even if its response is lost. No journal format is required.
Subject returns are diagnostic only.

0–12 jobs, parent depth <=6, 0–24 deliveries, 16 principals, 24 grants, 8 resources,
actions read/write/publish, payload <=1024 JSON bytes. Revisions increase within
each delivery; snapshots for later deliveries have nondecreasing revisions.
At most one interruption per scenario. All operations are asynchronous, one JSON
object each. Node 24 built-ins; 128 regular files/8 MiB/depth16; storage writable.
45 seconds/process, 4000 protocol frames including begin/report/finish, 64 KiB/frame,
16 MiB/channel. All provided views/responses and compact correct requests fit 48 KiB.
Solver internet is available during authoring; grading needs no external network.
