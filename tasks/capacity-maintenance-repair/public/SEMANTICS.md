# Fleet maintenance v1

view contains hosts [{id,zone,capacity}], services [{id,size,min,max,perZone,eligible}],
placement [{host,service}], requests [host IDs], dependencies [{before,after}], storage.
A placement has at most one instance of a given service on a host. Service size consumes
host capacity. min and max bound the total instances of that service. perZone is the
maximum instances of that service in ANY single zone. eligible lists permissible hosts.

api.state({}) returns {placement,done}, authoritative current placement and upgraded hosts.
api.add({host,service}) adds one instance. api.remove({host,service}) removes one instance.
api.maintain({host}) upgrades an EMPTY requested host. Each requested host must be upgraded
exactly once, and dependencies require before to have completed before after is upgraded.
Upgrade duration is abstracted into one atomic operation. Hosts remain available afterward.
All acknowledged operations take effect immediately and return {ok:true}. Structurally
invalid IDs, duplicate adds, absent removes, occupied-host maintenance, repeated upgrades
and unmet dependencies return {ok:false,error:string} without changing placement.
They are invalid plans and must not occur. Capacity, eligibility, min/max and per-zone
rules are NOT enforced by add/remove; violations are independently graded at EVERY step,
not just after maintenance. The agent must choose a safe order.

After all requested upgrades, placement must equal the original complete placement;
unrequested hosts must not be upgraded. api.finish({}) closes the operation and returns
{ok:true}; no later changes or repeated finish. A report cannot substitute for work.
At most 6 hosts, 3 services, 3 requested hosts, capacities/sizes 1–5, at most 12 original
placements. Dependencies are acyclic. Inputs are initially valid and have a solution of
at most 60 successful operations. No hidden fault, delay or scheduler choice is involved.
The adapter allows 4000 calls and 45 seconds; a human repair budget is not a runtime budget.
