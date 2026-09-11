# Delegated reservations and settlement — successor 3.0
A job supplies {job,storage,requests}; jobs use fresh processes and durable authority
state. Process requests in order. Requests are immutable {id,kind,reservation,owner,
delegate,wallet,grant,grantVersion,credits}; kind is reserve, capture or release.
Credits are positive integers. Request IDs are globally unique commands; exact
duplicates may reappear. Each command has one terminal accepted/rejected decision.
A rejected command remains rejected; a new command ID is needed to reconsider work.

## Accounting and identities
snapshot({}) returns {revision,wallets,reservations,settlements}. Wallets have id,
owner and grants:[{id,delegate,version,allowed,limit}]. A reservation is
{id,requestId,wallet,grant,grantVersion,owner,delegate,credits}. A settlement is
{id,wallet,grant,reservation,kind:"capture"|"release",credits}. These complete raw
records are authoritative; no cumulative spent field is provided.
Reservation identity is (wallet,id), permanently bound to its original grant and
owner/delegate. Closed reservation IDs cannot be reused. Grant identity is
(wallet,grant); repeated grant names in different wallets are unrelated.

A reserve is eligible exactly when no reservation with that identity exists,
the wallet owner matches, the grant exists, allowed is true, delegate and EXACT
current grantVersion match, and the additional hold fits current lifetime allowance.
Used allowance is all captures plus all outstanding reservation remainders for that
wallet/grant, across ALL grant versions. Remainder = reserved minus captured minus
released. A reduced limit may be below existing use; it forbids new holds but does
not retroactively remove them. Other grants and wallets have independent allowances.

A capture or release is eligible exactly when its wallet/reservation exists, its
grant/owner/delegate match that reservation, and credits <= its remaining hold.
Its grantVersion is historical metadata and is NOT checked against current terms.
Settlement of an existing hold survives revocation, replacement delegates, version
changes and reduced limits. Capture converts a hold to lifetime spending; it does
not free allowance. Release frees only the named hold's remaining credits, never
captured credits or a later/different reservation. Settlements consume remainder
in request order. No unrelated modification or extra settlement is permitted.

## Conditional decisions and recovery
resolve({request,revision,outcome:"accepted"|"rejected"}) atomically records a
decision and, for accepted work, mutates the raw reservation/settlement ledger.
The transport checks the supplied current revision and request order/shape. It
does NOT compute eligibility. A stale revision returns {stale:true} with no decision;
a malformed or out-of-order request returns {error:"request"} without an effect.
Every first decision must reflect eligibility at that accepted revision. Every
terminal decision is immutable. Repeating a decided command cannot mutate again.

resolve returns {status:"UNKNOWN"}; the decision may already be committed before
its receipt is visible. lookup({id}) returns {status:"PENDING"}, {status:"ABSENT"},
or {status:"TERMINAL",decision:{id,status,receipt}}. Status in a decision is
accepted or rejected; accepted receipt is the exact command, rejected receipt null.
At most two PENDING lookups precede a terminal result. ABSENT means no decision.
An uncertain capture still consumes its hold or captured allowance. Pending is never
absence. Idempotent same-command retries and polling are both allowed.

Grant updates occur between jobs and at most once just after the first snapshot
within a job; they then stabilize. snapshot revisions cover terms and ledger records.
A process may be killed after a host operation completes but before its response;
the same job is redelivered with authority records and storage intact. At most one
interruption per job. Local writes are not interrupted. Any recovery design is valid.
Return {job,decisions:[{id,status,receipt}]} in input order, including duplicates and
terminal rejected commands. Reports must agree with authoritative history.

## Bounds
1–4 jobs, 1–8 requests/job, up to4 wallets and4 grants/wallet, credits/limits <=10000.
At most32 reservation records and32 settlement records. Node 24 built-ins; 128 regular
files/8 MiB/depth16; source read-only and storage writable. 45 seconds/process,
4000 protocol frames,64 KiB/frame,16 MiB/channel; compact correct requests and provided
responses fit48 KiB jointly. Authoring has internet access; replay needs no network.
