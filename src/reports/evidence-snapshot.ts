// The per-family evidence snapshot, generated from the evidence maps the ship gate already reads.
//
// This report exists because the same table was maintained by hand in README.md, and a hand-typed
// table of measured numbers is a promise nobody can keep. By the time it was replaced it was wrong
// in more places than it was right: it claimed counted trials for families that have none, mutant
// axis counts that no sweep produces, five package hashes that no package hashes to any more, and
// two verdict labels — `SMOKE-EVIDENCED` and `PROVIDER-DELTA` — that no code in this repository
// emits for anything.
//
// So the rule this module encodes is narrow: every cell is a value read off `FamilyEvidence`,
// `HumanGateEvidence`, `VerifierIntegrityEvidence`, the `TaskShape` or the evidence ledger, and the
// verdict column is `assessFamily` itself. Nothing here recomputes evidence. If a number in this
// table is wrong, the evidence map is wrong and the ship report is wrong with it — which is the
// property the hand-typed table did not have, because it could be wrong on its own.
//
// The verdict vocabulary is deliberately exactly `ShipVerdict`. A snapshot that invents a friendlier
// label for a family the gate rejects is the defect the README had, moved somewhere newer.

import type { Registry } from "../foundry/registry.js";
import type { TaskShape } from "../foundry/schema.js";
import type { EvidenceLedger } from "../trials/evidence-lifecycle.js";
import type { ImportedHistory } from "../trials/history.js";
import { NEVER_COUNTS } from "../trials/types.js";
import {
  type FamilyEvidence,
  type HumanGateEvidence,
  type VerifierIntegrityEvidence,
  assessFamily,
} from "./ship-report.js";

export interface EvidenceSnapshotInput {
  readonly registry: Registry;
  readonly evidence: Readonly<Record<string, FamilyEvidence>>;
  readonly humanEvidence?: Readonly<Record<string, HumanGateEvidence>>;
  readonly verifierIntegrity?: Readonly<Record<string, VerifierIntegrityEvidence>>;
  /** Per-family evidence lifecycle, for current package hash and counted/superseded run ids. */
  readonly ledgers: readonly EvidenceLedger[];
  /** The imported historical bank, which is a different evidence stream from counted agent trials. */
  readonly importedOutbox?: ImportedHistory;
}

const DASH = "—";

const esc = (s: string): string => s.replace(/\|/g, "\\|");

/** Measured axes over the MUTANT bank — the same value the `measured-axes` gate reads. */
function mutantAxesCell(shape: TaskShape): string {
  if (shape.estimatedAxes === null) return DASH;
  return shape.dataQuality === "measured" ? String(shape.estimatedAxes) : `${shape.estimatedAxes} (est.)`;
}

/**
 * Agent-difficulty axes, which is not the mutant axis count and must never be printed as though it
 * were. `null` is the honest answer when fewer than two counted subjects have failed anything: the
 * README used to print `>=2` for three families where exactly one subject had failed.
 */
function agentAxesCell(evidence: FamilyEvidence | undefined): string {
  if (evidence === undefined) return DASH;
  if (evidence.agentAxes === undefined || evidence.agentAxes === null) {
    return "not measurable — fewer than 2 counted failing subjects";
  }
  return evidence.agentFailuresChain === true
    ? `${evidence.agentAxes} (failures nest — one axis at several sensitivities)`
    : String(evidence.agentAxes);
}

export function renderEvidenceSnapshotReport(input: EvidenceSnapshotInput): string {
  const shapes: readonly TaskShape[] = input.registry.shapes;
  const rows = shapes.map((shape) => {
    const evidence = input.evidence[shape.familyId];
    const human = input.humanEvidence?.[shape.familyId] ?? evidence;
    const adversarial = input.verifierIntegrity?.[shape.familyId] ?? evidence;
    const assessment = assessFamily(
      shape,
      input.registry,
      evidence,
      input.humanEvidence?.[shape.familyId],
      input.verifierIntegrity?.[shape.familyId],
    );
    const counted = evidence?.countedAgentTrials;
    const failed =
      evidence === undefined ? undefined : evidence.countedAgentTrials - evidence.agentTrialsPassed;
    return { shape, evidence, human, adversarial, assessment, counted, failed };
  });

  const ledgers = [...input.ledgers].sort((a, b) => a.familyId.localeCompare(b.familyId));
  const outbox = input.importedOutbox;
  const outboxCounted =
    outbox === undefined
      ? []
      : outbox.records.filter(
          (record) => record.subjectType === "agent" && record.counts && !NEVER_COUNTS.has(record.status),
        );
  const outboxFailed = outboxCounted.filter((record) =>
    record.cells.some((cell) => cell.failed.length > 0),
  ).length;

  const routing = rows.filter((row) => row.evidence?.productionMatrixReady !== undefined);

  return [
    "# Evidence snapshot",
    "",
    "One row per family in the registry. Every cell is read off the same evidence maps the ship gate",
    "reads — `familyEvidenceMapForShipReport`, the human and verifier-integrity gate maps, the task",
    "shape and the evidence ledger — and the verdict column is `assessFamily` itself, so a row here",
    "cannot disagree with `reports/ship-recommendation.md`. Nothing in this document is recomputed and",
    "nothing is typed by hand.",
    "",
    "Two columns are routinely confused and are kept apart. **measured axes** is over the MUTANT bank:",
    "how many independent defects the verifier is known to detect, bounded by how many known-bad",
    "implementations someone wrote. **agent axes** is over counted agent trials: how many directions",
    "real subjects actually fail in. A family can score nineteen of the first and none of the second.",
    "",
    "`counted trials` counts only agent trials that count — an agent subject, `counts: true`, and a",
    "status that is not a refusal, infrastructure error or other never-counting outcome — measured",
    "against the challenge package the family produces today. A trial run against a package that has",
    "since changed is superseded, preserved, and not in this column.",
    "",
    "## Snapshot",
    "",
    "| family | scenarios | counted trials | failed >=1 | capability-attributed | measured axes (mutant bank) | agent axes | human claim | verifier integrity | verdict |",
    "|---|---:|---:|---:|---:|---:|---|---|---|---|",
    ...rows.map((row) => {
      const scenarios = row.evidence?.mechanismScenarios;
      return [
        `| \`${row.shape.familyId}\``,
        scenarios === undefined ? "not built" : String(scenarios),
        row.counted === undefined ? DASH : String(row.counted),
        row.failed === undefined ? DASH : String(row.failed),
        row.evidence === undefined ? DASH : String(row.evidence.capabilityEvidencedTrials ?? 0),
        mutantAxesCell(row.shape),
        agentAxesCell(row.evidence),
        row.human?.humanClaimLevel ?? "reference-solvable",
        row.adversarial?.adversarialClaimLevel ?? "audit-pending",
        `**${row.assessment.verdict}**${
          row.assessment.blockingFailures.length === 0
            ? ""
            : `: ${row.assessment.blockingFailures.map((f) => `\`${f}\``).join(", ")}`
        } |`,
      ].join(" | ");
    }),
    "",
    "`not built` means the family is declared as a task shape and has no executable sweep, so it has",
    "no measured scenario count, no mutant run and no evidence of any kind beyond what it claims.",
    "The verdict for such a family is still real: a blocking gate that reads `n/a` does not pass.",
    "",
    "## Current challenge packages",
    "",
    "The hash a trial must carry to count. It is a pure function of the package the family produces",
    "now, so it moves whenever the package moves — which is exactly why it may not be transcribed",
    "anywhere by hand.",
    "",
    "| family | current package hash | counted | superseded |",
    "|---|---|---:|---:|",
    ...ledgers.map(
      (ledger) =>
        `| \`${ledger.familyId}\` | \`${ledger.currentHash}\` | ${ledger.counted.length} | ${ledger.superseded.length} |`,
    ),
    "",
    `Repo-wide across package-backed families: **${ledgers.reduce((n, l) => n + l.counted.length, 0)} counted**, ${ledgers.reduce((n, l) => n + l.superseded.length, 0)} superseded.`,
    "",
    ...(outbox === undefined
      ? []
      : [
          "## Imported historical evidence",
          "",
          `The \`${outbox.familyId}\` bank is imported from archived runs rather than executed here, so it is a`,
          "separate stream and never enters the counted-agent-trial column above. Full accounting, including",
          "why each excluded run is excluded, is in `reports/historical-durable-outbox-trials.md`.",
          "",
          "| | |",
          "|---|---:|",
          `| run directories parsed | ${outbox.runs.length} |`,
          `| counted | **${outboxCounted.length}** |`,
          `| of those, failed >=1 scenario | ${outboxFailed} |`,
          `| uncounted | ${outbox.uncounted} |`,
          `| excluded for running a different task | ${outbox.excludedForTask.length} |`,
          "",
        ]),
    ...(routing.length === 0
      ? []
      : [
          "## Production routing",
          "",
          "Families carrying a production-readiness layer. `mixed cross-lab smoke` is the computed state",
          "the README used to print as an invented `PROVIDER-DELTA` verdict; it is a routing fact, not a",
          "ship verdict, and the ship verdict for these families is in the table above.",
          "",
          "| family | production matrix | cross-lab smoke evidenced | mixed cross-lab smoke | provider-delta diagnosis | detail |",
          "|---|---|---|---|---|---|",
          ...routing.map((row) => {
            const e = row.evidence;
            const bool = (v: boolean | undefined): string => (v === undefined ? DASH : v ? "yes" : "no");
            return `| \`${row.shape.familyId}\` | ${bool(e?.productionMatrixReady)} | ${bool(e?.productionCrossLabSmokeEvidenced)} | ${bool(e?.productionMixedCrossLabSmoke)} | ${bool(e?.providerDeltaDiagnosisPresent)} | ${esc(e?.productionMatrixDetail ?? "")} |`;
          }),
          "",
        ]),
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
