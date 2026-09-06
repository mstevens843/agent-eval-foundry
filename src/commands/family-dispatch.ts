// family-dispatch: extracted compatibility command services. Core APIs remain independent of dispatch.
import { join } from "node:path";
import { builtFamily } from "../families/registry.js";
import { loadAdaptiveFunnel, loadRegistry } from "../foundry/load.js";
import { renderAccessTokenSmokeDiagnosis } from "../reports/access-token-diagnosis.js";
import { analyseChain, diversityTargets } from "../reports/chain-analysis.js";
import { renderDelegatedWalletSmokeDiagnosis } from "../reports/delegated-wallet-diagnosis.js";
import { renderDeploymentAliasSmokeDiagnosis } from "../reports/deployment-alias-diagnosis.js";
import { diagnose, renderDiagnoses } from "../reports/diagnosis.js";
import { MEMORY_FAMILY, PIC_FAMILY, UI_FAMILY } from "../reports/evidence.js";
import { loadCampaigns } from "../trials/campaign.js";
import { readFamilyTrials } from "../trials/directory.js";
import { routeFor } from "../trials/router.js";
import { emit, flag, positional } from "./arguments.js";
import {
  builtFamilyCommand,
  familyCommand,
  killCommand,
  promoteCommand,
  realismCommand,
  shapeCommand,
} from "./construction.js";
import {
  ACCESS_TOKEN_FAMILY_ID,
  DELEGATED_WALLET_FAMILY_ID,
  DEPLOYMENT_ALIAS_FAMILY_ID,
  accessTokenSmokeContext,
  delegatedWalletSmokeContext,
  deploymentAliasSmokeContext,
} from "./discovery.js";
import { analysisBase, subjectFailuresFor } from "./evidence.js";
import { UI_AXIS_PROPOSALS } from "./reports.js";

export function familyDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "run";
    // Subcommands that work for ANY built family. The originals below keep their behaviour, so
    // `family run` with no flag is still the first family and every existing script still works.
    if (sub === "sweep") {
      process.stdout.write(builtFamilyCommand(argv, root, "sweep"));
      return 0;
    }
    if (sub === "shape") {
      emit(argv, shapeCommand(argv, root));
      return 0;
    }
    if (sub === "postmortem") {
      emit(argv, killCommand(argv, root));
      return 0;
    }
    if (sub === "promote") {
      process.stdout.write(promoteCommand(argv, root));
      return 0;
    }
    if (sub === "diagnose") {
      const familyId = flag(argv, "--family") ?? MEMORY_FAMILY;
      const base = analysisBase(root);
      const chain = analyseChain(familyId, subjectFailuresFor(root, familyId, base.evidenceState));
      const plan = loadCampaigns(root).find((c) => c.familyId === familyId);
      const params = routeFor(familyId).scenarioParams();
      const diagnoses = readFamilyTrials(join(root, "trials"), familyId)
        .filter((t) => t.record.subjectType === "agent")
        .filter((t) => (base.evidenceState.get(t.runId) ?? "not-run") === "counted")
        .map((t) =>
          diagnose({
            familyId,
            record: t.record,
            params,
            hypothesisChecks:
              familyId === MEMORY_FAMILY
                ? ["provenance_persisted", "no_forbidden_call", "exactly_allowed", "recall_trust_preserved"]
                : builtFamily(familyId).checks,
            hypothesisKnob: familyId === MEMORY_FAMILY ? "sessionsBetween" : null,
          }),
        );
      const summary = [
        `family      ${familyId}`,
        `subjects    ${chain.subjects.join(", ") || "none with failures"}`,
        `chain       ${chain.isChain ? "YES — one axis at several sensitivities" : `no — ${chain.incomparable.length} incomparable pair(s)`}`,
        `agent axes  ${chain.agentAxesReading}`,
        "",
        chain.reading,
        "",
        ...diagnoses.map(
          (d) =>
            `${d.runId.padEnd(14)} ${d.reading.padEnd(20)} ${d.scenariosFailed}/${d.scenariosGraded} failed, hypothesis ${d.matchesHypothesis ? "matched" : "not matched"}`,
        ),
        "",
        `Full report: reports/${familyId}-agent-diagnosis.md`,
        "",
      ].join("\n");
      if (flag(argv, "--out") !== null) {
        const funnel = loadAdaptiveFunnel(root, loadRegistry(root));
        const campaigns = loadCampaigns(root);
        const context =
          familyId === ACCESS_TOKEN_FAMILY_ID
            ? accessTokenSmokeContext(root, campaigns, funnel.transfers)
            : familyId === DELEGATED_WALLET_FAMILY_ID
              ? delegatedWalletSmokeContext(root, campaigns, funnel.transfers)
              : familyId === DEPLOYMENT_ALIAS_FAMILY_ID
                ? deploymentAliasSmokeContext(root, campaigns, funnel.transfers)
                : null;
        emit(
          argv,
          context === null
            ? renderDiagnoses(familyId, diagnoses, plan?.hypothesis ?? "No campaign plan on record.")
            : familyId === ACCESS_TOKEN_FAMILY_ID
              ? renderAccessTokenSmokeDiagnosis({
                  analysis: context.analysis,
                  diagnoses: context.diagnoses,
                  plan: context.plan,
                  gate: context.gate,
                  records: context.records,
                })
              : familyId === DELEGATED_WALLET_FAMILY_ID
                ? renderDelegatedWalletSmokeDiagnosis({
                    analysis: context.analysis,
                    diagnoses: context.diagnoses,
                    plan: context.plan,
                    gate: context.gate,
                    records: context.records,
                  })
                : renderDeploymentAliasSmokeDiagnosis({
                    analysis: context.analysis,
                    diagnoses: context.diagnoses,
                    plan: context.plan,
                    gate: context.gate,
                    records: context.records,
                  }),
        );
        return 0;
      }
      process.stdout.write(summary);
      if (plan === undefined) process.stdout.write("No campaign plan on record for this family.\n");
      return 0;
    }
    if (sub === "evolve-scenarios") {
      const familyId = flag(argv, "--family") ?? UI_FAMILY;
      const base = analysisBase(root);
      const chain = analyseChain(familyId, subjectFailuresFor(root, familyId, base.evidenceState));
      const target = diversityTargets(
        familyId,
        subjectFailuresFor(root, familyId, base.evidenceState),
        routeFor(familyId).scenarioParams(),
      );
      process.stdout.write(
        [
          `family      ${familyId}`,
          `chain       ${chain.isChain ? "YES" : "no"}`,
          "",
          chain.isChain
            ? "Adding subjects cannot raise the width. Only scenarios with a genuine trade-off can."
            : "The family already separates in more than one direction; new scenarios would widen rather than unlock.",
          "",
          `saturated   ${target.saturated.map((r) => `${r.knob}=${r.value}`).join(", ") || "none"}`,
          `untouched   ${target.untouched.map((r) => `${r.knob}=${r.value}`).join(", ") || "none"}`,
          "",
          ...(chain.isChain
            ? UI_AXIS_PROPOSALS.flatMap((prop) => [
                `${prop.id}`,
                `  mechanism  ${prop.mechanism}`,
                `  wins today ${prop.currentWinner}`,
                `  loses here ${prop.whyItLoses}`,
                `  new knob   ${prop.newKnob}`,
                `  kill risk  ${prop.risk}`,
                "",
              ])
            : []),
          "Full report: reports/scenario-diversity-report.md",
          "",
        ].join("\n"),
      );
      return 0;
    }
    if (sub === "realism") {
      process.stdout.write(realismCommand(root));
      return 0;
    }
    const requested = flag(argv, "--family");
    if (requested !== null && requested !== PIC_FAMILY && (sub === "run" || sub === "axis")) {
      emit(argv, builtFamilyCommand(argv, root, sub));
      return 0;
    }
    emit(argv, familyCommand(sub, root));
    return 0;
  }
}
