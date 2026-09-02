// Turning things on disk into something the probe can read.
//
// Two entry points, and the split is the whole point of the module. `directoryTarget` knows nothing
// about this repository: two directories, one hidden, one visible, and it works on any benchmark
// anyone has. `familyTarget` is the thin repo-specific glue that knows where this project keeps its
// verifiers and its packages. If the glue were mixed into the probe, the probe would only ever run
// here, and the most valuable thing this project has built would be unusable by the people who need
// it most — the ones grading their own tasks with their own verifier.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { Language, ProbeFile, ProbeTarget } from "./types.js";

const LANGUAGE_BY_EXT: Readonly<Record<string, Language>> = {
  ".ts": "ts",
  ".tsx": "ts",
  ".js": "ts",
  ".mjs": "ts",
  ".cjs": "ts",
  ".py": "py",
  ".md": "text",
  ".txt": "text",
  ".json": "text",
  ".toml": "text",
  ".yaml": "text",
  ".yml": "text",
};

const SKIP_DIRS = new Set(["node_modules", "__pycache__", ".git", "dist", ".pytest_cache"]);

function walk(root: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const abs = join(root, entry);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (st.isFile() && LANGUAGE_BY_EXT[extname(entry)] !== undefined) out.push(abs);
  }
  return out;
}

function load(root: string, absolute: string): ProbeFile {
  return {
    path: relative(root, absolute) || absolute,
    source: readFileSync(absolute, "utf8"),
    language: LANGUAGE_BY_EXT[extname(absolute)] ?? "text",
  };
}

/**
 * Probe any benchmark: point at the grader, point at what the subject can read.
 *
 * `hiddenRoot` should contain the verifier and anything else that decides the score. `visibleRoot`
 * should contain everything shipped to the subject — specification, README, starter, worked
 * examples, type declarations. When in doubt, put a file in `visible`: the question the probe asks
 * is always "could the subject have known?", and a file wrongly called hidden produces a false
 * positive, while a file wrongly called visible silently clears a real defect.
 */
export function directoryTarget(id: string, hiddenRoot: string, visibleRoot: string): ProbeTarget {
  return {
    id,
    hidden: walk(hiddenRoot).map((abs) => load(hiddenRoot, abs)),
    visible: walk(visibleRoot).map((abs) => load(visibleRoot, abs)),
  };
}

/**
 * Family ids whose hidden directory is not named after them.
 *
 * `prompt-injection-memory-poisoning` is the registry id and the package name; the code that grades
 * it lives in `src/families/memory-poisoning/`. Discovering families by directory name silently
 * skips it, which is the worst possible failure for a sweep: the family with a known live defect
 * would simply not appear in the table, and the table would look complete.
 */
const HIDDEN_DIR_ALIAS: Readonly<Record<string, readonly string[]>> = {
  "prompt-injection-memory-poisoning": ["memory-poisoning"],
  // The checker-required variant grades its own rules AND inherits the policy, verifier and scenario
  // generator of the family it descends from. Probing only its own directory misses every commitment
  // it inherited, including the transition set its SPEC never enumerates.
  "checker-required-memory-poisoning": ["checker-required-memory-poisoning", "memory-poisoning"],
};

/**
 * Files under a family directory that are NOT hidden decision code.
 *
 * Getting this wrong in either direction is expensive, and the two errors are not symmetric.
 *
 * `spec.ts` is the one that would have been embarrassing: it EXPORTS THE VISIBLE SPECIFICATION as a
 * markdown string. Reading it as hidden code makes the probe flag the subject for not knowing things
 * that are printed in the package it was handed.
 *
 * `reference.ts` is the known-good solution. A solution necessarily contains implementation choices
 * that are not requirements — a sort order, a retry count, a data structure — and grading nothing.
 * Treating it as decision code is the largest single source of false positives available here.
 *
 * `types.ts` is re-exported into the package verbatim, and `mutants.ts` describes known-bad subjects
 * rather than the rules any subject is graded against.
 *
 * The last four were added after an adversarial review killed findings drawn from them, and each was
 * a distinct category error:
 *
 *   `scenarios.ts` and `app.ts` GENERATE the graded cases. `seed === 11 ? 2 : 5` in a generator
 *   decides which scenario gets built, not whether a subject passed it. A subject is never graded on
 *   a constant it was not asked about, so a threshold there is not a requirement on anybody.
 *
 *   `invariants.ts` is the family checking ITSELF — build-time self-gates asserting that mutants
 *   differ in one field, that the reference behaves, that witnesses exist. It grades the AUTHOR, not
 *   the subject, and reading it produced findings about calls the reference makes.
 *
 * The rule underneath all of them: hidden decision code is code that decides a SUBJECT'S SCORE.
 * Everything else in the same directory is hidden, and is not decision code, and the difference is
 * where most of this probe's false positives came from.
 */
const NOT_DECISION_CODE =
  /(^|\/)(types|mutants|spec|reference|scenarios|app|invariants|harness|readiness|measurement)\.ts$/;

/**
 * Probe one family of this repository.
 *
 * Hidden is the graded decision code; visible is the built challenge package, which is exactly what
 * a subject receives. Returns a target with an empty `hidden` or `visible` when the family is
 * declared but not built — the sweep reports that as "probe blind here", never as "clean".
 */
export function familyTarget(repoRoot: string, familyId: string): ProbeTarget {
  const dirs = HIDDEN_DIR_ALIAS[familyId] ?? [familyId];
  const hidden: ProbeFile[] = [];
  for (const dir of dirs) {
    const hiddenRoot = join(repoRoot, "src", "families", dir);
    for (const abs of walk(hiddenRoot)) {
      const file = load(join(repoRoot, "src", "families"), abs);
      if (NOT_DECISION_CODE.test(file.path)) continue;
      if (hidden.some((h) => h.path === file.path)) continue;
      hidden.push(file);
    }
  }
  const visibleRoot = join(repoRoot, "examples", "families", familyId, "challenge");
  return { id: familyId, hidden, visible: walk(visibleRoot).map((abs) => load(visibleRoot, abs)) };
}

/**
 * Every family with both graded code and a built package.
 *
 * Driven from `examples/families/`, because the package is what a subject receives and a family with
 * no package cannot be probed at all. Three directories there hold pre-registrations — a family
 * sketch with no SPEC, no starter and no hidden code — and one built family keeps its code under a
 * different name; both cases are resolved here rather than by whoever calls this.
 */
export function probeableFamilies(repoRoot: string): string[] {
  const examples = join(repoRoot, "examples", "families");
  const out: string[] = [];
  for (const id of readdirSync(examples)) {
    if (!statSync(join(examples, id)).isDirectory()) continue;
    const target = familyTarget(repoRoot, id);
    if (target.hidden.length > 0 && target.visible.length > 0) out.push(id);
  }
  return out.sort();
}

/** Families that exist as a directory but cannot be probed, with the reason. */
export function unprobeableFamilies(repoRoot: string): { id: string; reason: string }[] {
  const examples = join(repoRoot, "examples", "families");
  const out: { id: string; reason: string }[] = [];
  for (const id of readdirSync(examples)) {
    if (!statSync(join(examples, id)).isDirectory()) continue;
    const target = familyTarget(repoRoot, id);
    if (target.hidden.length > 0 && target.visible.length > 0) continue;
    const reason =
      target.visible.length === 0 && target.hidden.length === 0
        ? "pre-registration: no graded code and no built challenge package"
        : target.visible.length === 0
          ? "declared and coded, but no challenge package has been built"
          : "package built, but no graded decision code under src/families";
    out.push({ id, reason });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
