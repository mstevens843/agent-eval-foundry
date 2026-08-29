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
  /** Stable identity for a point. Must include every knob. */
  readonly keyOf: (item: T) => string;
  /** Keep roughly this fraction. */
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
  const groupOf = options.groupOf ?? ((): string => "all");
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const out: T[] = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key) ?? [];
    const ranked = [...group].sort((a, b) => {
      const ha = hash32(options.keyOf(a));
      const hb = hash32(options.keyOf(b));
      return ha === hb ? options.keyOf(a).localeCompare(options.keyOf(b)) : ha - hb;
    });
    const keep = Math.max(1, Math.round(ranked.length * options.fraction));
    out.push(...ranked.slice(0, keep));
  }
  // Sorted by identity so the measured set is stable and diffable.
  return out.sort((a, b) => options.keyOf(a).localeCompare(options.keyOf(b)));
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
