import { join } from "node:path";
import type { FindingRevision, LearningView } from "./findings.js";
import type { EvidencePointer, TrialView } from "./inspection.js";

/** Untrusted text is always inert Markdown text, never an HTML block, image, link or terminal control. */
export function evidenceText(value: unknown): string {
  return inertText(String(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}\[\]()#!|])/g, "\\$1");
}
function inertText(value: string): string {
  return [...value]
    .filter((c) => {
      const n = c.charCodeAt(0);
      return (
        n === 9 ||
        n === 10 ||
        (n >= 32 && n !== 127 && n !== 155 && !(n >= 0x202a && n <= 0x202e) && !(n >= 0x2066 && n <= 0x2069))
      );
    })
    .join("");
}
export function evidenceLink(directory: string, p: EvidencePointer): string {
  const path = join(directory, p.path).split("/").map(encodeURIComponent).join("/");
  const line = /^line:(\d+)/.exec(p.locator)?.[1];
  return `[${evidenceText(`${p.path}${p.locator ? ` ${p.locator}` : ""}`)}](<${path}${line ? `:${line}` : ""}>)`;
}
export function renderTrial(view: TrialView): string {
  const link = (p: EvidencePointer) => evidenceLink(view.directory, p);
  const fileLink = (path: string) => {
    const f = view.files.find((f) => f.path === path);
    return f ? link({ ...f, locator: "" }) : `${path}: unavailable`;
  };
  return [
    `# Trial ${evidenceText(view.runId)}`,
    "",
    "Read-only preserved evidence. No replay, regrade, provider call or private reasoning inference.",
    "",
    `Source snapshot: ${view.sourceDigest}. Format: ${view.kind}.`,
    "",
    `Observed status: ${evidenceText(view.observation.status)}; reward: ${view.observation.reward ?? "unknown"}; failed scenarios: ${view.observation.failedScenarios}.`,
    "",
    `Current adjudication: ${evidenceText(view.adjudication.label)} (${evidenceText(view.adjudication.labelledBy.kind)}; not certified human review).`,
    "",
    `Capability support: ${view.eligibility.capability}; exact target support: ${view.eligibility.exactTarget}.`,
    "",
    `Blockers: ${view.eligibility.blockers.map(evidenceText).join(", ") || "none"}.`,
    "",
    "## Identity and raw records",
    "",
    ...Object.entries(view.identity).map(
      ([k, v]) => `${evidenceText(k)}: ${evidenceText(JSON.stringify(v))}\n`,
    ),
    [
      "result.json",
      "metadata.json",
      "verifier-output.json",
      "grade.json",
      "root-cause.json",
      "capture.json",
      "profile.json",
      "transcript.txt",
      "events.jsonl",
    ]
      .map(fileLink)
      .join("\n\n"),
    "",
    "## Failed obligations and navigation links",
    "",
    "Code/contract/checker links below are keyword suggestions, not causal proofs. Cells are historical grader observations; missing raw external witnesses are not reconstructed as fact.",
    "",
    ...view.failures.flatMap((f) => [
      `### ${evidenceText(f.check)} — ${evidenceText(f.scenarioId)}`,
      "",
      `Graded observation: ${link(f.observation)}`,
      "",
      `Independent witnesses: ${f.witnesses.map(link).join(", ") || "not retained/mapped"}`,
      "",
      `Submitted code candidates: ${f.submittedCode.map(link).join(", ") || "unmapped"}`,
      "",
      `Visible clause candidates: ${f.visibleClauses.map(link).join(", ") || "unmapped"}`,
      "",
      `Checking candidates: ${f.checking.map(link).join(", ") || "unmapped"}`,
      "",
      ...f.missing.map((m) => `${evidenceText(m)}\n`),
    ]),
    "## Visible checking source",
    "",
    "Source presence is observed. Executing that source and checker adequacy are separate questions. Inline scripts can appear twice when a log records both command start and completion.",
    "",
    ...view.checkers.flatMap((c) => [
      `### ${evidenceText(c.name)}`,
      "",
      `Source: ${link(c.origin)}; extracted SHA256 ${c.sha256}; adequacy: not assessed.`,
      "",
      ...c.source.split("\n").map((line) => `    ${inertText(line)}`),
      "",
    ]),
    "## Timeline",
    "",
    "Order is transcript record order, not inferred wall-clock ordering. Statements are self-report; command output is logged behavior, not independent grader truth. Unparsed lines remain unclassified. Long previews are clipped; full bytes remain linked.",
    "",
    ...view.timeline.flatMap((e) => [
      `${e.order + 1}. ${e.kind}, ${e.basis}, ${evidenceText(e.timestamp ?? "time unrecorded")}, ${link(e.source)}${e.truncated ? " — preview clipped" : ""}`,
      "",
      ...e.text.split("\n").map((line) => `    ${inertText(line)}`),
      "",
    ]),
    "## Missingness",
    "",
    ...view.missing.map((m) => `- ${evidenceText(m)}`),
    "",
    "## Artifact index",
    "",
    ...view.files.map((f) => `- ${link({ ...f, locator: "" })} — ${f.size} bytes — ${f.sha256}`),
    "",
  ].join("\n");
}
export function renderFinding(finding: FindingRevision, assessment: LearningView, root = "."): string {
  return [
    `# Finding ${evidenceText(finding.findingId)}`,
    "",
    `Revision ${finding.revision}, ${finding.digest}. Assessment ${assessment.digest}.`,
    "",
    "Generated claims derive from source/status dependencies. Original trials and dissent are unchanged. Human review is not inferred from an author field.",
    "",
    ...finding.claims.flatMap((c) => {
      const a = assessment.claims.find((a) => a.findingId === finding.findingId && a.claimId === c.id);
      return [
        `## ${evidenceText(c.id)}`,
        "",
        evidenceText(c.statement),
        "",
        `Declared: ${c.status}; effective: ${a?.effectiveStatus ?? "unavailable"}; capability: ${a?.capabilitySupport ?? false}; exact-target: ${a?.exactTargetSupport ?? false}.`,
        "",
        `Observation: ${evidenceText(c.observedOutcome)}`,
        "",
        `What worked: ${c.whatWorked.map(evidenceText).join(" ")}`,
        "",
        `Visible checks: ${c.visibleChecking.map(evidenceText).join(" ")}`,
        "",
        `Mechanism (${c.mechanism.basis}): ${evidenceText(c.mechanism.interpretation)}`,
        "",
        `Competing explanations: ${c.mechanism.alternatives.map(evidenceText).join(" ")}`,
        "",
        `Counterevidence: ${c.counterevidence.map(evidenceText).join(" ")}`,
        "",
        `Sources: ${c.sources.map(evidenceText).join(", ")}`,
        "",
        `Promotion conditions: ${c.promotionConditions.map(evidenceText).join(" ")}`,
        "",
        `Withdrawal conditions: ${c.withdrawalConditions.map(evidenceText).join(" ")}`,
        "",
        `Assessment reasons: ${a?.reasons.map(evidenceText).join(", ") || "none"}`,
        "",
      ];
    }),
    "## Source navigation",
    "",
    ...finding.sources.flatMap((s) => [
      `### ${evidenceText(s.id)}`,
      "",
      `Source digest: ${s.sourceDigest}; package: ${s.packageDigest ?? "historical incomplete identity"}.`,
      "",
      ...s.pointers.map((p) => `${evidenceLink(join(root, s.directory), p)}\n`),
    ]),
    "## Corrections",
    "",
    ...finding.corrections.map(
      (c) =>
        `- Earlier: ${evidenceText(c.previousClaim)} Correction: ${evidenceText(c.correction)} Sources: ${c.sources.map(evidenceText).join(", ")}`,
    ),
    "",
  ].join("\n");
}
