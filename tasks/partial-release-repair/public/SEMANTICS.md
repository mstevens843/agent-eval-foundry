# Resource release contract
Resources are {id,parents:[id],payload:string}. Parent lists are sets. Current and requested
graphs are acyclic and have no dangling parents. Payloads and parent sets of existing
resources are immutable: changing them requires removal then recreation. Removing a
parent while any current child still references it is illegal. Creation requires every
parent already present. Exact same-resource creation and removing an absent ID are safe
idempotent operations. A requested resource can be temporarily removed to allow a parent
replacement, but must be restored. A release is complete only when ALL scoped IDs match
target (absence included), unrelated resources are unchanged, and every operation respected
these rules. You must not issue writes outside view.scope. Feasible inputs guarantee a
solution without changing out-of-scope resources. No hidden dependency or unavailable
receipt is necessary.
view contains scope, target (list of resources wanted in scope), storage. api.inspect({})
returns {resources:[...]}, the authoritative current graph. api.create({resource}) and
api.remove({id}) return {status:"DONE"|"UNKNOWN"|"REJECTED",token?}. UNKNOWN may or may not
have applied; api.receipt({token}) returns PENDING at most twice then DONE or ABSENT.
After ABSENT, inspecting or retrying is allowed. Receipts are stable thereafter.
api.inspect remains authoritative even during UNKNOWN. No externally concurrent graph
changes occur within a run. Operations are synchronous. At most 40 resources, depth 8.

Every resource returned by api.inspect carries a generation: number, counting how many
times that id has been created -- 1 the first time it is created, incrementing by 1 each
subsequent time it is created again after having been removed. Generation is server-tracked
bookkeeping: it plays no part in whether a same-content create is a safe idempotent no-op
(that comparison still looks only at parents and payload), and you never supply it when
constructing a resource to create. A receipt for a create's token, once resolved to DONE,
additionally reports the generation that specific create call produced (a receipt for a
remove's token never does, and neither does one still PENDING). A receipt is bound to the
specific create or remove call that produced its token, not to the resource's current
identity: a DONE or ABSENT receipt for an earlier generation of an id is not evidence about
a later generation of the same id. In particular, when a requested resource is temporarily
removed to allow a parent replacement and then restored (an explicitly permitted pattern
above), the restore is a new generation of that id -- confirming the removal landed is not
evidence the restore also landed. Before treating any id's state as settled you must confirm
its CURRENT generation, either via a fresh api.inspect or via the specific receipt for the
operation you actually care about; reusing an earlier operation's already-resolved receipt
(for an earlier remove, or an earlier create of the same id) as proof about a later one is
not a safe substitute. This adds no new asynchrony beyond what is already described above:
every incarnation of a given id still happens strictly one after another inside your own
sequence of calls.
Rejections are recorded; a dependency-violating or out-of-scope request is a task failure,
even if the service subsequently repairs the graph. No particular planning algorithm or
number of valid operations is prescribed. Returning success does not change the graph.
# Execution envelope

The submitted program has 45 seconds per invocation and up to 4000 API operations.
These are generous execution limits, not the human repair time budget. The public
API and hidden data obey the bounds below; no delay or starvation is used for hardness.
