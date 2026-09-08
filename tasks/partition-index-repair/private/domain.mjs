import { session, checks, equal } from "./adapter.mjs";
export function obligations(s) {
  const generation = new Map(s.partitions.map((p) => [p, 0])),
    expected = new Map(),
    desired = new Map(s.partitions.map((p) => [p, new Set()]));
  for (const e of s.events) {
    if (!generation.has(e.partition)) continue;
    if (e.kind === "assignment") {
      generation.set(e.partition, e.generation);
      continue;
    }
    if (generation.get(e.partition) !== e.generation) continue;
    desired.get(e.partition).add(e.offset);
    const k = JSON.stringify([e.partition, e.record.entity]),
      old = expected.get(k);
    if (!old || old.version < e.record.version) expected.set(k, e.record);
  }
  return { expected, desired };
}
export async function runScenario(s, execute, storage) {
  const { expected, desired } = obligations(s);
  const generation = new Map(s.partitions.map((p) => [p, 0])),
    actual = new Map(),
    done = new Map(s.partitions.map((p) => [p, new Set()])),
    checkpoints = new Map(s.partitions.map((p) => [p, -1])),
    delivered = new Map(),
    observations = [],
    operations = [],
    reports = [];
  const key = (p, e) => JSON.stringify([p, e]);
  let index = 0;
  const validOwner = (r) => generation.has(r.partition) && generation.get(r.partition) === r.generation;
  await execute(
    session(
      { partitions: s.partitions, storage },
      {
        next: () => {
          const e = s.events[index++] ?? null;
          if (!e) return null;
          if (e.kind === "assignment") {
            if (generation.has(e.partition)) generation.set(e.partition, e.generation);
          } else if (validOwner(e)) {
            delivered.set(e.eventId, e);
          }
          return e;
        },
        read: ({ partition, entity }) => structuredClone(actual.get(key(partition, entity)) ?? null),
        put: (r) => {
          const k = key(r.partition, r.entity),
            previous = actual.get(k),
            known = [...delivered.values()].some(
              (e) =>
                e.partition === r.partition &&
                equal(e.record, { entity: r.entity, version: r.version, body: r.body }),
            );
          operations.push({
            method: "put",
            request: structuredClone(r),
            owner: validOwner(r),
            version: !previous || r.version >= previous.version,
            payload: known,
          });
          actual.set(k, { entity: r.entity, version: r.version, body: r.body });
          return { stored: true };
        },
        complete: (r) => {
          const e = delivered.get(r.eventId),
            row = e && actual.get(key(e.partition, e.record.entity));
          const valid =
            !!e &&
            e.partition === r.partition &&
            e.offset === r.offset &&
            row &&
            row.version >= e.record.version &&
            validOwner(r);
          operations.push({
            method: "complete",
            request: structuredClone(r),
            owner: validOwner(r),
            valid: !!valid,
          });
          if (valid) done.get(r.partition).add(r.offset);
          return { stored: true };
        },
        commit: (r) => {
          let prefix = -1;
          const completed = done.get(r.partition);
          while (completed?.has(prefix + 1)) prefix++;
          const valid =
            Number.isInteger(r.offset) &&
            r.offset >= (checkpoints.get(r.partition) ?? -1) &&
            r.offset <= prefix;
          operations.push({ method: "commit", request: structuredClone(r), owner: validOwner(r), valid });
          checkpoints.set(r.partition, r.offset);
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const required = [...desired].map(([p, offsets]) => {
    let n = -1;
    while (offsets.has(n + 1)) n++;
    return [p, n];
  });
  return {
    ...checks({
      completion:
        index >= s.events.length &&
        required.every(([p, n]) => checkpoints.get(p) === n) &&
        [...desired].every(([p, offsets]) => [...offsets].every((o) => done.get(p).has(o))),
      index_payload:
        equal([...actual].sort(), [...expected].sort()) &&
        operations.filter((o) => o.method === "put").every((o) => o.payload),
      version_order: operations.filter((o) => o.method === "put").every((o) => o.version),
      ownership: operations.every((o) => o.owner),
      checkpoint_prefix: operations
        .filter((o) => o.method === "commit" || o.method === "complete")
        .every((o) => o.valid),
      preservation: operations.every((o) => s.partitions.includes(o.request.partition)),
    }),
    actual: [...actual],
    expected: [...expected],
    checkpoints: [...checkpoints],
    // The full allowed partition set, identical to the `partitions` field already handed to the
    // candidate itself as `view.partitions` when the scenario begins (see the `session(...)`
    // call above). This is PROBLEM data every solver already receives as input -- not a computed
    // answer -- so echoing it back is legitimate; a checker needs it to independently judge the
    // "preservation" obligation (no writes to partitions outside this set) from the candidate's
    // own observed API calls, rather than being handed the verdict directly.
    partitions: s.partitions,
    inputEvents: s.events,
    observations,
    reports,
  };
}
