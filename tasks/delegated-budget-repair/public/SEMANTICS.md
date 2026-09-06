# Delegated workflow contract, version one

Submission directory bounds: at most 256 directories and 16 nested path components.

A job supplies `{job, storage, requests}`. A request is `{id, owner, delegate,
wallet, grant, grantVersion, credits}` with positive integer credits. The same
request ID may be delivered again, with the same contents. Requests are processed
in input order. This order defines budget allocation: reject an ineligible request
without consuming budget, then consider the next request. Required eligible work
must finish during this job. No unrelated debit or modification is permitted.

`api.describe({wallet})` returns the current wallet owner and grants. Each grant
has `{id, delegate, version, allowed, limit, spent}`. A new request is eligible only
when its owner owns that wallet, delegate and exact grant/version match, allowed
is true, and its credits plus cumulative `spent` do not exceed `limit`. Spending
under all versions of a grant shares one lifetime budget. Different wallets and
grants do not share it. Current grant views change only between jobs, including
revocation, replacement delegate and reduced limits; descriptions remain stable
within a job except for spent credits. No minimum parallelism is required.

`api.debit({...request, key})` is a low-level transport, not a policy check: it can
execute an incorrect descriptor. Use the stable request ID as `key`. Repeating
the same key and exact descriptor is idempotent; reusing it for different business
is forbidden. Do not substitute delivery ID, job number, delegate or wallet for
the logical request identity. Debits return `{status:'ACCEPTED', receipt}` or
`{status:'UNKNOWN'}`. UNKNOWN may already have executed. `api.lookup({key})`
returns `{status:'PENDING'}`, `{status:'ABSENT'}` or `{status:'ACCEPTED', receipt}`.
After at most three lookups an attempted key becomes ACCEPTED or ABSENT. ABSENT
means no debit occurred and repeating the same request/key is safe. These are
deterministic transport schedules, not permanently unknowable decisions.

A receipt contains the actual descriptor including key. A repeated delivery that
already executed must report that receipt even if the grant was later revoked;
it must not execute again or relabel history as a cancellation. A request rejected
in an earlier job may be reconsidered against current authority. Successful
receipts are immutable. Do not invent receipts or leave eligible work pending.

Return `{job, decisions:[{id, status:'accepted'|'rejected', receipt:null|Receipt}]}`
in request order. Every receipt and status must agree with authoritative external
execution. Rejected decisions have null receipt. APIs each take one JSON object.
Any disk format is valid. Jobs restart only between completed calls; storage is
retained, JavaScript globals are not. No hidden mid-write crash requirement.

1–4 jobs, 1–8 requests/job, up to 4 wallets and grants/wallet, credits/limits at most
10000. Node ESM `entry.mjs` exports `subject.run`. At most 128 regular single-link
files, 8 MiB total; no symlinks/special files. Code read-only; storage writable.
45 seconds/process, 4000 requests, 64 KiB JSON frames, 16 MiB/channel; container
2 CPUs, 2 GiB, 256 PIDs, no external network. Execution errors are invalid results.
