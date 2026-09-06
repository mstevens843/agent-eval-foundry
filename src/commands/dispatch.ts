// dispatch: extracted compatibility command services. Core APIs remain independent of dispatch.
import { join } from "node:path";
import { adversarialGateEvidenceMap, summarizeAdversarialEvidence } from "../adversarial-audit/records.js";
import { BUILT_FAMILIES } from "../families/registry.js";
import { loadRegistry } from "../foundry/load.js";
import { coverage } from "../foundry/registry.js";
import { humanEvidenceForFamilies, humanGateEvidenceMap } from "../human-solvability/records.js";
import { packageCommand } from "../packages/command.js";
import { renderHistoricalReport } from "../reports/bank-report.js";
import { renderEvidenceSnapshotReport } from "../reports/evidence-snapshot.js";
import {
  PIC_FAMILY,
  familyEvidenceFor,
  familyEvidenceMapForShipReport,
  outboxHistory,
} from "../reports/evidence.js";
import { renderFamilyDiversityReport, renderLedgerReport } from "../reports/ledger-report.js";
import { renderMechanismReport, renderMutantReport } from "../reports/registry-report.js";
import { renderSelfCheckBehavior } from "../reports/self-check-report.js";
import { renderShipReport } from "../reports/ship-report.js";
import { renderSubmissionQuality } from "../reports/submission-quality.js";
import { SOURCES } from "../sources/index.js";
import {
  importAgentTrials,
  measuredScenarios,
  runLocalTrials,
  scenarioSetId,
} from "../trials/orchestrate.js";
import { ROUTABLE_FAMILY_IDS, routeFor } from "../trials/router.js";
import { prepareChallenge } from "../trials/run.js";
import { USAGE, emit, flag, positional } from "./arguments.js";
import { adversarialCommand, browserBackedCommand, crossFamilyCommand } from "./assurance.js";
import { checkCommand } from "./check.js";
import {
  challengeCommand,
  evolveCommand,
  killCommand,
  realismCommand,
  scaffoldCommand,
} from "./construction.js";
import {
  deploymentAliasCommand,
  discoveryCommand,
  funnelCommand,
  lineageCommand,
  probesCommand,
  promotionCommand,
  providerDeltaCommand,
} from "./discovery.js";
import { analysisBase, qualityRowsFor, reportLedgers, selfCheckProfilesFor } from "./evidence.js";
import { externalCommand, humanCommand } from "./intake.js";
import { axisCommand, budgetCommand } from "./matrix.js";
import { allCommand, bankInput, completionsFor } from "./reports.js";
import {
  agentBankFor,
  campaignCommand,
  importOutboxTrialsCommand,
  providersCommand,
  runTrialCommand,
  sharedBankCommand,
  verifyTrialCommand,
} from "./trials.js";

export function reportDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const path = positional(argv, 1);
    if (path === undefined) {
      process.stderr.write(`${command}: a matrix path is required\n\n${USAGE}`);
      return 2;
    }
    if (command !== "report" && command !== "json") throw new Error("invalid matrix command");
    emit(argv, axisCommand(argv, command, path));
    return 0;
  }
}

export function packageDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(packageCommand(root, argv.slice(1)));
  return 0;
}

export function checkDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(checkCommand(root));
  return 0;
}

export function crossFamilyDispatch(argv: readonly string[], root: string, command: string): number {
  emit(argv, crossFamilyCommand(root));
  return 0;
}

export function sharedBankDispatch(argv: readonly string[], root: string, command: string): number {
  emit(argv, sharedBankCommand(root));
  return 0;
}

export function historyDispatch(argv: readonly string[], root: string, command: string): number {
  {
    if (positional(argv, 1) === "import-trials") {
      process.stdout.write(importOutboxTrialsCommand(root, positional(argv, 2)));
      return 0;
    }
    const path = positional(argv, 2);
    emit(argv, renderHistoricalReport(outboxHistory(root, path)));
    return 0;
  }
}

export function humanDispatch(argv: readonly string[], root: string, command: string): number {
  emit(argv, humanCommand(argv, root));
  return 0;
}

export function externalDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "packet") process.stdout.write(externalCommand(argv, root));
    else emit(argv, externalCommand(argv, root));
    return 0;
  }
}

export function browserBackedDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "verify";
    if (sub === "report" || sub === "axis") emit(argv, browserBackedCommand(argv, root));
    else process.stdout.write(browserBackedCommand(argv, root));
    return 0;
  }
}

export function adversarialDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "readiness";
    if (
      sub === "readiness" ||
      sub === "report" ||
      sub === "campaign" ||
      sub === "v2" ||
      sub === "container" ||
      sub === "import-report"
    ) {
      emit(argv, adversarialCommand(argv, root));
    } else {
      process.stdout.write(adversarialCommand(argv, root));
    }
    return 0;
  }
}

export function challengeDispatch(argv: readonly string[], root: string, command: string): number {
  // Not `emit`: --out names a DIRECTORY here, as it does for `scaffold`. Summary to stdout.
  process.stdout.write(challengeCommand(argv, root));
  return 0;
}

export function trialsDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "local";
    if (sub === "local") {
      emit(argv, `${JSON.stringify(runLocalTrials(), null, 2)}\n`);
      return 0;
    }
    if (sub === "bank") {
      const { trials } = familyEvidenceFor(root);
      emit(argv, `${JSON.stringify(trials, null, 2)}\n`);
      return 0;
    }
    if (sub === "import") {
      const dir = positional(argv, 2);
      if (dir === undefined) throw new Error("trials import needs a directory");
      const records = importAgentTrials(dir);
      emit(
        argv,
        `${JSON.stringify({ familyId: "prompt-injection-containment", scenarioSetId: scenarioSetId(measuredScenarios()), records }, null, 2)}\n`,
      );
      return 0;
    }
    if (sub === "run") {
      process.stdout.write(runTrialCommand(argv, root));
      return 0;
    }
    if (sub === "campaign") {
      process.stdout.write(campaignCommand(argv, root));
      return 0;
    }
    if (sub === "verify") {
      process.stdout.write(verifyTrialCommand(argv, root));
      return 0;
    }
    if (sub === "matrix") {
      const familyId = flag(argv, "--family") ?? PIC_FAMILY;
      emit(argv, `${JSON.stringify(agentBankFor(root, familyId).matrix, null, 2)}\n`);
      return 0;
    }
    if (sub === "prepare") {
      const familyId = flag(argv, "--family") ?? PIC_FAMILY;
      const out = flag(argv, "--out");
      if (out === null) throw new Error("trials prepare needs --out <dir>");
      const prepared = prepareChallenge(root, familyId, out);
      process.stdout.write(
        [
          `family         ${familyId}`,
          `challenge      ${prepared.pkg.files.length} files -> ${out}/`,
          `challenge hash ${prepared.hash}`,
          `scenario set   ${prepared.scenarioSetId}`,
          `scenarios      ${prepared.route.scenarioCount()}`,
          "",
          "Instruction handed to the agent:",
          "",
          prepared.route.instruction,
          "",
        ].join("\n"),
      );
      return 0;
    }
    if (sub === "route") {
      const familyId = flag(argv, "--family") ?? PIC_FAMILY;
      const route = routeFor(familyId);
      process.stdout.write(
        [
          `family      ${route.familyId}`,
          `host        ${route.hostScript}`,
          `submission  ${route.submissionFile}`,
          `scenarios   ${route.scenarioCount()}`,
          `set id      ${route.scenarioSetId()}`,
          "",
          `routable    ${ROUTABLE_FAMILY_IDS.join(", ")}`,
          "",
        ].join("\n"),
      );
      return 0;
    }
    if (sub === "providers") {
      process.stdout.write(providersCommand());
      return 0;
    }
    if (sub === "shared-bank") {
      const base = analysisBase(root);
      const banks = bankInput(root, loadRegistry(root)).banks;
      const completions = completionsFor(banks, base.allTrials, base.evidenceState);
      process.stdout.write(
        [
          ...completions.flatMap((c) => [
            `kind        ${c.kind} (${c.axisKind})`,
            `families    ${c.families.join(", ")}`,
            `shared      ${c.sharedSubjects.join(", ") || "none"}`,
            `labs        ${c.sharedProviderFamilies.join(", ") || "none"}`,
            `verdict     ${c.verdict.toUpperCase()}`,
            `comparable  ${c.comparability.verdict}`,
            `still need  ${c.minimumAdditionalTrials} counted trial(s)`,
            "",
            c.rationale,
            "",
          ]),
        ].join("\n"),
      );
      return 0;
    }
    if (sub === "third-subject-plan") {
      const base = analysisBase(root);
      const banks = bankInput(root, loadRegistry(root)).banks;
      const completions = completionsFor(banks, base.allTrials, base.evidenceState);
      const agentCompletion = completions.find((c) => c.kind === "agent");
      if (agentCompletion === undefined) {
        process.stdout.write(
          "verdict     NO-CURRENT-AGENT-BANK\nNo shared-subject threshold is established. Complete package qualification before proposing new trials; retained observations are not current evidence.\n",
        );
        return 0;
      }
      process.stdout.write(
        [
          `verdict     ${agentCompletion.verdict.toUpperCase()} (${agentCompletion.sharedSubjects.length}/${agentCompletion.threshold} shared subjects, ${agentCompletion.sharedProviderFamilies.length} lab(s))`,
          `still need  ${agentCompletion.minimumAdditionalTrials} counted trial(s)`,
          "",
          ...(agentCompletion.unlocks.length === 0
            ? ["Nothing: the bank is at or above threshold."]
            : agentCompletion.unlocks.flatMap((u) => [
                `${u.subjectId} on ${u.familyId} via ${u.providerId} — ${u.runnableHere ? "runnable here" : `NOT runnable: ${u.availability}`}`,
                ...(u.runnableHere && u.command !== null
                  ? [
                      `  foundry trials run --family ${u.familyId} --run-id ${u.familyId.split("-").pop()}-${u.providerId}-1 \\`,
                      `    --model ${u.providerFamily}/${u.subjectId} --provider shell --inherit-env \\`,
                      `    --command ${u.command.map((a) => (a === "{instruction}" ? "'{instruction}'" : a)).join(" ")}`,
                    ]
                  : [
                      `  foundry trials campaign prepare --family ${u.familyId} --provider external --out bundles/${u.familyId}-external`,
                    ]),
                "",
              ])),
          "",
          ...agentCompletion.holes.map(
            (h) => `hole  ${h.subjectId} / ${h.familyId}: ${h.reason} — ${h.detail}`,
          ),
          "",
        ].join("\n"),
      );
      return 0;
    }
    if (sub === "quality") {
      const base = analysisBase(root);
      emit(argv, renderSubmissionQuality(qualityRowsFor(base, selfCheckProfilesFor(base))));
      return 0;
    }
    if (sub === "self-check") {
      const base = analysisBase(root);
      emit(argv, renderSelfCheckBehavior({ profiles: selfCheckProfilesFor(base) }));
      return 0;
    }
    throw new Error(
      `unknown trials subcommand "${sub}"; expected local | run | providers | import | bank | campaign | verify | matrix | prepare | route | shared-bank | third-subject-plan | quality | self-check`,
    );
  }
}

export function mechanismsDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const r = loadRegistry(root);
    emit(argv, renderMechanismReport(r, coverage(r)));
    return 0;
  }
}

export function mutantsDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const r = loadRegistry(root);
    emit(argv, renderMutantReport(r, coverage(r)));
    return 0;
  }
}

export function ledgerDispatch(argv: readonly string[], root: string, command: string): number {
  emit(argv, renderLedgerReport(loadRegistry(root), reportLedgers(root)));
  return 0;
}

export function familiesDispatch(argv: readonly string[], root: string, command: string): number {
  emit(argv, renderFamilyDiversityReport(loadRegistry(root).shapes));
  return 0;
}

export function shipDispatch(argv: readonly string[], root: string, command: string): number {
  {
    // Same evidence the report writer uses. A standalone `ship` that skipped it said SHIP for a
    // family the generated report called NOT-READY, which is the worst possible failure for a
    // gate: two commands, one repository, opposite answers.
    const r = loadRegistry(root);
    const humanEvidence = humanGateEvidenceMap(humanEvidenceForFamilies(root));
    const adversarialEvidence = adversarialGateEvidenceMap(summarizeAdversarialEvidence(root));
    const evidence = familyEvidenceMapForShipReport(root);
    emit(argv, renderShipReport(r.shapes, r, evidence, humanEvidence, adversarialEvidence));
    return 0;
  }
}

export function snapshotDispatch(argv: readonly string[], root: string, command: string): number {
  {
    // The evidence snapshot, from the same maps and the same `assessFamily` as `ship`.
    const r = loadRegistry(root);
    emit(
      argv,
      renderEvidenceSnapshotReport({
        registry: r,
        evidence: familyEvidenceMapForShipReport(root),
        humanEvidence: humanGateEvidenceMap(humanEvidenceForFamilies(root)),
        verifierIntegrity: adversarialGateEvidenceMap(summarizeAdversarialEvidence(root)),
        ledgers: reportLedgers(root),
        importedOutbox: outboxHistory(root),
      }),
    );
    return 0;
  }
}

export function funnelDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report" || sub === "probes" || sub === "transfer") emit(argv, funnelCommand(argv, root));
    else process.stdout.write(funnelCommand(argv, root));
    return 0;
  }
}

export function discoveryDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report" || sub === "candidates" || sub === "score") {
      emit(argv, discoveryCommand(argv, root));
    } else {
      process.stdout.write(discoveryCommand(argv, root));
    }
    return 0;
  }
}

export function probesDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report") emit(argv, probesCommand(argv, root));
    else process.stdout.write(probesCommand(argv, root));
    return 0;
  }
}

export function promotionDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report") emit(argv, promotionCommand(argv, root));
    else process.stdout.write(promotionCommand(argv, root));
    return 0;
  }
}

export function lineageDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report") emit(argv, lineageCommand(argv, root));
    else process.stdout.write(lineageCommand(argv, root));
    return 0;
  }
}

export function providerDeltaDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report") emit(argv, providerDeltaCommand(argv, root));
    else process.stdout.write(providerDeltaCommand(argv, root));
    return 0;
  }
}

export function deploymentAliasDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(deploymentAliasCommand(argv, root));
  return 0;
}

export function killDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "analyze";
    if (sub !== "analyze") throw new Error(`unknown kill subcommand "${sub}"; expected analyze`);
    emit(argv, killCommand(argv, root));
    return 0;
  }
}

export function evolveDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(evolveCommand(argv, root));
  return 0;
}

export function familiesBuiltDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(
    `${BUILT_FAMILIES.map((f) => `${f.id.padEnd(38)} ${f.checks.length} checks  ${f.mechanisms.join(", ")}`).join("\n")}\n`,
  );
  return 0;
}

export function sourcesDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(
    `${SOURCES.map(
      (s) =>
        `${s.status === "implemented" ? "  " : "! "}${s.id.padEnd(16)} ${s.status.padEnd(12)} ${s.label}\n` +
        `    ${s.description}\n${s.requires === null ? "" : `    requires: ${s.requires}\n`}`,
    ).join("\n")}\n`,
  );
  return 0;
}

export function scaffoldDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(scaffoldCommand(argv, root));
  return 0;
}

export function budgetDispatch(argv: readonly string[], root: string, command: string): number {
  emit(argv, budgetCommand(argv));
  return 0;
}

export function reportsDispatch(argv: readonly string[], root: string, command: string): number {
  {
    // `reports all` is an alias for `all`: the report layer got large enough that people look for
    // it under a noun rather than under a bare verb.
    const sub = positional(argv, 1) ?? "all";
    if (sub !== "all") throw new Error(`unknown reports subcommand "${sub}"; expected all`);
    process.stdout.write(allCommand(argv.slice(1), root));
    return 0;
  }
}

export function uiDispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = `${positional(argv, 1) ?? ""} ${positional(argv, 2) ?? ""}`.trim();
    if (sub !== "replay upgrade") {
      throw new Error(`unknown ui subcommand "${sub}"; expected \`ui replay upgrade\``);
    }
    process.stdout.write(realismCommand(root));
    return 0;
  }
}

export function allDispatch(argv: readonly string[], root: string, command: string): number {
  process.stdout.write(allCommand(argv, root));
  return 0;
}
