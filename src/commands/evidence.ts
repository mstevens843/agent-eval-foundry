// evidence: extracted compatibility command services. Core APIs remain independent of dispatch.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUILT_FAMILY_IDS, builtFamily } from "../families/registry.js";
import { phase14ChallengeVariantRegistrations } from "../phase-14/packages.js";
import { OUTBOX_FAMILY } from "../reports/evidence.js";
import { profileRun } from "../reports/self-check.js";
import { qualityOf } from "../reports/submission-quality.js";
import { normalizeSubjectId } from "../trials/bank.js";
import { readFamilyTrials } from "../trials/directory.js";
import { type EvidenceLedger, type EvidenceState, evidenceLedger } from "../trials/evidence-lifecycle.js";
import { ROUTABLE_FAMILY_IDS } from "../trials/router.js";
import { currentChallenge } from "../trials/run.js";

import { commandMemo } from "./context.js";

/**
 * The evidence ledgers, computed once per root.
 *
 * One computation, deliberately, because two things read this set and they must not disagree: every
 * report that prints a run id, and `assertStaleRunsLabelled`, which refuses the report if it printed
 * one without saying it was withdrawn. A second, subtly different ledger would show up as a report
 * that renders a run as live and a guard that says it is stale — or worse, the other way round.
 */
export function reportLedgers(root: string): readonly EvidenceLedger[] {
  return commandMemo(`evidence-ledgers:${root}`, () => {
    const variants = phase14ChallengeVariantRegistrations(root);
    const computed = ROUTABLE_FAMILY_IDS.filter((id) => BUILT_FAMILY_IDS.includes(id)).map((familyId) =>
      evidenceLedger(
        familyId,
        currentChallenge(root, familyId).hash,
        readFamilyTrials(join(root, "trials"), familyId),
        variants,
      ),
    );
    return computed;
  });
}

/**
 * Every routable family's trials with their lifecycle state, computed once.
 *
 * Extracted so the `all` command and the individual query subcommands cannot drift: a subcommand
 * that recomputed evidence state its own way would eventually disagree with the report, and the
 * disagreement would be invisible until someone compared them by hand.
 */
export function analysisBase(root: string) {
  const routable = ROUTABLE_FAMILY_IDS.filter((id) => BUILT_FAMILY_IDS.includes(id));
  const allTrials = [...routable, OUTBOX_FAMILY].flatMap((familyId) =>
    readFamilyTrials(join(root, "trials"), familyId).map((t) => ({ familyId, trial: t })),
  );
  const ledgers = reportLedgers(root);
  const evidenceState = new Map<string, EvidenceState>();
  for (const ledger of ledgers) {
    for (const entry of ledger.entries) evidenceState.set(entry.runId, entry.state);
  }
  return { routable, allTrials, ledgers, evidenceState };
}

export const readIfPresent = (file: string): string | null =>
  existsSync(file) ? readFileSync(file, "utf8") : null;

/**
 * The run's own metadata, for fields the trial record does not carry.
 *
 * `metadata.json` is not part of `TrialRecord`, and the agent scaffolding only lives there. Reading
 * it here rather than widening the trial reader keeps `src/trials/` unchanged.
 */
export function metadataOf(path: string): { readonly agent: string | null } {
  const raw = readIfPresent(join(path, "metadata.json"));
  if (raw === null) return { agent: null };
  const parsed = JSON.parse(raw) as { agent?: unknown };
  return { agent: typeof parsed.agent === "string" ? parsed.agent : null };
}

/** Self-check profiles for every agent trial on disk. */
export function selfCheckProfilesFor(base: ReturnType<typeof analysisBase>) {
  return base.allTrials
    .filter(({ trial }) => trial.record.subjectType === "agent")
    .map(({ familyId, trial }) => {
      const submissionFiles = trial.submissionFiles.flatMap((name) => {
        const source = readIfPresent(join(trial.path, "submission", name));
        return source === null ? [] : [{ name, source }];
      });
      const selfCheckFiles =
        familyId === "checker-required-memory-poisoning"
          ? submissionFiles.filter((f) => f.name !== "checker.mjs")
          : submissionFiles;
      return profileRun({
        runId: trial.runId,
        familyId,
        subjectId: normalizeSubjectId(trial.record.subjectId),
        providerFamily: (trial.record.model ?? "unknown").split("/")[0] ?? "unknown",
        state: base.evidenceState.get(trial.runId) ?? "not-run",
        scenariosFailed: trial.record.cells.filter((c) => c.failed.length > 0).length,
        submissionFiles: selfCheckFiles,
        transcript: readIfPresent(join(trial.path, "transcript.txt")),
        // The outbox submission is a Python package and every file in it is graded, so nothing in it
        // is a checker shipped beside the artifact. Passing null says that instead of reporting all
        // seven engine modules as voluntary self-checks.
        gradedArtifact: familyId === OUTBOX_FAMILY ? null : "subject.mjs",
        // Observed in the run's own metadata, not inferred from the model id: which lab's scaffolding
        // produced the transcript is the confound the report has to name.
        harness: metadataOf(trial.path).agent,
      });
    });
}

/** Structured submission-quality rows for every agent trial on disk. */
export function qualityRowsFor(
  base: ReturnType<typeof analysisBase>,
  profiles: ReturnType<typeof selfCheckProfilesFor>,
) {
  return base.allTrials
    .filter(({ trial }) => trial.record.subjectType === "agent")
    .map(({ familyId, trial }) =>
      qualityOf({
        runId: trial.runId,
        familyId,
        subjectId: normalizeSubjectId(trial.record.subjectId),
        providerFamily: (trial.record.model ?? "unknown").split("/")[0] ?? "unknown",
        state: base.evidenceState.get(trial.runId) ?? "not-run",
        submissionFiles: trial.submissionFiles,
        // The graded artifact specifically. Line counts and rule citations describe the
        // implementation; reading a checker the model happened to ship beside it would describe
        // something else under the same column heading.
        source: readIfPresent(join(trial.path, "submission", "subject.mjs")),
        transcript: readIfPresent(join(trial.path, "transcript.txt")),
        ruleCodes: BUILT_FAMILY_IDS.includes(familyId) ? builtFamily(familyId).ruleCodes : [],
        scenariosGraded: trial.record.cells.length,
        scenariosFailed: trial.record.cells.filter((c) => c.failed.length > 0).length,
        checksFailed: [...new Set(trial.record.cells.flatMap((c) => c.failed))],
        runtimeSeconds: trial.record.runtimeSeconds,
        costUsd: trial.record.costUsd,
        selfCheck: profiles.find((sp) => sp.runId === trial.runId) ?? null,
      }),
    );
}

/**
 * Per-subject failure sets for one family, from COUNTED trials only.
 *
 * A superseded run measures a task that no longer exists. Letting one into a chain would either
 * invent an incomparable pair or hide a real one, and both are wrong in the direction that flatters.
 */
export function subjectFailuresFor(
  root: string,
  familyId: string,
  evidenceState: ReadonlyMap<string, EvidenceState>,
) {
  const bySubject = new Map<string, { failed: Set<string>; providerFamily: string; graded: number }>();
  for (const trial of readFamilyTrials(join(root, "trials"), familyId)) {
    if (trial.record.subjectType !== "agent") continue;
    if ((evidenceState.get(trial.runId) ?? "not-run") !== "counted") continue;
    const id = normalizeSubjectId(trial.record.subjectId);
    const entry = bySubject.get(id) ?? {
      failed: new Set<string>(),
      providerFamily: (trial.record.model ?? "unknown").split("/")[0] ?? "unknown",
      graded: 0,
    };
    for (const cell of trial.record.cells) if (cell.failed.length > 0) entry.failed.add(cell.scenarioId);
    entry.graded += trial.record.cells.length;
    bySubject.set(id, entry);
  }
  return [...bySubject.entries()].map(([subjectId, v]) => ({
    subjectId,
    providerFamily: v.providerFamily,
    failed: v.failed as ReadonlySet<string>,
    graded: v.graded,
  }));
}
