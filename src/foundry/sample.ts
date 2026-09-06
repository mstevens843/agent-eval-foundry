// Selecting a measured subset from a declared space, without accidentally freezing a knob.
//
// THE BUG THIS EXISTS TO PREVENT, WHICH BOTH NEW FAMILIES SHIPPED WITH
//
// The obvious selection is a stride: enumerate the space, keep every nth point. It is deterministic,
// it is one line, and it is wrong in a way nothing downstream notices. Enumeration is a nested loop,
// so the innermost knob cycles fastest — and a stride whose step shares a factor with that cycle
// length picks the SAME value of that knob every time.
//
// Both families here were built with a stride. The memory family's innermost knob had three values
// and the stride was three: every one of its 288 measured scenarios had `decoySimilarity: none`, and
// a mutant written to detect decoy confusion was reported as catching nothing because the condition
// it detects was never generated. The UI family's innermost knob had two values and the stride was
// two: `replayCount: 2` never appeared, so the idempotency mutant could not fail.
//
// The suite still looked healthy. The reference passed, the mutants were "caught", the axis meter
// reported a number. A frozen knob is invisible from every direction except this one.
//
// So selection here is by a content hash of the point rather than by position. The hash has no
// relationship to enumeration order, which is exactly the property a stride lacks. `assertCoverage`
// then checks the result: every declared value of every knob must survive selection, or the space
// says something the suite does not measure.

import { fail } from "./schema.js";

/** FNV-1a. Small, deterministic, and stable across runs — the report has to be diffable. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface SampleOptions<T> {
  /** Unique, nonempty stable identity for a point. Must include every knob. */
  readonly keyOf: (item: T) => string;
  /** Keep roughly this fraction, in (0, 1]. Every nonempty stratum retains at least one item. */
  readonly fraction: number;
  /** Points are grouped by this and sampled within each group, so no group is emptied. */
  readonly groupOf?: (item: T) => string;
}

/**
 * Select a reproducible subset, grouped so no stratum is lost.
 *
 * Within a group, points are ordered by hash and the first `fraction` are kept. That is stable
 * across runs, independent of enumeration order, and — unlike a stride — has no reason to correlate
 * with any single knob.
 */
export function sampleSpace<T>(items: readonly T[], options: SampleOptions<T>): readonly T[] {
  if (!Number.isFinite(options.fraction) || options.fraction <= 0 || options.fraction > 1)
    throw new RangeError("sampleSpace fraction must be finite and in (0, 1]");
  const groupOf = options.groupOf ?? ((): string => "all");
  type Ranked = { item: T; identity: string; hash: number };
  const groups = new Map<string, Ranked[]>();
  const identities = new Set<string>();
  for (const item of items) {
    const identity = options.keyOf(item);
    if (typeof identity !== "string" || !identity || identities.has(identity))
      throw new Error("sampleSpace requires unique nonempty identities");
    identities.add(identity);
    const key = groupOf(item);
    const group = groups.get(key) ?? [];
    if (!groups.has(key)) groups.set(key, group);
    group.push({ item, identity, hash: hash32(identity) });
  }
  const out: Ranked[] = [];
  for (const key of [...groups.keys()].sort()) {
    const ranked = (groups.get(key) ?? []).sort((a, b) =>
      a.hash === b.hash ? a.identity.localeCompare(b.identity) : a.hash - b.hash,
    );
    const keep = Math.max(1, Math.round(ranked.length * options.fraction));
    for (let i = 0; i < keep; i += 1) {
      const entry = ranked[i];
      if (entry) out.push(entry);
    }
  }
  // Sorted by identity so the measured set is stable and diffable.
  return out.sort((a, b) => a.identity.localeCompare(b.identity)).map((row) => row.item);
}

/**
 * Every declared value of every knob must appear in the selection.
 *
 * The check that would have caught the frozen knob immediately. It is cheap, it is exhaustive, and a
 * family that cannot satisfy it is declaring a parameter it does not measure.
 */
export function assertKnobCoverage<T>(
  selected: readonly T[],
  space: Readonly<Record<string, readonly unknown[]>>,
  knobValue: (item: T, knob: string) => unknown,
  spacePath: string,
): void {
  for (const [knob, values] of Object.entries(space)) {
    const present = new Set(selected.map((item) => JSON.stringify(knobValue(item, knob))));
    const missing = values.filter((v) => !present.has(JSON.stringify(v)));
    if (missing.length > 0) {
      fail(
        "SAMPLE_KNOB_FROZEN",
        `${spacePath}.${knob}`,
        `declared value(s) ${missing.map((m) => JSON.stringify(m)).join(", ")} never appear in the measured set; the knob is declared and not measured`,
      );
    }
  }
}
