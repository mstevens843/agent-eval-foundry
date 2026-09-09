# Capacity promise contract

view.resources is a complete list {id,tags,zone,capacity,used}. used is pre-existing
occupancy that cannot be released. view.tree is a finite rooted tree. A node is
{id,request:{units,tags,minZones,antiWith,shareZoneWith},children:[node,...]}.
Each request needs exactly units DISTINCT resource IDs, each containing every required
tag and having an unused capacity slot. Selected resources must span at least minZones
zones. antiWith lists ancestor node IDs: this request may not use a resource chosen by
any of those ancestors. shareZoneWith is null or an ancestor node ID; if non-null,
every selected resource's zone must occur in that ancestor's allocation.
These conditions are simultaneous. Capacity is consumed per selected slot, forever
within the run; pre-existing occupancy remains. No release or reassignment is permitted.

The tree declares every possible future request. After a node, one child may be
disclosed. Each acceptance must leave a valid policy for every possible future
disclosure; later choices may depend on disclosures already received. Every supplied
root admits such a policy. At a disclosed leaf no further work remains.

next({}) reveals the current node ID, or null after the selected leaf. The realized
path is one of the declared paths, not known in advance. Call place({node,resources})
exactly once for the disclosed node BEFORE asking for the next node. This records an
irrevocable acceptance; later replacement does not undo the original promise.
place persists bounded shapes and returns {stored:true}; malformed outer shapes return
{error:"shape"}. Semantic errors are recorded, not repaired or blocked by the host.
One published allocation per realized node, no foreign nodes, no extra resources.
Resource order within an allocation is irrelevant. Returning a plan without place is
not acceptance. Request IDs and resource IDs are exact and globally unique.

Bounds: 1–6 resources, capacities 1–2, 0<=used<=capacity, at most 3 tags per resource,
units 1–2, minZones 1–2, at most 9 tree nodes and path depth 4, at most 2 children/node.
All references in antiWith/shareZoneWith name ancestors on that path. 

## Execution environment

Node 24 and built-ins are available offline during grading. Entry point: entry.mjs
exports subject.run(view, api). All API methods are asynchronous and take one object.
Submitted return values are diagnostic only; required outputs must be published.
Any correct algorithm or module layout is allowed. The workspace may contain at most
128 regular files, 8 MiB total and depth 16; no lingering subprocesses.
There are 45 seconds per service invocation, not per human/agent repair. Transport:
4000 frames including begin/report/finish (3997 API calls maximum), 64 KiB UTF-8 JSON
per frame, 16 MiB per channel and combined diagnostics. Supplied views/responses and
compact correct request payloads fit 48 KiB jointly with the domain bounds; independent
maxima need not occur together. No timeout-only difficulty or unknown API is intended.

