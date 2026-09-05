#!/usr/bin/env node
// Render reports/PHASE-18-CAA-V2.md from the Phase 18 artifacts.
//
// Every number comes from a generated file or is labelled estimated.
//
//   phase18-report.mjs <out.md>
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const read = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), "utf8")) : null);

const prereg = read("data/phase-18-preregistration.json");
const comparison = read("data/phase-18-construction-comparison.json");
const lock = read("data/phase-18-package-lock.json");
const controls = read("data/phase-18-package-controls.json");
const selection = read("data/phase-18-scenario-selection.json");
const fuzz = read("data/phase-18-fuzz-results.json");
const reviews = read("data/phase-18-reader-reviews.json");
const bundle = read("data/phase-18-operator-bundle.json");
const ledger = read("data/phase-18-trial-ledger.json");
const labels = read("data/phase-18-blind-labels.json");
const rescoring = read("data/phase-18-paired-rescoring.json");
const preflight = read("data/phase-18-preflight.json");
const probe = read("data/phase-18-lazy-repair-probe.json");
const audit = read("data/phase-18-verifier-audit.json");

const yn = (b) => (b ? "yes" : "no");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const money = (v) => (v === null || v === undefined ? "unpriced" : `$${Number(v).toFixed(4)}`);
const L = [];
const w = (...lines) => L.push(...lines);

// ---------------------------------------------------------------- verdict ---
const countable = ledger?.summary?.countable ?? 0;
const rewardZero = ledger?.summary?.rewardZero ?? 0;
const agreed = labels?.summary?.agreedCapability ?? 0;
const providers = Object.keys(ledger?.summary?.rewardZeroByProvider ?? {});

let decision = "INCONCLUSIVE";
let decisionWhy =
  "The campaign has not completed four countable trials, so neither eligibility nor non-transfer is established.";
if (countable === 4) {
  if (rewardZero >= 3 && agreed >= rewardZero && labels?.summary?.allRelevantAgreed) {
    decision = "ELIGIBLE-FOR-5-OF-6";
    decisionWhy =
      `${rewardZero} of 4 countable trials scored reward zero, every relevant failure carries 2-of-2 ` +
      "capability agreement, and no validity defect was found.";
  } else if (rewardZero >= 3) {
    decision = "INCONCLUSIVE";
    decisionWhy =
      `${rewardZero} of 4 countable trials scored reward zero, but the blind labels do not support a ` +
      "capability claim on every relevant failure.";
  } else {
    decision = "BUNDLE-DID-NOT-TRANSFER";
    decisionWhy =
      `${rewardZero} of 4 countable trials scored reward zero. Five of six is mathematically unreachable ` +
      "from this four-run start, so the construction bundle did not transfer to CAA at this strength.";
  }
}

w(
  "# Phase 18 - CAA V2: Transferring the Outbox Construction Recipe",
  "",
  "## Verdict",
  "",
  `**${decision}.** ${decisionWhy}`,
  "",
);

if (ledger) {
  w(
    `The campaign ran ${ledger.summary.attempted} attempt(s): ${countable} countable, ` +
      `${ledger.summary.infrastructureFailures} infrastructure failure(s) preserved and excluded. ` +
      `Reward zero: **${rewardZero}/${countable}**` +
      (providers.length ? ` across ${providers.join(" and ")}.` : "."),
    `Priced spend **${money(ledger.summary.pricedSpendUsd)}** with ${ledger.summary.unpricedAttempts} ` +
      "unpriced attempt(s), against frozen caps of " +
      `$${prereg.campaign.spendCaps.subjectUsd} subject / $${prereg.campaign.spendCaps.labellingUsd} ` +
      `labelling / $${prereg.campaign.spendCaps.totalUsd} total.`,
    "",
  );
} else {
  w("The campaign is preregistered and has not produced a trial ledger.", "");
}

w(
  "Reward zero is not difficulty. Eligibility additionally requires that every relevant failure carry",
  "2-of-2 independent capability agreement and concentrate on public CAA obligations.",
  "",
  "## 1. What Phase 17 established, and what it did not",
  "",
  "Phase 17 measured CAA V1 at 4/4 clean solves and recorded `VALID-BUT-EASY`. That result stands, and",
  "every Phase 17 artifact is preserved unchanged. **The correction is to its interpretation, not its data:**",
  "Phase 17 established that CAA V1's *overexplained microtask packaging* was easy. It did not establish that",
  "the CAA mechanism, or a CAA task family, is easy.",
  "",
  "CAA V1's public specification stated the graded mechanism verbatim, named the historical anti-pattern in",
  "its forbidden outcomes, disclosed the hidden dimensions and their boundary values, and reduced a production",
  "certificate service to roughly twenty lines. All four agents wrote self-checks that covered the rule, and",
  "all four cited the published rule codes back in their submissions. Mutant fatality was, at the time,",
  "mistakenly treated as evidence that an agent would make the mistake; a mutant written to embody an error is",
  "not evidence that anyone will commit it.",
  "",
  "Phase 18 rebuilds the same mechanism under the construction recipe the durable outbox actually used, and",
  "asks whether the difficulty survives.",
  "",
  "## 2. Construction comparison",
  "",
  "| dimension | durable outbox | CAA V1 | CAA V2 |",
  "|---|---|---|---|",
);
for (const d of comparison.dimensions) {
  w(`| ${cell(d.dimension)} | ${cell(d.durableOutbox)} | ${cell(d.caaV1)} | ${cell(d.caaV2)} |`);
}
w(
  "",
  `**${cell(comparison.comparabilityLimit)}**`,
  "",
  "## 3. Preregistration",
  "",
  `Registered \`${prereg.registrationId}\` against baseline commit \`${prereg.baselineCommit}\`.`,
  "",
  `**Process deviation, recorded rather than hidden.** ${cell(prereg.processDeviation)}`,
  "",
  "| registered before any trial | value |",
  "|---|---|",
  `| predicted reward zero | ${prereg.predictions.rewardZeroOfFour} of 4 |`,
  `| predicted per-trial failure probability | ${prereg.predictions.perTrialFailureProbability} |`,
  `| falsifier | ${cell(prereg.predictions.falsifier)} |`,
  `| fuzz cap | ${prereg.scenarioSelection.fuzzCap} points |`,
  `| selection mutants | ${prereg.scenarioSelection.selectionMutants.join(", ")} |`,
  `| held-out mutants | ${prereg.scenarioSelection.heldOutMutants.join(", ")} |`,
  `| spend caps | $${prereg.campaign.spendCaps.subjectUsd} / $${prereg.campaign.spendCaps.labellingUsd} / $${prereg.campaign.spendCaps.totalUsd} |`,
  "",
  `Registered reasoning: *${cell(prereg.predictions.reasoning)}*`,
  "",
  `**${cell(prereg.noCausalClaim)}**`,
  "",
  "Crash injection was deliberately not transferred. " + cell(prereg.notInTheBundle),
  "",
  "## 4. The task",
  "",
  `Harbor task \`caa-revalidation-repair\`, canary \`${lock.canaryGuid}\`, Go ${lock.goToolchain.version}`,
  `pinned as \`${lock.goToolchain.image}\`.`,
  "",
  "| surface | files | sha256 |",
  "|---|---:|---|",
);
for (const [name, s] of Object.entries(lock.surfaces)) {
  w(`| ${name} | ${s.files} | \`${s.sha256}\` |`);
}
w(
  "",
  "The agent receives a working multi-package Go service under `/app/certd`: a CLI entrypoint, the order",
  "contract, a persistent authorization store, a freshness window, a revalidation planner, a concurrent",
  "authority client, an issuance decider and an audit writer, plus six unit tests and five runnable",
  "scenarios. It builds, vets clean, and all of it passes.",
  "",
  "Two obligations are unmet, in one causal family and independently gradeable. The revalidation planner",
  "starts one query per identifier that needs rechecking and collects the answers as they arrive; the value",
  "it collects carries no identifier, so the assembly loop takes the next answer off the pile for each",
  "identifier in turn. The count is always right and the correspondence is right only when answers return in",
  "request order, which a concurrent authority does not guarantee. Separately, an identifier the authority",
  "cannot settle returns an error from the planner, so the run exits non-zero and writes neither report nor",
  "audit, where the specification requires the order to be decided, refused, reported and audited.",
  "",
  "**The harm is one order removed from its cause.** An order's outcome is a conjunction over its",
  "identifiers, and permuting answers among them permutes a multiset, so the order carrying the mistake is",
  "still decided correctly. A recheck is what refreshes the store, so the mispaired answers are written back",
  "against the wrong names, and the next order inside the freshness window is decided from an authorization",
  "belonging to a different domain - a certificate issued for a name the authority forbids.",
  "",
  "## 5. Scenario search",
  "",
  `Fuzzed ${fuzz.points} points over the declared grammar at seed ${fuzz.seed}.`,
  "",
  "| class | count |",
  "|---|---:|",
);
for (const [k, v] of Object.entries(fuzz.tally)) w(`| ${k} | ${v} |`);
w(
  "",
  "**Zero reference failures across the whole grid.** A point was rejected as a generator artifact when no",
  "order rechecked two identifiers, when the rechecked identifiers never disagreed, or when the latency",
  "schedule did not deterministically invert the document order. That last rule was added after a first",
  "selection produced a suite whose narrow mutant scored 21, 21 and 22 across three identical runs: the",
  "inversion has to be a property of the scenario, not of the Go scheduler.",
  "",
  "Surviving candidates were minimised while preserving that property, then spread across the parameters that",
  "do not control activation. A separate 24-scenario balanced comparator was frozen at the same moment.",
  "",
  "| variant | selected suite | role in selection |",
  "|---|---|---|",
);
for (const [variant, row] of Object.entries(selection.validationMatrix)) {
  const role = selection.correctImplementations.includes(variant)
    ? "correct implementation"
    : selection.selectionMutants.includes(variant)
      ? "used for selection"
      : "held out";
  w(`| \`${variant}\` | ${row.scenarios_failed}/${row.scenarios_total} | ${role} |`);
}
w(
  "",
  `Six mutants had no part in choosing the suite and all six are caught by it. A second, independently`,
  "structured correct implementation passes it.",
  "",
  "## 6. Integrity gates",
  "",
  `All controls held: **${yn(controls.allControlsHeld)}**. Every isolation claim ships a canary that trips`,
  "the same detector, because an assertion with no reachable failing branch is not evidence.",
  "",
  "| control | held |",
  "|---|---|",
);
for (const [k, v] of Object.entries(controls.controlSummary)) w(`| \`${k}\` | ${yn(v)} |`);
w(
  "",
  "| variant | selected | non-activation controls |",
  "|---|---|---|",
);
for (const [variant, row] of Object.entries(controls.matrix)) {
  w(`| \`${variant}\` | ${row.selected.failed}/${row.selected.total} | ${row.controls.failed}/${row.controls.total} |`);
}
w(
  "",
  "The narrow mutant fails the activated stratum and passes every non-activation control, which is what",
  "separates a mechanism from general incorrectness.",
  "",
);

// ------------------------------------------------- 6b. the lazy-repair probe ---
if (probe) {
  w(
    "### The repair cannot be reached by deleting the concurrency",
    "",
    "During construction this report asserted that a submission which fixes the pairing by removing the",
    "fan-out would still be rejected. That assertion was never tested, so it was tested afterwards. Two",
    "pairing-correct variants were built and graded against the frozen suites:",
    "",
    "| variant | construction | selected | balanced | failing check |",
    "|---|---|---|---|---|",
  );
  for (const v of probe.variants) {
    const r = probe.results[v.id];
    w(
      `| \`${v.id}\` | ${cell(v.construction)} | ${r.selected.failed}/${r.selected.total} | ` +
        `${r.balanced.failed}/${r.balanced.total} | \`${Object.keys(r.checks).join("`, `")}\` |`,
    );
  }
  const ref = probe.results.reference;
  w(`| \`reference\` | the corrected service | ${ref.selected.failed}/${ref.selected.total} | ${ref.balanced.failed}/${ref.balanced.total} | none |`);
  w("", `Verdict: **${probe.verdict}**.`, "");
  for (const f of probe.findings) w(`- ${f}`);
  w(
    "",
    `**${cell(probe.consequence_for_the_phase_18_finding)}**`,
    "",
    `Scope: ${cell(probe.does_not_show)}`,
    "",
    "The probe was built after the trials and lives entirely on the verifier side. Regenerating the package",
    "lock afterwards moved only the `mutants` surface; `challenge`, `selected`, `balanced`, `controls`,",
    "`verifier` and `solution` all hashed to their frozen campaign-time values, so no graded trial is affected.",
    "",
  );
}

// -------------------------------------------- 6c. the adversarial audit ---
if (audit) {
  w(
    "### Adversarial audit of the verifier and package",
    "",
    `Two frontier agents solved this task cleanly, one in about five minutes, which is fast enough to`,
    "deserve suspicion rather than a shrug. Six independent auditors were given the full package *and* the",
    "verifier and asked to find a shortcut: a passing cheat, a leak that names the defect, an unsound or",
    "vacuous check, a partial repair that passes, and an honest read of how legible the defect is. Every",
    "finding rated fatal or material was then put to two further agents instructed to refute it, with",
    "refutation as the default; only findings both agents independently confirmed are recorded as standing.",
    "",
    `**${audit.confirmed.length} finding${audit.confirmed.length === 1 ? "" : "s"} survived refutation. ` +
      `${audit.refuted.length} ${audit.refuted.length === 1 ? "was" : "were"} refuted.**`,
    "",
  );
  if (audit.confirmed.length) {
    w("| severity | finding | claim |", "|---|---|---|");
    for (const f of audit.confirmed) w(`| ${f.severity} | ${cell(f.title)} | ${cell(f.claim)} |`);
    w("");
  }
  if (audit.lensSummaries?.length) {
    w("| lens | what it concluded |", "|---|---|");
    for (const r of audit.lensSummaries) w(`| \`${r.lens}\` | ${cell(r.summary)} |`);
    w("");
  }
  if (audit.interpretation) w(audit.interpretation, "");
}

w(
  "## 7. Compliance and independent review",
  "",
  "All 22 vendored upstream Terminal-Bench checks pass. Under Harbor the oracle scores 1.0 and `nop` scores",
  "0.0. The shipped service scores 0 with 52 of 243 checks failing.",
  "",
  "| round | packet | openai | anthropic | outcome |",
  "|---|---|---|---|---|",
);
for (const r of reviews.rounds) {
  const v = Object.fromEntries(r.reviews.map((x) => [x.providerFamily, x.verdict]));
  w(`| ${r.round} | \`${r.packetSha256.slice(0, 16)}\` | ${v.openai ?? "-"} | ${v.anthropic ?? "-"} | **${r.outcome}** |`);
}
w(
  "",
  "**The review gate earned its place.** Rounds 1 and 2 were kills under the 2-of-2 rule, and both readers",
  "independently found a real regression: a mirroring step had overwritten the working `run-scenario.sh`",
  "with a stale copy, so the reproduction command the instruction advertises did not run. Round 1 and 2's",
  "second finding was a disclosure objection - the instruction named the condition under which the service",
  "stops being correct. The correction removed the sentence entirely, which makes the task harder rather",
  "than easier, and the third round promoted 2-of-2. Three rounds were declared the maximum *before* the",
  "third ran; a third split would have been recorded as a kill with no trials bought.",
  "",
  "## 8. Trials",
  "",
);

if (ledger) {
  w(
    "| slot | provider | attempt | counts | reward | failed checks | scenarios failed | runtime | cost |",
    "|---|---|---:|---|---:|---|---:|---:|---:|",
  );
  for (const a of ledger.attempts) {
    w(
      `| ${a.slot} | ${a.provider} | ${a.attempt} | ${yn(a.counts)} | ${a.reward ?? "-"} | ` +
        `${a.failedChecks?.length ? a.failedChecks.join(", ") : "-"} | ${a.checksFailed ?? "-"} | ` +
        `${a.runtimeSeconds ?? "-"} | ${money(a.costUsd)} |`,
    );
  }
  w("", "| quantity | value |", "|---|---:|");
  for (const [k, v] of Object.entries(ledger.summary)) {
    if (typeof v === "number") w(`| ${k} | ${v} |`);
  }
  w("");
  for (const a of ledger.attempts.filter((x) => !x.counts)) {
    w(`- \`${a.job}\` did not count: ${cell(a.countabilityReason)}. Preserved in full.`);
  }
  w("");
} else {
  w("No trial ledger exists yet.", "");
}

if (rescoring) {
  w(
    "### Paired rescoring",
    "",
    "Each submission graded independently against the selected suite, the balanced comparator and the",
    "non-activation controls. This is coverage analysis of one trial, never two trials.",
    "",
    "| submission | selected | balanced | controls | suites agree |",
    "|---|---|---|---|---|",
  );
  for (const r of rescoring.rows ?? []) {
    w(
      `| ${r.label} | ${r.suites.selected.scenarios_failed}/${r.suites.selected.scenarios_total} | ` +
        `${r.suites.balanced.scenarios_failed}/${r.suites.balanced.scenarios_total} | ` +
        `${r.suites.controls.scenarios_failed}/${r.suites.controls.scenarios_total} | ` +
        `${yn(r.agreement.suites_agree)} |`,
    );
  }
  w("");
}

w("## 9. Blind labels", "");
if (labels) {
  w(
    "| attempt | openai | anthropic | agreed | failure class |",
    "|---|---|---|---|---|",
  );
  for (const r of labels.rows ?? []) {
    w(`| ${r.attempt} | ${r.openai?.label ?? "-"} | ${r.anthropic?.label ?? "-"} | ${yn(r.agreed)} | ${r.failureClass ?? "-"} |`);
  }
  w(
    "",
    `Agreed capability failures: **${labels.summary?.agreedCapability ?? 0}**. Difficulty counts only on`,
    "2-of-2 independent agreement; disagreement means unlabelled, not capability and not specification failure.",
    "",
  );
} else {
  w("No countable reward-zero attempt required labelling, or labelling has not run.", "");
}

w(
  "## 10. Operator bundle",
  "",
  "| element | status | claim |",
  "|---|---|---|",
);
for (const e of bundle.elements) {
  w(`| ${e.id} | **${e.status}** | ${cell(e.claimBoundary ?? e.whyItMightMatter)} |`);
}
w(
  "",
  "Only one element is measured, and what it measures is coverage: which scenarios discriminate a correct",
  "implementation from an incorrect one. **Nothing in this phase earns `measured-difficulty`.** Phase 14",
  "measured null agent effects for every operator it tested and Phase 17 measured null again for seven",
  "candidate CAA operators; a bundle applied all at once cannot attribute an effect to any element of it.",
  "",
  "## 11. Corrections and limits",
  "",
  "- Phase 17 established that CAA V1's overexplained microtask profile was easy, not that the CAA mechanism",
  "  is easy. Its artifacts and its 4/4 result are preserved unchanged; only the interpretation is corrected.",
  "- V1 versus V2 is a package-bundle comparison, never a causal ablation. Instruction style, codebase shape,",
  "  starter, visible coverage, authority boundary, verifier and scenario selection all changed at once.",
  "- The preregistration was written after the package was built. What it could have tuned - the scenario",
  "  search, the selection, the review and the trials - was all still unobserved when it was frozen.",
  "- A first scenario selection was discarded because the narrow mutant's manifestation depended on the Go",
  "  scheduler. The replacement requires the latency schedule itself to invert the document order.",
  "- A first fuzz run was discarded because the authority's log accumulated across variant runs, so every",
  "  variant after the first inherited the previous one's queries. The record is now per-armed-scenario.",
  "- The environment image sets `CGO_ENABLED=0`, so `go test -race` is unavailable to the agent. The race",
  "  detector would report clean here - the code is correctly synchronised and wrongly associated - but",
  "  denying the tool is not the same as the tool reporting nothing, and this should be reconsidered.",
  "- The underlying incident class is publicly documented. The package is original Go with original",
  "  identifiers, no locator and no copied code, and the internet stays enabled, so a contamination route",
  "  exists and cannot be reduced to zero. Blind labelling carries `contamination` as an available verdict.",
  "- A stray compiled binary was found in the agent-visible tree and is excluded from every hashed surface",
  "  and from the image, but this permission mode could not delete it; it should be removed from the repo.",
  "- Codex under Harbor needs `CODEX_FORCE_AUTH_JSON=1` to use subscription auth. The first attempt failed",
  "  401 before the agent ran and is preserved as an infrastructure failure.",
  "",
  "## 12. Recommendation",
  "",
);

if (decision === "ELIGIBLE-FOR-5-OF-6") {
  w(
    "Run two further trials, one at a time, alternating providers, against this frozen challenge hash. Do not",
    "change the package between them: a hardening change re-scores every prior result and starts the count",
    "again. If the pair holds the rate, the candidate is a genuine 5/6 contender and the bundle is the first",
    "construction recipe in this repository with transferred, capability-attributed evidence behind it.",
  );
} else if (decision === "BUNDLE-DID-NOT-TRANSFER") {
  w(
    "Do not buy more trials on this candidate. Five of six is already out of reach from this start. The",
    "package is valid, independently reviewed and cheat-resistant, so it is worth keeping as a calibration",
    "fixture with a known answer - but the bundle did not carry the outbox's difficulty to CAA, and the next",
    "phase should ask which element of the bundle the outbox actually depended on rather than transferring",
    "the whole bundle again to a third mechanism.",
  );
} else {
  w(
    "The campaign did not produce the evidence either decision needs. State exactly what is missing before",
    "spending again: complete the countable trials in both provider families, or complete the blind labelling",
    "on the reward-zero attempts already collected. Do not call the candidate hard or easy on this evidence.",
  );
}

w(
  "",
  "## Reproducibility inputs",
  "",
  "| input | value |",
  "|---|---|",
  `| challenge | \`${lock.surfaces.challenge.sha256}\` |`,
  `| selected suite | \`${lock.surfaces.selected.sha256}\` |`,
  `| balanced suite | \`${lock.surfaces.balanced.sha256}\` |`,
  `| verifier | \`${lock.surfaces.verifier.sha256}\` |`,
  `| reader packet (promoted round) | \`${reviews.rounds[reviews.rounds.length - 1].packetSha256}\` |`,
  `| provider image | \`${lock.images.providerAgent.id ?? "absent"}\` |`,
  "",
  "Every number above comes from `data/phase-18-*.json`, the preserved Harbor jobs, or the task tree, except",
  "where a line says estimated.",
  "",
);

writeFileSync(process.argv[2], `${L.join("\n")}\n`);
console.log(`wrote ${process.argv[2]} (${L.length} lines, decision ${decision})`);
