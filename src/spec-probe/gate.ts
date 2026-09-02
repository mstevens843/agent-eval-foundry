// The gate: no family reaches a counted trial carrying a probe finding nobody has read.
//
// THE SHAPE OF THIS GATE IS THE INTERESTING PART, and it is not the shape the brief asked for.
//
// The obvious gate blocks on findings. That gate is indefensible here, and the evidence says so:
// swept over eight built families the probe produced 23 findings, and independent adversarial review
// — instructed to refute, defaulting to false-positive — refuted every one. A blocking gate would
// have blocked the entire portfolio on noise. A gate that blocks everything gets switched off, and a
// gate that has been switched off is worse than no gate, because the repository still claims one.
//
// So this blocks on SILENCE instead. A high-severity finding must have a recorded adjudication with
// a written reason before the family can count a trial. Accepting a finding is allowed; ignoring one
// is not. That gate cannot be satisfied by looking away, it costs one read per finding, and it is
// exactly the discipline that would have caught all four of this project's withdrawn results — every
// one of which was a finding nobody had gone looking for.
//
// The adjudicator was itself calibrated before its verdicts were believed. Handed the
// durable-approval-outbox control arm, whose defect is independently established by a controlled
// experiment, it returned REAL_DEFECT. It is not a rubber stamp.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { probe } from "./probe.js";
import { familyTarget } from "./targets.js";
import type { Finding } from "./types.js";

export interface Adjudication {
  readonly familyId: string;
  readonly detector: string;
  /** The finding's `missing[0]`, which is the stable identity of what the probe objected to. */
  readonly requirement: string;
  readonly verdict: "false-positive" | "real-defect" | "accepted-risk" | "disputed";
  /** Why. Free text, and it has to be long enough to have said something. */
  readonly reason: string;
  readonly evidence?: readonly string[];
  readonly adjudicatedBy: { readonly kind: "human" | "automated"; readonly id: string; readonly date: string };
  /**
   * `path:line` of the hidden site this adjudication read.
   *
   * Load-bearing, not decorative. Identity used to be `family|detector|requirement`, which drops the
   * site — so two genuinely distinct findings that happen to share a detector and a requirement
   * string collapsed to one, and a single written reason cleared a finding nobody had looked at.
   * That is reachable here: `checker-required-memory-poisoning` deliberately merges two hidden
   * directories, and the same method name required at two call sites in two files produces two
   * findings with identical `missing[0]`.
   *
   * Optional so records written before this field existed still load — but an adjudication without
   * a site clears only a finding that is itself unique on (detector, requirement).
   */
  readonly site?: string;
}

/** A reason shorter than this is not a reason. Matches the migration rule's own floor. */
export const MIN_REASON_CHARS = 80;

export interface ProbeGateResult {
  readonly familyId: string;
  readonly blocking: readonly Finding[];
  /** High-severity findings with no adjudication on file. These are what block. */
  readonly unadjudicated: readonly Finding[];
  /**
   * Adjudications whose finding is no longer high-severity — repaired, downgraded, or the probe
   * changed under them. `severity` says which, because deleting a record for a defect that merely
   * got downgraded loses the reasoning for a gap that still exists.
   */
  readonly stale: readonly { readonly adjudication: Adjudication; readonly reason: "gone" | "downgraded" }[];
  /**
   * The probe extracted no commitments at all: it could not read this family.
   *
   * Reported separately and BLOCKS, because it is the failure mode that looks like success. A
   * misrouted alias, an unbuilt family or a grader shape the lexer cannot parse all produce zero
   * findings, which is byte-identical to a clean result and is the opposite fact.
   */
  readonly blind: boolean;
  readonly passes: boolean;
}

const VERDICTS = new Set(["false-positive", "real-defect", "accepted-risk", "disputed"]);

/**
 * Read the adjudications, validating shape rather than asserting it.
 *
 * The file is hand-edited. A `as Adjudication[]` cast is a compile-time fiction, and one record
 * missing `reason` used to throw inside the gate's filter — taking down the run for EVERY family
 * rather than failing the one bad record with a readable message. A gate that crashes is a gate
 * somebody deletes.
 */
export function loadAdjudications(repoRoot: string): readonly Adjudication[] {
  const path = join(repoRoot, "data", "probe-adjudications.json");
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  const list = (parsed as { adjudications?: unknown }).adjudications;
  if (!Array.isArray(list)) return [];
  return list.map((entry, i): Adjudication => {
    const r = entry as Record<string, unknown>;
    const str = (key: string): string => {
      const v = r[key];
      if (typeof v !== "string" || v.length === 0) {
        throw new Error(`data/probe-adjudications.json[${i}].${key}: expected a non-empty string`);
      }
      return v;
    };
    const verdict = str("verdict");
    if (!VERDICTS.has(verdict)) {
      throw new Error(
        `data/probe-adjudications.json[${i}].verdict: expected one of ${[...VERDICTS].join(" | ")}, got ${verdict}`,
      );
    }
    const by = r.adjudicatedBy as Record<string, unknown> | undefined;
    if (by === undefined || (by.kind !== "human" && by.kind !== "automated")) {
      throw new Error(`data/probe-adjudications.json[${i}].adjudicatedBy.kind: expected human | automated`);
    }
    return {
      familyId: str("familyId"),
      detector: str("detector"),
      requirement: str("requirement"),
      verdict: verdict as Adjudication["verdict"],
      reason: str("reason"),
      ...(Array.isArray(r.evidence) ? { evidence: r.evidence as readonly string[] } : {}),
      adjudicatedBy: {
        kind: by.kind,
        id: typeof by.id === "string" ? by.id : "unknown",
        date: typeof by.date === "string" ? by.date : "unknown",
      },
      ...(typeof r.site === "string" ? { site: r.site } : {}),
    };
  });
}

const identity = (familyId: string, detector: string, requirement: string): string =>
  `${familyId}|${detector}|${requirement}`;

/**
 * Evaluate one family.
 *
 * A `real-defect` adjudication does NOT satisfy the gate. Recording that a defect is real and then
 * counting a trial anyway is precisely the move this whole project exists to make impossible; the
 * repair has to land, and the finding has to stop being produced. `accepted-risk` is the escape
 * hatch, and it is deliberately a different word so it reads as a decision in the file rather than
 * as a conclusion.
 */
export function probeGate(repoRoot: string, familyId: string, adjudications: readonly Adjudication[]): ProbeGateResult {
  const result = probe(familyTarget(repoRoot, familyId));
  const extracted = result.cleared + result.findings.length;
  const high = result.findings.filter((f) => f.severity === "high");
  const mine = adjudications.filter((a) => a.familyId === familyId);

  const usable = mine
    .filter((a) => a.reason.trim().length >= MIN_REASON_CHARS)
    .filter((a) => a.verdict === "false-positive" || a.verdict === "accepted-risk");

  const clears = (finding: Finding): boolean => {
    const site = `${finding.hidden.path}:${finding.hidden.line}`;
    const requirement = finding.missing[0] ?? "";
    const candidates = usable.filter((a) => a.detector === finding.detector && a.requirement === requirement);
    // A site-qualified adjudication clears only its own site. An unqualified one clears only when
    // there is exactly one finding it could mean, so a legacy record cannot silently absorb a
    // second, unread finding that happens to share a detector and a requirement string.
    if (candidates.some((a) => a.site === site)) return true;
    const unqualified = candidates.filter((a) => a.site === undefined);
    if (unqualified.length === 0) return false;
    const sameShape = high.filter(
      (f) => f.detector === finding.detector && (f.missing[0] ?? "") === requirement,
    );
    return sameShape.length === 1;
  };

  const unadjudicated = high.filter((f) => !clears(f));

  const liveHigh = high.map((f) => ({
    detector: f.detector,
    requirement: f.missing[0] ?? "",
    site: `${f.hidden.path}:${f.hidden.line}`,
  }));
  const liveAny = result.findings.map((f) => ({
    detector: f.detector,
    requirement: f.missing[0] ?? "",
  }));
  const stale = mine
    .filter((a) => !liveHigh.some((l) => l.detector === a.detector && l.requirement === a.requirement))
    .map((a) => ({
      adjudication: a,
      // A finding that dropped from high to medium is not repaired; the gap is still there. Saying
      // "gone" would invite deleting the reasoning for a defect that still exists.
      reason: liveAny.some((l) => l.detector === a.detector && l.requirement === a.requirement)
        ? ("downgraded" as const)
        : ("gone" as const),
    }));

  const blind = extracted === 0;
  return { familyId, blocking: high, unadjudicated, stale, blind, passes: !blind && unadjudicated.length === 0 };
}

export function renderProbeGate(results: readonly ProbeGateResult[]): string {
  const lines: string[] = [
    "| family | high findings | unadjudicated | verdict |",
    "|---|---:|---:|---|",
  ];
  for (const r of results) {
    const verdict = r.blind ? "**BLIND — probe read nothing, NOT clean**" : r.passes ? "pass" : "**BLOCKED**";
    lines.push(`| \`${r.familyId}\` | ${r.blocking.length} | ${r.unadjudicated.length} | ${verdict} |`);
  }
  const blind = results.filter((r) => r.blind);
  if (blind.length > 0) {
    lines.push(
      "",
      "The probe extracted NO commitments from these families. That is not a clean result — it is a",
      "family the probe could not read, and it looks identical to a clean one. Check the hidden path,",
      "the alias table, and whether the grader is in a shape the lexer handles:",
    );
    for (const r of blind) lines.push(`- \`${r.familyId}\``);
  }
  const blocked = results.filter((r) => !r.passes);
  if (blocked.length > 0) {
    lines.push("", "Blocked families carry a high-severity probe finding that nobody has written a reason about:");
    for (const r of blocked) {
      for (const f of r.unadjudicated) {
        lines.push(`- \`${r.familyId}\` — ${f.detector}: ${f.missing[0]} (\`${f.hidden.path}:${f.hidden.line}\`)`);
      }
    }
    lines.push(
      "",
      "Record a verdict and a reason in `data/probe-adjudications.json`, or repair the package. The",
      "gate does not care which — it cares that somebody read it.",
    );
  }
  const stale = results.flatMap((r) => r.stale);
  if (stale.length > 0) {
    lines.push(
      "",
      "Adjudications with no matching HIGH finding. `gone` means the finding is absent entirely;",
      "`downgraded` means it still exists at a lower severity, so the gap was not repaired and the",
      "reasoning is still worth keeping:",
    );
    for (const { adjudication: a, reason } of stale) {
      lines.push(`- \`${a.familyId}\` — ${a.detector}: ${a.requirement} (${reason})`);
    }
  }
  return lines.join("\n");
}
