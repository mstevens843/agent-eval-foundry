# Fleet maintenance v2

view contains hosts [{id,zone,capacity}], services [{id,size,min,max,perZone,eligible}],
placement [{host,service}] (the ORIGINAL, unphased topology that the fleet must be restored
to), requests [host IDs], dependencies [{before,after}], storage. A placement has at most
one instance of a given service on a host, in at most one of two LIFECYCLE PHASES:
provisioning or active. Service size consumes host capacity. min and max bound the total
ACTIVE instances of that service. perZone is the maximum ACTIVE instances of that service in
ANY single zone. eligible lists permissible hosts.

api.state({}) returns {placement,done}: placement is the live, phase-tagged topology
({host,service,phase}), done is the list of upgraded hosts. The ORIGINAL placement rows are
already active before any operation runs.

api.add({host,service}) creates a new placement in the PROVISIONING phase. It is illegal
(structurally invalid, no state change) if a placement already exists for that host/service
pair in EITHER phase, or if host/service are not known IDs.

api.activate({host,service}) promotes an existing PROVISIONING placement at that host/service
to ACTIVE. It is illegal if no provisioning placement exists there (nothing there at all, or
it is already active).

api.remove({host,service}) removes an existing placement in EITHER phase. It is illegal if no
placement (of any phase) exists there.

Capacity and eligibility apply to a placement in EITHER phase: a provisioning instance
already physically occupies its host and could never legitimately serve from an ineligible
host, even before it is counted as serving. Availability (min/max) and perZone are counted
from ACTIVE placements ONLY: a provisioning placement does not yet help satisfy a service's
floor/ceiling or count against a zone's occupancy limit. None of capacity, eligibility,
min/max or per-zone rules are enforced by add/remove/activate themselves; violations are
independently graded at EVERY step, not just after maintenance. The agent must choose a safe
order -- for example, a replacement is typically added (provisioning) and activated BEFORE
the placement it replaces is removed, so the service's active count never dips below its
minimum, and the two coexist in capacity only for as long as that transition takes.

api.maintain({host}) upgrades a requested host that currently holds ZERO placements, of
EITHER phase. Each requested host must be upgraded exactly once, and dependencies require
before to have completed before after is upgraded. Upgrade duration is abstracted into one
atomic operation. Hosts remain available afterward. All acknowledged operations take effect
immediately and return {ok:true}. Structurally invalid IDs, duplicate adds, absent removes,
illegal activations, occupied-host maintenance, repeated upgrades and unmet dependencies
return {ok:false,error:string} without changing placement. They are invalid plans and must
not occur.

After all requested upgrades: placement must equal the original complete placement (same
host/service pairs; unrequested hosts must not be upgraded), AND every placement that still
exists must be ACTIVE -- no placement may remain in the provisioning phase. api.finish({})
closes the operation and returns {ok:true}; no later changes or repeated finish. A report
cannot substitute for work.

At most 6 hosts, 3 services, 3 requested hosts, capacities/sizes 1–5, at most 12 original
placements. Dependencies are acyclic. Inputs are initially valid and have a solution of
at most 60 successful operations. No hidden fault, delay or scheduler choice is involved.
The adapter allows 4000 calls and 45 seconds; a human repair budget is not a runtime budget.
