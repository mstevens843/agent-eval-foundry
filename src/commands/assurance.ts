// assurance: extracted compatibility command services. Core APIs remain independent of dispatch.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { importAdversarialBundle, prepareAdversarialBundle } from "../adversarial-audit/bundles.js";
import {
  adversarialContainerBundlePath,
  containerRuntimeReadiness,
  prepareContainerAdversarialBundle,
  runContainerIsolationSmoke,
  verifyContainerIsolationBundle,
} from "../adversarial-audit/container.js";
import { isolationSummaryPath, verifyIsolationBundle } from "../adversarial-audit/isolation.js";
import { runAdversarialHardeningProbes } from "../adversarial-audit/probes.js";
import {
  ADVERSARIAL_PACKAGE_FAMILIES,
  adversarialBundlePath,
  adversarialCampaignPath,
  auditAdversarialReadinessForFamilies,
  buildAdversarialCampaign,
  currentAdversarialPackageHash,
  loadAdversarialCampaigns,
} from "../adversarial-audit/readiness.js";
import { loadAdversarialAttackRecords, summarizeAdversarialEvidence } from "../adversarial-audit/records.js";
import {
  renderReplayResult,
  renderTriageResult,
  replayAdversarialExploit,
  triageAdversarialAttack,
} from "../adversarial-audit/replay.js";
import {
  renderAdversarialAuditReport,
  renderAdversarialCampaignReport,
  renderAdversarialContainerIsolationReport,
  renderAdversarialHardeningProbesReport,
  renderAdversarialImportReport,
  renderAdversarialReadinessReport,
  renderAdversarialV2Report,
} from "../adversarial-audit/report.js";
import { adversarialAttackFailures } from "../adversarial-audit/validate.js";
import { measure } from "../axis-meter.js";
import { ALL_SUBJECTS, runFamily, toMatrix } from "../families/prompt-injection-containment/runner.js";
import {
  browserBackedMeasurementMatrix,
  browserBackedMeasurementPath,
  readBrowserBackedMeasurement,
  validateBrowserBackedMeasurement,
} from "../families/ui-replay-browser-backed/measurement.js";
import { loadRegistry } from "../foundry/load.js";
import { parseMatrix } from "../matrix.js";
import {
  renderBrowserBackedAxisReport,
  renderBrowserBackedReport,
} from "../reports/browser-backed-report.js";
import { renderCrossFamilyReport } from "../reports/family-report.js";
import { challengeHash } from "../trials/run.js";
import { flag, numeric, positional, readJson } from "./arguments.js";

export function browserBackedCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "verify";
  if (sub === "run") {
    const out = flag(argv, "--out") ?? browserBackedMeasurementPath(root);
    const runnerCandidates = [
      join(root, "dist", "families", "ui-replay-browser-backed", "runner.js"),
      join(root, "dist", "runner.js"),
    ];
    const runner = runnerCandidates.find((candidate) => existsSync(candidate));
    if (runner === undefined) {
      throw new Error("browser-backed run needs a built runner; run `pnpm build` first");
    }
    const executable = flag(argv, "--browser-executable");
    const result = spawnSync(
      process.execPath,
      [
        runner,
        "--root",
        root,
        "--out",
        out,
        ...(executable === null ? [] : ["--browser-executable", executable]),
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: numeric(argv, "--timeout") ?? 120_000,
      },
    );
    if (result.status !== 0) {
      throw new Error(`browser-backed run failed: ${(result.stderr || result.stdout).trim()}`);
    }
    const measurement = readBrowserBackedMeasurement(root);
    const validation = validateBrowserBackedMeasurement(measurement);
    return [
      result.stdout.trim(),
      `artifact    ${out}`,
      `valid       ${validation.valid ? "yes" : "NO"}`,
      `scenarios   ${validation.scenariosMeasured}`,
      `subjects    ${validation.subjectsMeasured}`,
      validation.failures.length === 0 ? "failures    none" : `failures    ${validation.failures.join("; ")}`,
      "",
    ].join("\n");
  }
  if (sub === "verify") {
    const measurement = readBrowserBackedMeasurement(root);
    const validation = validateBrowserBackedMeasurement(measurement);
    return [
      "Browser-backed measurement verification",
      `artifact    ${browserBackedMeasurementPath(root)}`,
      `present     ${measurement === null ? "no" : "yes"}`,
      `valid       ${validation.valid ? "yes" : "NO"}`,
      `scenarios   ${validation.scenariosMeasured}`,
      `subjects    ${validation.subjectsMeasured}`,
      `failures    ${validation.failures.length === 0 ? "none" : validation.failures.join("; ")}`,
      "",
    ].join("\n");
  }
  if (sub === "report") return renderBrowserBackedReport(readBrowserBackedMeasurement(root));
  if (sub === "axis") {
    const measurement = readBrowserBackedMeasurement(root);
    if (measurement !== null) {
      // Parse as a matrix here too, so the CLI path fails if the preserved measurement cannot feed
      // the same axis-meter contract as every other measured family.
      browserBackedMeasurementMatrix(measurement);
    }
    return renderBrowserBackedAxisReport(measurement);
  }
  throw new Error(`unknown browser-backed subcommand "${sub}"; expected run | verify | report | axis`);
}

export function writeAdversarialCampaignFiles(root: string): readonly string[] {
  return ADVERSARIAL_PACKAGE_FAMILIES.map((familyId) => {
    const campaign = buildAdversarialCampaign(root, familyId);
    const out = adversarialCampaignPath(root, familyId);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(campaign, null, 2)}\n`, "utf8");
    return out;
  });
}

export function adversarialCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "readiness";
  if (sub === "readiness")
    return renderAdversarialReadinessReport(auditAdversarialReadinessForFamilies(root));
  if (sub === "report") return renderAdversarialAuditReport(summarizeAdversarialEvidence(root));
  if (sub === "v2") {
    const mode = positional(argv, 2) ?? "report";
    if (mode !== "report") throw new Error(`unknown adversarial v2 subcommand "${mode}"; expected report`);
    return renderAdversarialV2Report(summarizeAdversarialEvidence(root));
  }
  if (sub === "container") {
    const mode = positional(argv, 2) ?? "report";
    if (mode !== "report")
      throw new Error(`unknown adversarial container subcommand "${mode}"; expected report`);
    const summaries = summarizeAdversarialEvidence(root);
    const verifications = ADVERSARIAL_PACKAGE_FAMILIES.map((familyId) => {
      const dir = adversarialContainerBundlePath(root, familyId);
      const verification = verifyContainerIsolationBundle(dir);
      return { ...verification, bundleDir: isolationSummaryPath(root, verification.bundleDir) };
    });
    return renderAdversarialContainerIsolationReport({
      runtime: containerRuntimeReadiness(),
      verifications,
      summaries,
    });
  }
  if (sub === "import-report") return renderAdversarialImportReport(loadAdversarialAttackRecords(root));
  if (sub === "campaign") {
    const familyId = positional(argv, 2);
    const campaigns =
      familyId === undefined ? loadAdversarialCampaigns(root) : [buildAdversarialCampaign(root, familyId)];
    if (argv.includes("--json")) {
      return `${JSON.stringify(campaigns.length === 1 ? campaigns[0] : campaigns, null, 2)}\n`;
    }
    return renderAdversarialCampaignReport(campaigns);
  }
  if (sub === "prepare") {
    const familyId = positional(argv, 2);
    if (familyId === undefined) throw new Error("adversarial prepare needs a family id");
    const out = flag(argv, "--out") ?? adversarialBundlePath(root, familyId);
    const provider = flag(argv, "--provider") ?? "external";
    const bundle = prepareAdversarialBundle(root, familyId, out, provider);
    return [
      `family      ${bundle.familyId}`,
      `campaign    ${bundle.campaign.campaignId}`,
      `provider    ${bundle.provider.id} (${bundle.provider.model})`,
      `available   ${bundle.available ? "yes" : "NO"} — ${bundle.availability}`,
      "isolation   fs-sandbox",
      `challenge   hash ${bundle.campaign.challengeHash}`,
      `bundle      ${bundle.dir}/ (${bundle.files.join(", ")})`,
      "",
      `Import with: foundry adversarial import ${bundle.dir}`,
      "",
    ].join("\n");
  }
  if (sub === "replay") {
    const attackId = positional(argv, 2);
    if (attackId === undefined) throw new Error("adversarial replay needs an attack id");
    const { record, replay } = replayAdversarialExploit(root, attackId);
    return renderReplayResult(record, replay);
  }
  if (sub === "triage") {
    const attackId = positional(argv, 2);
    if (attackId === undefined) throw new Error("adversarial triage needs an attack id");
    const { record, replay, triage } = triageAdversarialAttack(root, attackId);
    return renderTriageResult(record, replay, triage);
  }
  if (sub === "isolate") {
    const mode = positional(argv, 2);
    if (mode === "container") {
      const containerMode = positional(argv, 3);
      if (containerMode === "prepare") {
        const familyId = positional(argv, 4);
        if (familyId === undefined)
          throw new Error("adversarial isolate container prepare needs a family id");
        const out = flag(argv, "--out") ?? adversarialContainerBundlePath(root, familyId);
        const provider = flag(argv, "--provider") ?? "external";
        const bundle = prepareContainerAdversarialBundle(root, familyId, out, provider);
        return [
          `family      ${bundle.familyId}`,
          `provider    ${bundle.providerId}`,
          "isolation   container-no-network",
          `verdict     ${bundle.isolationVerdict}`,
          `runtime     ${bundle.metadata.runtimeAvailable ? "available" : "UNAVAILABLE"}`,
          `network     ${bundle.metadata.networkMode}`,
          `bundle      ${bundle.dir}/`,
          `failures    ${bundle.failures.length === 0 ? "none" : bundle.failures.join("; ")}`,
          "",
        ].join("\n");
      }
      if (containerMode === "verify") {
        const bundleDir = positional(argv, 4);
        if (bundleDir === undefined)
          throw new Error("adversarial isolate container verify needs a bundle directory");
        const verify = verifyContainerIsolationBundle(bundleDir);
        return [
          "Container isolation verification",
          `bundle      ${isolationSummaryPath(root, verify.bundleDir)}`,
          `verdict     ${verify.verdict}`,
          `runtime     ${verify.metadata.runtimeAvailable ? "available" : "UNAVAILABLE"}`,
          `network     ${verify.metadata.networkMode}`,
          `repo        ${verify.metadata.repoRootMounted ? "mounted" : "absent"}`,
          `hidden      ${verify.metadata.hiddenArtifactsMounted ? "mounted" : "absent"}`,
          `verifier    ${verify.metadata.verifierInsideContainer ? "inside" : "outside"}`,
          `failures    ${verify.failures.length === 0 ? "none" : verify.failures.join("; ")}`,
          "",
        ].join("\n");
      }
      if (containerMode === "smoke") {
        const familyId = positional(argv, 4);
        if (familyId === undefined) throw new Error("adversarial isolate container smoke needs a family id");
        const out = flag(argv, "--out") ?? adversarialContainerBundlePath(root, familyId);
        prepareContainerAdversarialBundle(root, familyId, out, flag(argv, "--provider") ?? "external");
        const smoke = runContainerIsolationSmoke(out);
        return [
          "Container isolation smoke",
          `family      ${familyId}`,
          `bundle      ${isolationSummaryPath(root, smoke.bundleDir)}`,
          `verdict     ${smoke.verdict}`,
          `runtime     ${smoke.metadata.runtimeAvailable ? "available" : "UNAVAILABLE"}`,
          `network     ${smoke.metadata.networkMode}`,
          `failures    ${smoke.failures.length === 0 ? "none" : smoke.failures.join("; ")}`,
          "",
        ].join("\n");
      }
      throw new Error(
        `unknown adversarial isolate container subcommand "${containerMode ?? ""}"; expected prepare | verify | smoke`,
      );
    }
    if (mode === "prepare") {
      const familyId = positional(argv, 3);
      if (familyId === undefined) throw new Error("adversarial isolate prepare needs a family id");
      const out = flag(argv, "--out") ?? adversarialBundlePath(root, familyId);
      const provider = flag(argv, "--provider") ?? "external";
      const bundle = prepareAdversarialBundle(root, familyId, out, provider, "fs-sandbox");
      const verify = verifyIsolationBundle(bundle.dir);
      return [
        `family      ${bundle.familyId}`,
        `provider    ${bundle.provider.id} (${bundle.provider.model})`,
        `isolation   ${verify.profile.id}`,
        `verdict     ${verify.verdict}`,
        `challenge   hash ${bundle.campaign.challengeHash}`,
        `bundle      ${bundle.dir}/`,
        `failures    ${verify.failures.length === 0 ? "none" : verify.failures.join("; ")}`,
        "",
      ].join("\n");
    }
    if (mode === "verify") {
      const bundleDir = positional(argv, 3);
      if (bundleDir === undefined) throw new Error("adversarial isolate verify needs a bundle directory");
      const verify = verifyIsolationBundle(bundleDir);
      return [
        "Isolation verification",
        `bundle      ${isolationSummaryPath(root, verify.bundleDir)}`,
        `profile     ${verify.profile.id}`,
        `verdict     ${verify.verdict}`,
        `challenge   ${verify.publicChallengePresent ? "present" : "missing"}`,
        `hidden      ${verify.hiddenLeaks.length}`,
        `repo        ${verify.repoRootLeaks.length}`,
        `reports     ${verify.reportLeaks.length}`,
        `writable    exploit:${verify.exploitDirWritable ? "yes" : "no"} submitted-bypass:${verify.submittedBypassDirWritable ? "yes" : "no"}`,
        `failures    ${verify.failures.length === 0 ? "none" : verify.failures.join("; ")}`,
        "",
      ].join("\n");
    }
    throw new Error(
      `unknown adversarial isolate subcommand "${mode ?? ""}"; expected prepare | verify | container`,
    );
  }
  if (sub === "probe") {
    const familyId = positional(argv, 2);
    if (familyId === undefined) throw new Error("adversarial probe needs a family id");
    return renderAdversarialHardeningProbesReport(runAdversarialHardeningProbes(root, familyId));
  }
  if (sub === "import") {
    const dir = positional(argv, 2);
    if (dir === undefined) throw new Error("adversarial import needs a bundle directory");
    const record = importAdversarialBundle(root, dir);
    return [
      `imported   ${record.attackId}`,
      `family     ${record.familyId}`,
      `status     ${record.status}`,
      `counts     ${record.counts ? "yes" : "NO"} — ${record.countabilityReason}`,
      `bypass     ${record.bypassClassification}`,
      `isolation  ${record.isolationProfile.id}`,
      `replay     ${record.exploitReplay.status}`,
      `triage     ${record.triage.decision}`,
      "",
    ].join("\n");
  }
  if (sub === "verify") {
    const attackId = positional(argv, 2);
    if (attackId === undefined) throw new Error("adversarial verify needs an attack id");
    const loaded = loadAdversarialAttackRecords(root).find((r) => r.record.attackId === attackId);
    if (loaded === undefined) throw new Error(`no adversarial audit record "${attackId}"`);
    const current = currentAdversarialPackageHash(root, loaded.record.familyId);
    const failures = adversarialAttackFailures(loaded.record, {
      currentChallengeHash: current,
      transcriptText: loaded.transcriptText,
      exploitText: loaded.exploitText,
      verifierText: loaded.verifierText,
    });
    return [
      `attack     ${loaded.record.attackId}`,
      `family     ${loaded.record.familyId}`,
      `challenge  record ${loaded.record.challengeHash ?? "none"} / current ${current ?? "none"}`,
      `status     ${loaded.record.status}`,
      `counts     ${loaded.record.counts ? "yes" : "NO"} — ${loaded.record.countabilityReason}`,
      `bypass     ${loaded.record.bypassClassification}`,
      `isolation  ${loaded.record.isolationProfile.id}`,
      `replay     ${loaded.record.exploitReplay.status}`,
      `triage     ${loaded.record.triage.decision}`,
      `verifier   ${loaded.record.verifier.status}`,
      failures.length === 0 ? "valid      yes" : `valid      NO — ${failures.map((f) => f.code).join(", ")}`,
      "",
    ].join("\n");
  }
  if (sub === "all") {
    const campaigns = writeAdversarialCampaignFiles(root);
    const bundles = ADVERSARIAL_PACKAGE_FAMILIES.map((familyId) =>
      prepareAdversarialBundle(root, familyId, adversarialBundlePath(root, familyId)),
    );
    const containerBundles = ADVERSARIAL_PACKAGE_FAMILIES.map((familyId) =>
      prepareContainerAdversarialBundle(root, familyId, adversarialContainerBundlePath(root, familyId)),
    );
    return [
      `wrote ${campaigns.length} adversarial campaign file(s)`,
      ...campaigns.map((p) => `  ${p}`),
      `prepared ${bundles.length} adversarial attack bundle(s)`,
      ...bundles.map((b) => `  ${b.dir}`),
      `prepared ${containerBundles.length} container/no-network attack bundle(s)`,
      ...containerBundles.map((b) => `  ${b.dir}`),
      "",
    ].join("\n");
  }
  throw new Error(
    `unknown adversarial subcommand "${sub}"; expected readiness | campaign | prepare | import | import-report | verify | replay | triage | isolate | probe | v2 | container | report | all`,
  );
}

export function crossFamilyCommand(root: string): string {
  const registry = loadRegistry(root);
  const outboxRaw = readJson(join(root, "examples/durable-outbox/matrix.json"));
  const outbox = parseMatrix(outboxRaw);
  const run = runFamily(ALL_SUBJECTS);
  const pic = toMatrix(run);
  const shapeOf = (id: string) => registry.shapes.find((s) => s.familyId === id)?.mechanisms ?? [];
  return renderCrossFamilyReport([
    {
      name: "durable-approval-outbox",
      matrix: outbox,
      axis: measure(outbox),
      mechanisms: [...shapeOf("durable-approval-outbox")],
      provenance: "10 engines submitted by frontier models attempting the task",
    },
    {
      name: "prompt-injection-containment",
      matrix: pic,
      axis: measure(pic),
      mechanisms: [...shapeOf("prompt-injection-containment")],
      provenance: "9 mutants written alongside the verifier",
    },
  ]);
}
