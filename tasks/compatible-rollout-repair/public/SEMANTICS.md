# Fleet rollout contract, version three

Submission directory bounds: at most 256 directories and 16 nested path components.

`subject.run({job, storage, requests}, api)` reconciles a requested fleet.
A request `{service, model}` targets that service only. `inventory({})` returns
services `{id, abi, deployment:{release,generation}, alias:{release,generation},
cache:{release,abi}}`. `catalog({model})` returns immutable release descriptors
`{id,model,abi,rank}`. The target is the highest-ranked release matching both the
requested model and the consumer service ABI. Catalog rank is unique per model/ABI.
No compatible release means leave that service unchanged and report unavailable.

`stage({service,release})` changes that deployment and increments its generation;
returns `{release,generation}`. It does not publish aliases or refresh consumer
caches. Calling it for the already deployed release is allowed and also creates
a new generation. Unrequested services must never be staged or otherwise modified.

`telemetry({service})` returns samples `{service,release,generation,ok,sequence}`.
Samples include previous releases/generations and other services. A healthy stage
requires the latest two samples for that exact service/release/generation, both
ok. Two current samples are always available after staging. 

Only a healthy current deployment compatible with the consumer ABI may be published with
`bind({service,release,generation})`. `warm({service,release,abi})` sets the consumer
cache to that binding; it must match the service ABI and current healthy alias.
Stage, bind and warm are low-level operations, not policy-enforcing oracles; wrong
calls are observable even when later repaired. Successful targets need matching
deployment/alias/cache by the end of the job.

If a staged target is unhealthy, restore that service's deployment to the release
it had at job entry, establish fresh healthy evidence and restore its alias/cache
to that release with the new deployment generation. Previously active releases
are guaranteed healthy when restored. Report rolled-back. Do not roll back healthy
targets because another target failed. A target already at the requested healthy
release is successful, not a reason to skip a stale alias/cache. Repeated jobs are
allowed; useful state must remain consistent without introducing unrelated work.

`stages({})` returns current job staging records `{id,service,release,generation}`.
Staging creates a temporary record. `cleanup({id})` removes only that record.
Calling `cleanup` with an id that is not currently a live staging record — already
removed by an earlier call, or never staged at all — is an illegal operation; it is
not a safe no-op. Remove all records created during this job before returning;
never delete pre-existing records (including records owned by unrelated
operations). This requirement is about temporary control-plane records, not
deleting the release catalog. A record left behind by an interrupted delivery of
this job (see below) is still this job's own to clean up once it resumes; a record
belonging to a still-pending, not-yet-resumed job is not.

Return `{job, results:[{service,status,release}]}` in request order, where status
is `'deployed'`, `'rolled-back'`, `'unavailable'`, or `'superseded'` (below). An
unavailable result carries the unchanged entry release. No result for foreign
services. All API methods take one object. View storage is writable but no
particular journal format is required. Authoritative inventory and telemetry, not
cached local reports, define current state.

At most once per job, the process may end after a `stage`, `bind`, `warm`, or
`cleanup` call commits but before its response is delivered. The identical job is
redelivered to a fresh process. External state and the storage directory survive;
job entry means before the first delivery. All staged records, including those
created by interrupted deliveries, retain the normal cleanup obligation. No further
interruption occurs during that job.

A different, later-dispatched job for the same service can be authorized and run
to full completion before an earlier, interrupted job's own redelivery happens —
representing a newer deployment arriving while a stale one is still mid-recovery.
A redelivered job must recognize when a later job has superseded a service's
incomplete work. It must distinguish the generations produced by its own stage
and rollback operations from those produced by later jobs, using durable progress
and authoritative state. It and must not stage, bind, or warm that service again: report it `'superseded'` with
its current release, leave it and its alias/cache exactly as the newer job left
them, and still clean up its own now-orphaned staging record from the interrupted
attempt. A service is otherwise free to be requested again by a later job in the
ordinary, non-interrupted case (repeated jobs are allowed); this only applies when
this job's own delivery of that request was itself left incomplete.

1–4 services requested, up to 8 total services, up to 8 releases/model, 1–3 jobs,
integer ranks/generations at most 10000. No independent mutations occur during a
job. Node ESM entry.mjs exports subject.run; 128 regular single-link files, 8 MiB
total, no symlinks/special files. Read-only source; 45 seconds/process, 4000 RPC
calls, 64 KiB/frame, 16 MiB/channel. Container: 2 CPUs, 2 GiB, 256 PIDs, no network
during grading. Runtime errors/timeouts are invalid outcomes, not task success
evidence.
