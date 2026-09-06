// trials: extracted compatibility command services. Core APIs remain independent of dispatch.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toMatrix } from "../families/prompt-injection-containment/runner.js";
import { assertPackageStage } from "../packages/policy.js";
import { renderSharedBankReport } from "../reports/bank-report.js";
import {
  OUTBOX_FAMILY,
  PIC_FAMILY,
  countedAgentRecordsFor,
  familyEvidenceFor,
  outboxMatrix,
} from "../reports/evidence.js";
import { buildAgentBank } from "../trials/agent-bank.js";
import { computeOverlap } from "../trials/bank.js";
import { reconcile, runCampaign } from "../trials/campaign-run.js";
import {
  type CampaignPlan,
  assertCampaignSubcommand,
  loadCampaign,
  loadCampaigns,
  progressOf,
} from "../trials/campaign.js";
import { prepareProviderBundle, readImportedBundle } from "../trials/cross-provider.js";
import { readFamilyTrials, readTrialDirectory, writeTrialDirectory } from "../trials/directory.js";
import { importOutboxTrialDirectories } from "../trials/history.js";
import { scenarioSetId } from "../trials/orchestrate.js";
import { decideCountability } from "../trials/orchestrator.js";
import { PROVIDERS as PROVIDER_FAMILIES_LIST, checkAllProviders } from "../trials/provider-registry.js";
import { routeFor } from "../trials/router.js";
import { currentChallenge, gateByChallengeHash, runAgentTrial } from "../trials/run.js";
import { assertChallengeMatch, challengeHash, hashChallengeDir } from "../trials/run.js";
import { parseTrialRecord } from "../trials/validate.js";
import { flag, numeric, positional } from "./arguments.js";

/** Every model provider, with what can run locally and what is import-only. */
export function providersCommand(): string {
  const rows = checkAllProviders();
  return [
    "provider        family       state                 configured  model",
    ...rows.map(
      (r) =>
        `${r.provider.id.padEnd(16)}${r.provider.family.padEnd(13)}${r.state.padEnd(22)}${String(
          r.available,
        ).padEnd(12)}${r.provider.model}`,
    ),
    "",
    "details",
    ...rows.map((r) => `  ${r.provider.id}: ${r.detail}`),
    "",
    "Anthropic/Claude is import-only for this phase. Gemini remains entitlement-blocked unless a",
    "future authenticated run changes that. Codex/OpenAI is the only provider this phase may execute",
    "locally.",
    "",
  ].join("\n");
}

/**
 * Run one real agent trial end to end and write a durable directory.
 *
 * `--inherit-env` is the flag worth explaining. The sandbox environment is redacted by default,
 * because the SUBJECT is hostile — it should not receive this machine's credentials. But a provider
 * CLI is not the subject; it is trusted infrastructure that needs its own login. The first real trial
 * run through this layer died in two seconds with "Not logged in" for exactly this reason, and the
 * fix is a flag the caller sets deliberately rather than a default that quietly leaks the environment
 * into every sandbox.
 */
export function runTrialCommand(argv: readonly string[], root: string): string {
  const runId = flag(argv, "--run-id");
  const model = flag(argv, "--model");
  if (runId === null) throw new Error("trials run needs --run-id");
  if (model === null) throw new Error("trials run needs --model");
  const familyId = flag(argv, "--family") ?? PIC_FAMILY;
  const provider = flag(argv, "--provider") ?? "shell";
  // Everything after `--command` IS the command, flags included. The earlier version filtered out
  // anything starting with `--`, which silently dropped `--permission-mode bypassPermissions` and
  // left the provider CLI asking for approval in a non-interactive sandbox.
  const cmdIndex = argv.indexOf("--command");
  const command = cmdIndex === -1 ? undefined : argv.slice(cmdIndex + 1);

  const result = runAgentTrial({
    root,
    familyId,
    runId,
    provider,
    model,
    subjectId: flag(argv, "--subject") ?? model.split("/").pop() ?? model,
    effort: flag(argv, "--effort"),
    ...(command === undefined || command.length === 0 ? {} : { command }),
    timeoutMs: numeric(argv, "--timeout") ?? 900_000,
    inheritEnv: argv.includes("--inherit-env"),
    costUsd: numeric(argv, "--cost") ?? null,
    campaign: flag(argv, "--campaign"),
  });

  const failed = result.record.cells.filter((c) => c.failed.length > 0).length;
  return [
    `run        ${result.record.runId}`,
    `family     ${familyId}`,
    `provider   ${provider}`,
    `model      ${result.record.model ?? "—"}`,
    `status     ${result.record.status}`,
    `isolation  ${result.record.isolation}`,
    `runtime    ${result.record.runtimeSeconds === null ? "—" : `${Math.round(result.record.runtimeSeconds)}s`}`,
    `counts     ${result.countability.counts ? "yes" : "NO"} — ${result.countability.reason}`,
    `graded     ${result.record.cells.length} scenarios, ${failed} failed`,
    `directory  ${result.directory}`,
    "",
  ].join("\n");
}

/**
 * `history import-trials <source-repo>` — the six preserved cc267 runs, as trial directories.
 *
 * A one-shot generator, not a read path. It needs the source Terminal-Bench checkout, which is a
 * machine-local absolute path and cannot be a default; what it produces is committed and every
 * report reads THAT. Re-running it against the same runs rewrites the same directories.
 */
export function importOutboxTrialsCommand(root: string, sourceRepo: string | undefined): string {
  if (sourceRepo === undefined) {
    throw new Error("usage: foundry history import-trials <path-to-terminal-bench-checkout>");
  }
  const imported = importOutboxTrialDirectories({
    harborRunsRoot: join(sourceRepo, "runs"),
    taskDir: join(sourceRepo, "tasks", OUTBOX_FAMILY),
    trialsRoot: join(root, "trials"),
    familyId: OUTBOX_FAMILY,
  });
  return [
    `imported ${imported.length} trial director${imported.length === 1 ? "y" : "ies"} into trials/${OUTBOX_FAMILY}/`,
    "",
    "run             subject        counts  scenarios  failed  suite  failing checks",
    ...imported.map((i) =>
      [
        i.runId.padEnd(15),
        i.subjectId.padEnd(14),
        (i.counts ? "yes" : "NO").padEnd(6),
        String(i.scenarios).padStart(9),
        String(i.scenariosFailed).padStart(7),
        `${i.suitePassed}/${i.suiteTotal}`.padStart(6),
        `  ${i.failedChecks.join(", ") || "none"}`,
      ].join(" "),
    ),
    "",
  ].join("\n");
}

export function sharedBankCommand(root: string): string {
  const matrix = outboxMatrix(root);
  const { trials, run } = familyEvidenceFor(root);
  const picMatrix = toMatrix(run);
  return renderSharedBankReport({
    outboxTrials: countedAgentRecordsFor(root, OUTBOX_FAMILY),
    outboxMatrix: matrix,
    picMatrix,
    picTrials: trials,
    overlap: computeOverlap([
      {
        familyId: OUTBOX_FAMILY,
        matrix,
        provenance: "engines submitted by frontier models",
        agentDerived: true,
      },
      {
        familyId: PIC_FAMILY,
        matrix: picMatrix,
        provenance: "mutants written alongside the verifier",
        agentDerived: false,
      },
    ]),
  });
}

/** `kill analyze <family>` — the typed postmortem, rendered. */
/** The agent bank for a family: counted trials as a matrix the axis meter can read. */
export function agentBankFor(root: string, familyId: string) {
  const route = routeFor(familyId);
  const records = readFamilyTrials(join(root, "trials"), familyId).map((t) => t.record);
  return buildAgentBank(records, {
    familyId,
    instanceIds: route.matrix().instances.map((i) => i.id),
    caveat:
      "Subjects are real models attempting the task. Cells are the UNION of failures across that " +
      "model's counted trials; a scenario no counted trial graded is null rather than a pass.",
  });
}

/** Provider availability, checked by execution rather than assumed. */
export function providerStatus(): string {
  return [
    "provider        family      state                 available  detail",
    ...checkAllProviders().map(
      (a) =>
        `${a.provider.id.padEnd(16)}${a.provider.family.padEnd(12)}${a.state.padEnd(22)}${(a.available ? "yes" : "NO").padEnd(11)}${a.detail}`,
    ),
    "",
    "A provider that is not available produces NOT_RUN or import-only slots and a prepared bundle,",
    "never a zero. Anthropic/Claude is not executed in this phase.",
    "",
  ].join("\n");
}

/** `trials campaign prepare --family <id> --provider <p> --out <dir>` */
export function campaignPrepare(argv: readonly string[], root: string): string {
  const familyId = flag(argv, "--family");
  const providerId = flag(argv, "--provider") ?? "external";
  const out = flag(argv, "--out");
  if (familyId === null) throw new Error("trials campaign prepare needs --family");
  if (out === null) throw new Error("trials campaign prepare needs --out <dir>");
  const bundle = prepareProviderBundle(root, familyId, providerId, out);
  return [
    `family      ${bundle.familyId}`,
    `provider    ${bundle.provider.id} (${bundle.provider.label})`,
    `available   ${bundle.available ? "yes" : "NO"} — ${bundle.availability}`,
    `challenge   ${bundle.challenge.pkg.files.length} files, hash ${bundle.challenge.hash}`,
    `bundle      ${bundle.dir}/  (${bundle.files.join(", ")})`,
    "",
    bundle.command === null
      ? "No CLI declared: give INSTRUCTION.txt to the model however you run it."
      : `Command: ${bundle.command.map((a) => (a.includes(" ") ? "<instruction>" : a)).join(" ")}`,
    "",
    `Import with:  foundry trials campaign import --family ${bundle.familyId} ${bundle.dir}`,
    "",
  ].join("\n");
}

/** `trials campaign import --family <id> <dir>` — strict, and it grades what it accepts. */
export function campaignImport(argv: readonly string[], root: string): string {
  assertPackageStage({ checks: {} }, "trial-eligible");
  const familyId = flag(argv, "--family");
  const dir = positional(argv, 3);
  if (familyId === null) throw new Error("trials campaign import needs --family");
  if (dir === undefined) throw new Error("trials campaign import needs a bundle directory");

  const route = routeFor(familyId);
  const prepared = currentChallenge(root, familyId);
  const bundle = readImportedBundle(dir, familyId, prepared.hash);

  const graded =
    bundle.submissionPath === null
      ? { cells: [], detail: "no artifact to grade" }
      : route.grade(bundle.submissionPath);
  const countability = decideCountability(
    bundle.status as never,
    bundle.notes || "imported bundle",
    graded.cells.length,
  );

  const record = parseTrialRecord({
    runId: bundle.runId,
    familyId,
    subjectId: bundle.subjectId,
    subjectType: "agent",
    model: bundle.model,
    effort: bundle.effort,
    status: bundle.status,
    counts: countability.counts,
    countsReason: countability.reason,
    scenarioSetId: prepared.scenarioSetId,
    cells: countability.counts ? graded.cells : [],
    runtimeSeconds: bundle.runtimeSeconds,
    costUsd: bundle.costUsd,
    artifactPath: countability.counts ? join("trials", familyId, bundle.runId, "submission") : null,
    isolation: "subprocess",
    notes: `imported from ${dir}; provider=${bundle.provider}`,
  });

  const written = writeTrialDirectory({
    root: join(root, "trials"),
    familyId,
    runId: bundle.runId,
    record,
    countability,
    transcript: bundle.transcript,
    challengeFiles: prepared.pkg.files.map((f) => ({ path: f.path, content: f.content })),
    submissionFiles: bundle.submissionPath === null ? [] : bundle.submissionFiles,
    verifierOutput: { cells: graded.cells, detail: graded.detail },
    metadata: {
      runId: bundle.runId,
      familyId,
      provider: bundle.provider,
      model: bundle.model,
      subjectId: bundle.subjectId,
      effort: bundle.effort,
      scenarioSetId: prepared.scenarioSetId,
      challengeHash: bundle.challengeHash,
      importedFrom: dir,
      classification: bundle.status,
      notes: bundle.notes,
    },
  });

  return [
    `imported   ${bundle.runId}`,
    `family     ${familyId}`,
    `provider   ${bundle.provider} (${bundle.model})`,
    `status     ${bundle.status}`,
    `counts     ${countability.counts ? "yes" : "NO"} — ${countability.reason}`,
    `graded     ${graded.cells.length} scenarios, ${graded.cells.filter((c) => c.failed.length > 0).length} failed`,
    `directory  ${written}`,
    "",
  ].join("\n");
}

/** `trials campaign status` — every plan, every slot, every provider, in one table. */
export function campaignStatus(root: string): string {
  const availability = new Map(checkAllProviders().map((a) => [a.provider.id, a]));
  const lines: string[] = ["campaign | family | slot | provider | state | run"];
  for (const plan of loadCampaigns(root)) {
    const rec = reconcile(root, plan);
    const counted = new Set(rec.countedRecords.map((r) => r.runId));
    for (const slot of plan.slots) {
      // Provider identity comes from the SUBJECT, not the runner: several providers are driven
      // through the same `shell` adapter and printing "shell" for all of them hides the comparison
      // the table exists to make.
      const provider =
        PROVIDER_FAMILIES_LIST.find((p) => p.subjectId === slot.subjectId)?.id ??
        PROVIDER_FAMILIES_LIST.find((p) => p.model === slot.model)?.id ??
        slot.runner;
      const state = slot.runId !== null && counted.has(slot.runId) ? "COUNTED" : slot.state;
      lines.push(
        `${plan.campaignId} | ${plan.familyId} | ${slot.slotId} | ${provider} | ${state} | ${slot.runId ?? "—"}`,
      );
    }
  }
  lines.push("");
  for (const a of availability.values()) {
    lines.push(`${a.provider.id.padEnd(10)} ${a.available ? "available" : "UNAVAILABLE"} — ${a.detail}`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * `trials campaign --plan <file> [--run] [--only A1,A2]`.
 *
 * Validating and reconciling by default, executing only when asked. A campaign command whose default
 * spends money is a campaign command someone runs by accident.
 */
export function campaignCommand(argv: readonly string[], root: string): string {
  // Cross-provider subcommands. `trials campaign` with no subcommand keeps its old listing.
  const sub = positional(argv, 2);
  if (sub === "prepare") return campaignPrepare(argv, root);
  if (sub === "import") return campaignImport(argv, root);
  if (sub === "status") return campaignStatus(root);
  if (sub === "providers") return providerStatus();
  if (sub === "run" || sub === "reconcile") {
    // Both are the existing plan-driven paths; `run` adds --run.
    const family = flag(argv, "--family");
    if (family !== null) {
      const plans = loadCampaigns(root).filter((p) => p.familyId === family);
      if (sub === "reconcile" && plans.length > 1) return campaignReconcileForFamily(root, family, plans);
      const plan = plans[0];
      if (plan === undefined) throw new Error(`no campaign plan for family "${family}"`);
      return campaignForPlan(argv, root, plan, sub === "run");
    }
  }

  // A mistyped subcommand must not fall through to the listing. `trials campaign statsu` printing a
  // tidy summary of two plans is indistinguishable from success, and the reader concludes the thing
  // they asked for happened.
  assertCampaignSubcommand(sub);

  const planPath = flag(argv, "--plan");
  const plan = planPath === null ? null : loadCampaign(planPath);
  if (plan === null) {
    const all = loadCampaigns(root);
    return [
      `${all.length} campaign plan(s):`,
      "",
      ...all.map((p) => {
        const counted = readFamilyTrials(join(root, "trials"), p.familyId)
          .filter((t) => t.record.counts)
          .map((t) => t.runId);
        const prog = progressOf(p, counted);
        return `  ${p.campaignId.padEnd(14)} ${p.familyId.padEnd(38)} ${prog.run}/${prog.total} run, ${prog.counted} counted, ${prog.notRun} not run`;
      }),
      "",
    ].join("\n");
  }

  return campaignForPlan(argv, root, plan, argv.includes("--run"));
}

export function campaignReconcileForFamily(
  root: string,
  familyId: string,
  plans: readonly CampaignPlan[],
): string {
  const prepared = currentChallenge(root, familyId);
  const dirs = readFamilyTrials(join(root, "trials"), familyId);
  const claimed = new Set(
    plans.flatMap((plan) =>
      plan.slots.map((slot) => slot.runId).filter((runId): runId is string => runId !== null),
    ),
  );
  const gated = gateByChallengeHash(
    root,
    familyId,
    dirs.map((d) => ({ runId: d.runId, metadataPath: join(d.path, "metadata.json"), dir: d.path })),
  );
  const stale = new Set(gated.gates.filter((gate) => !gate.matches).map((gate) => gate.runId));
  const disagreements = plans.flatMap((plan) => reconcile(root, plan).disagreements);
  const orphanRuns = dirs.map((d) => d.runId).filter((runId) => !claimed.has(runId) && !stale.has(runId));
  const counted = dirs.filter((d) => d.record.counts && !stale.has(d.runId)).map((d) => d.record);
  const plannedSlots = plans.reduce((sum, plan) => sum + plan.slots.length, 0);
  const plannedRuns = plans.reduce(
    (sum, plan) =>
      sum +
      plan.slots.filter(
        (slot) =>
          slot.state === "RUN" ||
          slot.state === "IMPORTED" ||
          slot.state === "REFUSED" ||
          slot.state === "FAILED_INFRA",
      ).length,
    0,
  );
  return [
    `campaigns  ${plans.length} plan(s) for ${familyId}`,
    `challenge  current ${prepared.hash}`,
    `slots      ${plannedSlots} total, ${plannedRuns} run/imported/refused/infra`,
    `counted    ${counted.length} current-hash trial record(s) on disk`,
    "",
    "Plans:",
    ...plans.map(
      (plan) =>
        `  ${plan.campaignId} — ${plan.challengeHash === prepared.hash ? "hash match" : "HASH MISMATCH"}; ${plan.slots.length} slot(s)`,
    ),
    "",
    ...(disagreements.length === 0
      ? ["plans and evidence agree"]
      : ["DISAGREEMENTS:", ...disagreements.map((item) => `  ${item}`)]),
    ...(orphanRuns.length === 0 ? [] : ["", `unclaimed trial directories: ${orphanRuns.join(", ")}`]),
    "",
  ].join("\n");
}

export function campaignForPlan(
  argv: readonly string[],
  root: string,
  plan: ReturnType<typeof loadCampaign>,
  execute: boolean,
): string {
  const rec = reconcile(root, plan);
  if (!execute) {
    return [
      `campaign   ${plan.campaignId}`,
      `family     ${plan.familyId}`,
      `challenge  plan ${plan.challengeHash} / current ${rec.challengeCurrent} — ${rec.challengeMatches ? "match" : "MISMATCH"}`,
      `slots      ${plan.slots.length} (${plan.slots.filter((s) => s.state === "NOT_RUN").length} not run)`,
      `counted    ${rec.countedRecords.length} trial record(s) on disk`,
      "",
      ...(rec.disagreements.length === 0
        ? ["plan and evidence agree"]
        : ["DISAGREEMENTS:", ...rec.disagreements.map((d) => `  ${d}`)]),
      ...(rec.orphanRuns.length === 0
        ? []
        : ["", `unclaimed trial directories: ${rec.orphanRuns.join(", ")}`]),
      "",
      "Pass --run to execute the runnable slots.",
      "",
    ].join("\n");
  }

  const onlyRaw = flag(argv, "--only");
  const result = runCampaign({
    root,
    plan,
    ...(onlyRaw === null ? {} : { only: onlyRaw.split(",").map((s) => s.trim()) }),
    inheritEnv: !argv.includes("--no-inherit-env"),
  });
  return [
    `campaign   ${plan.campaignId}`,
    `executed   ${result.executed}`,
    `counted    ${result.counted}`,
    `skipped    ${result.skipped}`,
    "",
    ...result.outcomes.map((o) => `  ${o.slot.slotId.padEnd(4)} ${o.runId ?? "—"} — ${o.detail}`),
    "",
  ].join("\n");
}

/**
 * `trials verify --family <id> <run-id>` — re-grade a preserved submission from scratch.
 *
 * The check that makes a trial directory an artifact rather than a claim: the submission is still
 * there, the challenge hash still matches the family, and re-running the grader reproduces the cells
 * recorded at the time. A trial that cannot be re-verified is a screenshot.
 */
export function verifyTrialCommand(argv: readonly string[], root: string): string {
  const familyId = flag(argv, "--family") ?? PIC_FAMILY;
  const runId = positional(argv, 2);
  if (runId === undefined) throw new Error("trials verify needs a run id");
  const dir = join(root, "trials", familyId, runId);
  const trial = readTrialDirectory(dir);
  const route = routeFor(familyId);

  const metadata = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8")) as Record<string, unknown>;
  const typesSource = readFileSync(join(root, route.family.typesPath), "utf8");
  const current = challengeHash(route.family.challenge(typesSource, route.scenarioSetId()));

  // Where the hash comes from is part of the answer, not an implementation detail.
  //
  // Three trials in this repository (`pic-claude-1/2/3`) record no `challengeHash` in their metadata.
  // They still count, because every trial directory preserves the exact challenge the subject was
  // given and that directory hashes to the family's current package — the artifact is a better source
  // than a note about the artifact, and `gateByChallengeHash` has always read it that way. What was
  // wrong is that this command did not: it read metadata only, so it refused to re-verify the very
  // trials the evidence layer was counting. Two answers to one question is worse than either.
  //
  // The fallback is not a softening of the gate. `assertChallengeMatch` still receives a hash and
  // still fails on it: MISSING when nothing was recorded AND no challenge was preserved (nothing can
  // be claimed at all), MISMATCH when the preserved challenge is for a task this family no longer
  // produces. The only case that newly passes is the one where the preserved evidence itself proves
  // the trial saw today's task. What changes is that the output says which of the two happened, so
  // "counted by derivation, no recorded hash" is a stated state rather than a silent assumption.
  const recordedHash = typeof metadata.challengeHash === "string" ? metadata.challengeHash : null;
  const ranAgainst = recordedHash ?? hashChallengeDir(join(dir, "challenge"));
  assertChallengeMatch(ranAgainst, current, runId);
  const hashProvenance =
    recordedHash !== null
      ? "recorded in metadata.json"
      : "DERIVED by hashing the preserved challenge/ directory — metadata.json records no challengeHash";

  const submission = join(dir, "submission", route.submissionFile.split("/").pop() ?? "subject.mjs");
  const regraded = route.grade(submission);
  const recorded = trial.record.cells;
  const same =
    recorded.length === regraded.cells.length &&
    recorded.every((cell, i) => {
      const other = regraded.cells[i];
      return (
        other !== undefined &&
        other.scenarioId === cell.scenarioId &&
        other.failed.join(",") === cell.failed.join(",")
      );
    });

  return [
    `run          ${runId}`,
    `family       ${familyId}`,
    `challenge    ${current} (matches)`,
    `hash source  ${hashProvenance}`,
    `recorded     ${recorded.length} cells, ${recorded.filter((c) => c.failed.length > 0).length} failing`,
    `re-graded    ${regraded.cells.length} cells, ${regraded.cells.filter((c) => c.failed.length > 0).length} failing`,
    `reproduces   ${same ? "yes — identical cells" : "NO — the grading changed"}`,
    "",
  ].join("\n");
}
