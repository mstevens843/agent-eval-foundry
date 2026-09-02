// Rendering a finding so that dismissing it is as cheap as acting on it.
//
// Precision is roughly one in two. That is fine for a screen and fatal for a screen whose output is
// expensive to read, so the format is built around the dismissal: every finding shows the hidden
// line that makes the commitment AND the visible lines that came closest to stating it, side by
// side. A reader who can see both decides in seconds. A reader who has to go and grep for the
// visible side will stop reading the report by the third family.

import type { Finding, ProbeResult } from "./types.js";

const MARK: Readonly<Record<string, string>> = { high: "!!", medium: "! ", low: "  " };

function renderFinding(finding: Finding, index: number): string {
  const lines: string[] = [];
  lines.push(`### ${index}. ${MARK[finding.severity] ?? ""} \`${finding.detector}\` — ${finding.severity}`);
  lines.push("");
  lines.push(finding.requirement);
  lines.push("");
  lines.push(`- **hidden** \`${finding.hidden.path}:${finding.hidden.line}\``);
  lines.push(`  \`\`\`\n  ${finding.hidden.text}\n  \`\`\``);
  if (finding.contradiction !== undefined) {
    lines.push(
      `- **visible text pointing the OTHER WAY** \`${finding.contradiction.path}:${finding.contradiction.line}\``,
    );
    lines.push(`  > ${finding.contradiction.text}`);
    lines.push(
      "  This is worse than silence. The subject was entitled to rely on that sentence, and the grader punishes it for doing so.",
    );
  }
  if (finding.nearest.length > 0) {
    lines.push(
      "- **closest visible text** (if one of these states the rule, this finding is a false positive):",
    );
    for (const ref of finding.nearest) lines.push(`  - \`${ref.path}:${ref.line}\` — ${ref.text}`);
  } else {
    lines.push("- **closest visible text**: none. The package does not mention this at all.");
  }
  return lines.join("\n");
}

export function renderProbeReport(result: ProbeResult): string {
  const extracted = result.cleared + result.findings.length;
  const high = result.findings.filter((f) => f.severity === "high").length;
  const out: string[] = [];
  out.push(`## ${result.id}`);
  out.push("");
  if (extracted === 0) {
    out.push(
      "**No commitments extracted.** The probe read the hidden files and found nothing it knows how to " +
        "check. That is a broken invocation or an unsupported grader shape — it is NOT a clean package, " +
        "and it must not be recorded as one.",
    );
    return out.join("\n");
  }
  out.push(
    `${result.findings.length} finding(s), ${high} at high severity, over ${extracted} commitment(s) ` +
      `extracted from ${result.scanned.hidden} hidden file(s) and checked against ${result.scanned.visible} visible file(s). ` +
      `${result.cleared} commitment(s) were found stated and cleared.`,
  );
  out.push("");
  if (result.findings.length === 0) {
    out.push("Every commitment the probe could extract is stated somewhere the subject can read.");
    return out.join("\n");
  }
  result.findings.forEach((f, i) => {
    out.push(renderFinding(f, i + 1));
    out.push("");
  });
  return out.join("\n");
}

/** One table across a whole portfolio, for deciding where to look first. */
export function renderSweep(results: readonly ProbeResult[]): string {
  const out: string[] = [];
  out.push("| family | high | medium | low | cleared | verdict |");
  out.push("|---|---:|---:|---:|---:|---|");
  for (const r of results) {
    const count = (s: string) => r.findings.filter((f) => f.severity === s).length;
    const extracted = r.cleared + r.findings.length;
    const verdict =
      extracted === 0
        ? "**no commitments extracted — probe blind here, not clean**"
        : count("high") > 0
          ? "**blocked**"
          : r.findings.length > 0
            ? "advisory only"
            : "clear";
    out.push(
      `| \`${r.id}\` | ${count("high")} | ${count("medium")} | ${count("low")} | ${r.cleared} | ${verdict} |`,
    );
  }
  return out.join("\n");
}
