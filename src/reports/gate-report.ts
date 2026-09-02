// The gate table itself, documented from the code that enforces it.
//
// `ship-recommendation.md` answers "what is the verdict for each family". This report answers the
// prior question — "what are the gates, why does each one exist, and which of them has ever actually
// stopped anything" — and it is generated from `GATES` rather than written by hand, so a gate cannot
// exist in the code and be missing from the documentation.
//
// The last column is the one worth reading. A gate that has never failed for any family is not yet
// evidence of discipline; it may simply be a gate that cannot fail. Printing that column makes the
// difference visible instead of leaving every row looking equally load-bearing.
//
// That column was itself too narrow to do its job. "Never fired" required `failing.length === 0 &&
// na.length === 0`, so a gate that rejects nobody and reads `n/a` for even one family was excluded
// -- which is every evidence-backed gate in the table, including a blocking one whose verdict vector
// was identical to another blocking gate's. The condition is now `failing.length === 0` and the
// blocking members of that list are called out by name, because a blocking gate with a zero-fail
// record is the row a reader is most likely to credit and least able to check.

import type { Registry } from "../foundry/registry.js";
import type { TaskShape } from "../foundry/schema.js";
import {
  type FamilyEvidence,
  GATES,
  type HumanGateEvidence,
  type VerifierIntegrityEvidence,
  assessFamily,
} from "./ship-report.js";

export interface GateReportInput {
  readonly registry: Registry;
  readonly evidence: Readonly<Record<string, FamilyEvidence>>;
  readonly humanEvidence?: Readonly<Record<string, HumanGateEvidence>>;
  readonly verifierIntegrity?: Readonly<Record<string, VerifierIntegrityEvidence>>;
}

const esc = (s: string): string => s.replace(/\|/g, "\\|");

export function renderGateReport(input: GateReportInput): string {
  const shapes: readonly TaskShape[] = input.registry.shapes;
  const assessments = shapes.map((s) => ({
    shape: s,
    assessment: assessFamily(
      s,
      input.registry,
      input.evidence[s.familyId],
      input.humanEvidence?.[s.familyId],
      input.verifierIntegrity?.[s.familyId],
    ),
  }));

  const perGate = GATES.map((gate) => {
    const rows = assessments.map((a) => ({
      familyId: a.shape.familyId,
      result: a.assessment.results.find((r) => r.gate.id === gate.id),
    }));
    const failing = rows.filter((r) => r.result?.verdict === "fail").map((r) => r.familyId);
    const passing = rows.filter((r) => r.result?.verdict === "pass").map((r) => r.familyId);
    const na = rows.filter((r) => r.result?.verdict === "n/a").map((r) => r.familyId);
    return { gate, failing, passing, na };
  });

  const schemaEnforced = perGate.filter((g) => g.gate.schemaEnforced === true);
  const blocking = perGate.filter((g) => g.gate.blocking && g.gate.schemaEnforced !== true);
  const advisory = perGate.filter((g) => !g.gate.blocking);
  // Widened from `failing.length === 0 && na.length === 0`. The `na` clause meant a gate that
  // rejects nobody and reads `n/a` for even one family was left out of the list, which is exactly
  // the population the section exists to name: `mechanisms-exercised` passed eight families, failed
  // none and read n/a for ten, and never appeared here at all.
  const neverFired = perGate.filter((g) => g.failing.length === 0);
  const neverFiredBlocking = neverFired.filter((g) => g.gate.blocking && g.gate.schemaEnforced !== true);

  const table = (rows: typeof perGate): readonly string[] => [
    "| gate | question | pass | fail | n/a |",
    "|---|---|---:|---:|---:|",
    ...rows.map(
      (g) =>
        `| \`${g.gate.id}\` | ${esc(g.gate.question)} | ${g.passing.length} | ${g.failing.length} | ${g.na.length} |`,
    ),
  ];

  return [
    "# The ship gate",
    "",
    `${GATES.length} gates: **${blocking.length} blocking**, ${schemaEnforced.length} schema-enforced,`,
    `${advisory.length} advisory. A family ships when every blocking gate passes; there is no score, no`,
    "weighting and no override. This document is generated from the gate definitions themselves, so a",
    "gate that exists in the code cannot be missing here.",
    "",
    `The blocking count was advertised as ${blocking.length + schemaEnforced.length} until the schema-enforced gates were separated out.`,
    "They are real checks and they are not this table's work: the loader refuses a shape that would",
    "fail any of them, so they can never fire on anything the ship report can see.",
    "",
    "## Blocking",
    "",
    "A blocking gate is one whose absence means the family cannot produce trustworthy evidence at all.",
    "",
    ...table(blocking),
    "",
    "## Schema-enforced",
    "",
    "Enforced by `parseTaskShape` at load time. A shape that violates one of these cannot be parsed,",
    "so it never reaches the gate table — which is why they are counted separately rather than as",
    "blocking gates this report is checking. They are kept because deleting a check to correct a count",
    "would be the wrong repair.",
    "",
    ...table(schemaEnforced),
    "",
    "## Advisory",
    "",
    "An advisory gate is one where a reasonable author might disagree. Reported, never blocking.",
    "",
    ...table(advisory),
    "",
    "## Which gates have actually stopped something",
    "",
    "A gate that has never failed is not yet evidence of discipline — it may be a gate that cannot",
    "fail. These are the ones that currently reject at least one family:",
    "",
    "| gate | blocking | families it rejects | why the gate exists |",
    "|---|---|---|---|",
    ...perGate
      .filter((g) => g.failing.length > 0)
      .map(
        (g) =>
          `| \`${g.gate.id}\` | ${g.gate.schemaEnforced === true ? "schema-enforced" : g.gate.blocking ? "yes" : "no"} | ${g.failing.map((f) => `\`${f}\``).join(", ")} | ${esc(g.gate.rationale)} |`,
      ),
    "",
    neverFired.length === 0
      ? "Every gate rejects at least one family."
      : [
          `**${neverFired.length} of ${GATES.length} gate(s) reject nothing here:**`,
          `${neverFired.map((g) => `\`${g.gate.id}\``).join(", ")}.`,
          "",
          neverFiredBlocking.length === 0
            ? "None of them is blocking."
            : `**${neverFiredBlocking.length} of those are BLOCKING gates that have never failed for any family:** ${neverFiredBlocking
                .map((g) => `\`${g.gate.id}\``)
                .join(
                  ", ",
                )}. A blocking gate with a zero-fail record is the one row a reader is most likely to credit and least able to check.`,
          "",
          "That is not automatically a criticism — a gate on the reference contract should pass for every",
          "family that got as far as being written down. It is recorded so the table is not read as",
          "though every row were doing equal work. This list used to exclude any gate that read `n/a`",
          "for even one family, which hid every gate that passes some families and is undefined for the",
          "rest — the largest group of zero-fail gates in the table.",
        ].join("\n"),
    "",
    "## Every gate, in full",
    "",
    ...perGate.flatMap((g) => [
      `### \`${g.gate.id}\` — ${g.gate.schemaEnforced === true ? "**schema-enforced**" : g.gate.blocking ? "**blocking**" : "advisory"}`,
      "",
      `**${g.gate.question}**`,
      "",
      g.gate.rationale,
      "",
      "| family | verdict | detail |",
      "|---|---|---|",
      ...assessments.map((a) => {
        const r = a.assessment.results.find((x) => x.gate.id === g.gate.id);
        return `| \`${a.shape.familyId}\` | ${r?.verdict ?? "—"} | ${esc(r?.detail ?? "")} |`;
      }),
      "",
    ]),
    "## Verdicts",
    "",
    "| family | verdict | blocking failures |",
    "|---|---|---|",
    ...assessments.map(
      (a) =>
        `| \`${a.shape.familyId}\` | **${a.assessment.verdict}** | ${a.assessment.blockingFailures.map((f) => `\`${f}\``).join(", ") || "none"} |`,
    ),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
