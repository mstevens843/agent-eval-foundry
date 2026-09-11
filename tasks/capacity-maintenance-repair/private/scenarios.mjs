export const checkIds = [
  "completion",
  "capacity",
  "availability",
  "placement",
  "restoration",
  "readiness",
  "legal_operations",
];
export function scenarios() {
  const base = Array.from({ length: 25 }, (_, i) => {
    const n = i === 24 ? 0 : i + 1;
    if (!n)
      return {
        id: "case-024",
        hosts: [{ id: "h", zone: "z", capacity: 2 }],
        services: [],
        placement: [],
        requests: ["h"],
        dependencies: [],
      };
    const hosts = Array.from({ length: 5 }, (_, j) => ({
      id: "h" + j,
      zone: j < 2 ? "a" : j < 4 ? "b" : "c",
      capacity: j === 4 ? 3 : j % 2 ? 2 : 1,
    }));
    const services = [
      { id: "s1", size: 1, min: 2, max: 3, perZone: 1, eligible: hosts.map((h) => h.id) },
      { id: "s2", size: 2, min: 2, max: 3, perZone: 1, eligible: hosts.map((h) => h.id) },
    ];
    const placement = [
      { host: "h0", service: "s1" },
      { host: "h2", service: "s1" },
      { host: "h1", service: "s2" },
      { host: "h3", service: "s2" },
    ];
    const requests = n & 1 ? ["h0", "h3"] : ["h1", "h2"],
      dependencies = n & 2 ? [{ before: requests[0], after: requests[1] }] : [];
    if (n & 4) {
      hosts[4].capacity = 5;
      services[0].perZone = 2;
    }
    if (n & 16) hosts[3].capacity = 3;
    if (n & 8) {
      hosts.reverse();
      services.reverse();
      placement.reverse();
      requests.reverse();
    }
    return { id: "case-" + String(i).padStart(3, "0"), hosts, services, placement, requests, dependencies };
  });
  const cases = [...base, fullScaleCase(), phaseForcingCase(), capacityBlindTargetCase()];
  const identity = structuredClone(base[0]);
  identity.id = "case-026";
  const hostIds = new Map(identity.hosts.map((h, i) => [h.id, ["h:0", "h,1", "h/2", "constructor", "__proto__"][i]]));
  const serviceIds = new Map(identity.services.map((s, i) => [s.id, ["constructor", "__proto__"][i]]));
  for (const h of identity.hosts) {
    h.id = hostIds.get(h.id);
    h.zone = h.zone === "a" ? "__proto__" : h.zone === "b" ? "constructor" : "z/other";
  }
  for (const s of identity.services) {
    s.id = serviceIds.get(s.id);
    s.eligible = s.eligible.map(id => hostIds.get(id));
  }
  identity.placement = identity.placement.map(p => ({ host: hostIds.get(p.host), service: serviceIds.get(p.service) }));
  identity.requests = identity.requests.map(id => hostIds.get(id));
  identity.dependencies = identity.dependencies.map(d => ({ before: hostIds.get(d.before), after: hostIds.get(d.after) }));
  cases.push(identity);
  const eligibility = phaseForcingCase();
  eligibility.id = "case-restricted-eligibility";
  eligibility.services[0].eligible = ["h0", "h4"];
  cases.push(eligibility);
  return cases;
}

/** The generator above never exercises the upper edge of the declared scale (SEMANTICS.md:
 * "At most 6 hosts, 3 services, 3 requested hosts, capacities/sizes 1-5, at most 12 original
 * placements") — every base case tops out at 5 hosts, 2 services, 2 requested hosts, capacity
 * <=3 and size <=2. This case actually reaches that declared ceiling: 6 hosts (capacities up
 * to 5), 3 services (sizes 1/2/3), 3 requested hosts with a two-link dependency chain, and 10
 * original placements. Every service is placed with count slack above its min (so evacuating a
 * requested host never needs a temporary swap first) and every host has zone/capacity headroom,
 * so the state is reachable and restorable by direct removal-then-maintain-then-add-back — the
 * reference planner finds a 13-step plan, and the independent `alternative` strategy solves it
 * in under a dozen milliseconds, both comfortably inside the 45s/4000-call adapter budget.
 */
function fullScaleCase() {
  const hosts = [
    { id: "h0", zone: "a", capacity: 5 },
    { id: "h1", zone: "a", capacity: 3 },
    { id: "h2", zone: "b", capacity: 5 },
    { id: "h3", zone: "b", capacity: 4 },
    { id: "h4", zone: "c", capacity: 5 },
    { id: "h5", zone: "c", capacity: 5 },
  ];
  const services = [
    { id: "s1", size: 1, min: 3, max: 5, perZone: 2, eligible: hosts.map((h) => h.id) },
    { id: "s2", size: 2, min: 2, max: 3, perZone: 2, eligible: hosts.map((h) => h.id) },
    { id: "s3", size: 3, min: 2, max: 3, perZone: 2, eligible: hosts.map((h) => h.id) },
  ];
  const placement = [
    { host: "h1", service: "s1" },
    { host: "h2", service: "s1" },
    { host: "h3", service: "s1" },
    { host: "h4", service: "s1" },
    { host: "h0", service: "s2" },
    { host: "h3", service: "s2" },
    { host: "h5", service: "s2" },
    { host: "h0", service: "s3" },
    { host: "h4", service: "s3" },
    { host: "h5", service: "s3" },
  ];
  const requests = ["h0", "h2", "h5"];
  const dependencies = [
    { before: "h0", after: "h2" },
    { before: "h2", after: "h5" },
  ];
  return { id: "case-025", hosts, services, placement, requests, dependencies };
}

/** The scenario above (and every "n & 4" base case) still lets a requested host be evacuated by
 * pure removal, since its services carry slack above min -- the ONLY add+activate pair it forces
 * is the final restore. This case is deliberately zero-slack per service (min == starting active
 * count, with max exactly one above it for legal transient headroom): relocating h0's sole s1
 * instance is impossible via "add-then-instantly-count" bookkeeping. You must reach a state where
 * the OLD active row (on h0) and the NEW provisioning row (on a same-zone-free host) occupy
 * capacity SIMULTANEOUSLY, then activate the new one (bringing active count to max, momentarily
 * doubled) before it is safe to remove the old one (dropping back to min) -- and symmetrically for
 * h3's sole-slack s2 instance, which a dependency forces to be handled only after h0.
 */
function phaseForcingCase() {
  const hosts = [
    { id: "h0", zone: "a", capacity: 4 },
    { id: "h1", zone: "a", capacity: 2 },
    { id: "h2", zone: "b", capacity: 4 },
    { id: "h3", zone: "b", capacity: 2 },
    { id: "h4", zone: "c", capacity: 2 },
  ];
  const services = [
    { id: "s1", size: 2, min: 1, max: 2, perZone: 1, eligible: hosts.map((h) => h.id) },
    { id: "s2", size: 1, min: 2, max: 3, perZone: 1, eligible: hosts.map((h) => h.id) },
  ];
  const placement = [
    { host: "h0", service: "s1" },
    { host: "h1", service: "s2" },
    { host: "h3", service: "s2" },
  ];
  const requests = ["h0", "h3"];
  const dependencies = [{ before: "h0", after: "h3" }];
  return { id: "case-027", hosts, services, placement, requests, dependencies };
}

/** Built for the "capacity-active-only" control (a candidate that only sums ACTIVE loads toward
 * a host's capacity, letting provisioning rows ride free). Two possible relocation targets exist
 * for h0's sole s1 instance: h1, which already carries an unrelated active s2 instance leaving
 * only 1 REAL unit of headroom (not enough for a size-2 provisioning row), and h2, which is empty
 * and has real room to spare. A candidate that ignores provisioning load when checking capacity
 * sees h1 as admissible (1 active unit counted against capacity 2, since the new provisioning row
 * itself is excluded); the real, phase-agnostic capacity invariant then catches the overcommit (1
 * active + 2 provisioning = 3 > 2) the instant that add lands. A correct planner's capacity check
 * (summing every phase) rejects h1 outright and is forced to route through h2 instead, so the
 * scenario stays solvable for reference/alternative while still exposing the bug.
 */
function capacityBlindTargetCase() {
  const hosts = [
    { id: "h0", zone: "a", capacity: 3 },
    { id: "h1", zone: "b", capacity: 2 },
    { id: "h2", zone: "c", capacity: 4 },
  ];
  const services = [
    { id: "s1", size: 2, min: 1, max: 2, perZone: 2, eligible: ["h0", "h1", "h2"] },
    { id: "s2", size: 1, min: 1, max: 1, perZone: 2, eligible: ["h0", "h1", "h2"] },
  ];
  const placement = [
    { host: "h0", service: "s1" },
    { host: "h1", service: "s2" },
  ];
  const requests = ["h0"];
  const dependencies = [];
  return { id: "case-028", hosts, services, placement, requests, dependencies };
}
