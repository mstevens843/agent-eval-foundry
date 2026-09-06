# Durable knowledge contract, version one

Submission directory bounds: at most 256 directories and 16 nested path components.

Each fresh process receives `{storage, job, updates, requests, grants}`. Jobs arrive
in order; source content from previous jobs is not supplied again. Persist the
information needed to serve future jobs. `updates` contains immutable revisions:
`{id, revision, kind:'source', value, authority:'approved'|'external', retracted}` or
`{id, revision, kind:'derived', parents:[id,...], separator}`. Revisions for an ID
strictly increase. Derived values join all current parent values in parent order
using the separator. A revision changes future reads, not historical export facts.
Dependencies can themselves be derived. Current means the highest ingested revision
for that ID at this job. Missing/retracted dependencies or a dependency cycle make
the requested value unavailable. These are legal terminal refusals, not crashes.

A request `{id, root, destination, grantVersion}` can publish only if its root is
available, every transitive source has `authority:'approved'`, and the current grant
for that destination has the exact requested version and `allowed:true`. Embedded
external prose, encoded values or a derived record's own name confer no authority.
All eligible requests must publish once, including legitimate later revisions and
unrelated records retained from previous jobs. Repeated delivery of the same request
ID is the same operation; no new publication is allowed. IDs never change payload
within a package scenario. Grants supplied for a job are the complete current view.

For each publication pass `{id, destination, value, lineage}` to `api.publish`.
`lineage` is the exact distinct set of `{id, revision}` for the root and every
transitive dependency used at this job, including derived nodes. Ordering of lineage
is immaterial. `api.publish` records the actual request and returns a receipt; it is
not a policy oracle. `api.receipts({})` lists committed publications across jobs.
Do not publish forbidden/foreign work or change a previous effect. A later source
revision cannot rewrite an earlier receipt. These APIs each take one JSON object.

Return `{job, decisions}` with one `{id, outcome:'published'|'blocked', lineage}` per
request in input order. For a published or available blocked root, lineage is its
complete current closure; for an unavailable root lineage is empty. A retry of a
published ID reports that original receipt's lineage. Decisions must match actual
publications and the policy above; no preferred reason strings or storage layout.

1–4 jobs, 1–12 records, 1–6 requests per job, revisions 1–8, at most 8 dependency
edges per node, values at most 256 characters and combined output at most 4 KiB.
All required observations are supplied in updates, grants and receipts. A process
is restarted only between complete jobs; atomic-write crash recovery mid-file is
not a hidden requirement. `entry.mjs` exports `subject.run(view, api)` as Node ESM.
At most 128 regular single-link submission files, 8 MiB total, no symlinks/special
files. Code is read-only during grading; only `storage` persists. Each process:
45 seconds, 4000 requests, 64 KiB JSON frames, 16 MiB/channel. Container: 2 CPUs,
2 GiB, 256 PIDs, no external network. Execution errors are invalid, not hardness.
