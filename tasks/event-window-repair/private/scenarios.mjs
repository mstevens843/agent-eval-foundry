export const checkIds = [
  "completion",
  "window_values",
  "publication_boundary",
  "late_output",
  "unique_windows",
];
export function scenarios() {
  const list = [];
  for (let seed = 0; seed < 24; seed++) {
    const p = "p" + seed,
      q = "q" + seed,
      w = 4 + (seed % 6),
      l = seed % 3;
    const data = (partition, id, time, delta, key = "m") => ({
      kind: "data",
      partition,
      id,
      time,
      key,
      delta,
    });
    const events = [
      data(p, "same", 0, 3),
      data(q, "same", w - 1, 5),
      { kind: "watermark", partition: p, value: w + l },
      data(q, "second", 1, -3),
      { kind: "idle", partition: q },
      data(p, "late", 0, 7),
      data(p, "late", 0, 7),
      { kind: "idle", partition: p },
      { kind: "resume", partition: q },
      data(q, "behind", 0, 9),
      data(q, "later", w + 1, 2),
      { kind: "watermark", partition: q, value: 2 * w + l },
      { kind: "resume", partition: p },
      data(p, "zero-a", 2 * w, 4),
      data(p, "zero-b", 2 * w, -4),
      { kind: "watermark", partition: p, value: 3 * w + l },
      { kind: "watermark", partition: q, value: 3 * w + l },
      { kind: "end", partition: p },
      { kind: "end", partition: q },
    ];
    if (seed % 2) events.splice(2, 0, data(p, "negative", -1, 2, "negative"));
    if (seed % 3 === 0) events.splice(1, 0, structuredClone(events[0]));
    list.push({
      id: "case-" + String(seed).padStart(3, "0"),
      view: { partitions: [p, q], width: w, lateness: l },
      events,
    });
  }
  list.push({
    id: "case-024",
    view: { partitions: ["p"], width: 10, lateness: 0 },
    events: [
      { kind: "data", partition: "p", id: "a", time: 1, key: "x", delta: 3 },
      { kind: "end", partition: "p" },
    ],
  });
  list.push({
    id: "case-025",
    view: { partitions: ["p"], width: 1, lateness: 0 },
    events: [{ kind: "end", partition: "p" }],
  });
  // Dedup must gate the late-vs-accept branch, not the other way around: a duplicate identity
  // has no further effect regardless of what the frontier has done since the original arrived.
  // Every duplicate pair in the seeded cases above arrives back-to-back with no intervening
  // frontier advance, so a check-order-inverted implementation (one that classifies lateness on
  // every incoming event, including already-seen ones, instead of dropping duplicates first)
  // produces identical output to the correct algorithm on all of them. This case is the one
  // shape that distinguishes the two: the original "e1" is accepted (not late), the frontier is
  // then advanced past that window's close+lateness threshold via a watermark (closing and
  // publishing the window), and only then does a byte-identical duplicate of the original,
  // already-accepted "e1" arrive. A correct implementation must silently drop it -- SEMANTICS.md:
  // "A duplicate ... has no further effect." A check-order-inverted implementation instead
  // re-evaluates lateness for the duplicate against the now-advanced frontier and incorrectly
  // calls late() with it.
  list.push({
    id: "case-026",
    view: { partitions: ["p"], width: 5, lateness: 0 },
    events: [
      { kind: "data", partition: "p", id: "e1", time: 2, key: "k", delta: 10 },
      { kind: "watermark", partition: "p", value: 10 },
      { kind: "data", partition: "p", id: "e1", time: 2, key: "k", delta: 10 },
      { kind: "end", partition: "p" },
    ],
  });
  return list;
}
