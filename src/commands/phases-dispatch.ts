// phases-dispatch: extracted compatibility command services. Core APIs remain independent of dispatch.
import {
  executePhase14Attempt,
  parsePhase14AttemptId,
  renderPhase14ExecutionResult,
  renderPhase14ExecutionStatus,
} from "../phase-14/execution.js";
import { executePhase14BlindLabel, renderPhase14LabelExecutionResult } from "../phase-14/label-execution.js";
import {
  buildPhase14EffectLedger,
  buildPhase14TrialLedger,
  renderPhase14EffectLedger,
  renderPhase14TrialLedger,
} from "../phase-14/measurement.js";
import {
  buildPhase14PackageLock,
  buildPhase14ScenarioLock,
  parsePhase14FamilyId,
  parsePhase14StarterProfile,
  phase14ChallengePackage,
  renderPhase14PackageLock,
  renderPhase14ScenarioLock,
  writeChallengePackage,
} from "../phase-14/packages.js";
import { buildPhase14Preflight, renderPhase14Preflight } from "../phase-14/preflight.js";
import { phase15Json } from "../phase-15/corpus.js";
import {
  phase15CandidateQueueArtifact,
  phase15ComparisonArtifact,
  phase15CorrectionsArtifact,
  phase15ProbeResultsArtifact,
  phase15ProvenanceArtifact,
  phase15ReaderPacketsArtifact,
  runPhase15Discovery,
} from "../phase-15/discovery.js";
import { phase16Json, runPhase16Calibration } from "../phase-16/calibration.js";
import {
  phase16ContinuationComparisonArtifact,
  phase16ContinuationProbesArtifact,
  phase16ContinuationReviewsArtifact,
  phase16ContinuationStatusArtifact,
  runPhase16Continuation,
} from "../phase-16/continuation.js";
import {
  phase16ComparisonArtifact,
  phase16ContractsArtifact,
  phase16CorrectionsArtifact,
  phase16GateArtifact,
  phase16InputHashesArtifact,
  phase16PacketsArtifact,
  phase16PreflightArtifact,
  phase16ProbesArtifact,
  phase16QueueArtifact,
  phase16ReviewsArtifact,
  phase16SourceArtifact,
  phase16TraceabilityArtifact,
  runPhase16Discovery,
} from "../phase-16/discovery.js";
import {
  executePhase16ReaderReview,
  nextPhase16Review,
  phase16ReviewExecutionJson,
} from "../phase-16/review-execution.js";
import {
  executePhase17Attempt,
  nextPhase17Attempt,
  renderPhase17ExecutionResult,
} from "../phase-17/execution.js";
import { buildPhase17TrialLedger, phase17TrialLedgerJson } from "../phase-17/measurement.js";
import { phase17PackageControlsJson, runPhase17PackageControls } from "../phase-17/package-controls.js";
import { phase17PreflightJson, runPhase17Preflight } from "../phase-17/preflight.js";
import { phase17ProbeAuditJson, runPhase17ProbeAudit } from "../phase-17/probe-audit.js";
import { phase17ProbeV2Json, runPhase17ProbeV2 } from "../phase-17/probe-v2-run.js";
import { buildPhase19ReviewLedger } from "../phase-19/candidate-review.js";
import {
  buildPhase19Reranking,
  buildPhase19UiLabelLedger,
  buildPhase19UiPacketManifest,
  phase19Json,
} from "../phase-19/evidence-rerank.js";
import { readPhase19Reranking } from "../phase-19/history.js";
import {
  executePhase19CandidateReview,
  executePhase19UiLabel,
  nextPhase19CandidateReview,
  nextPhase19UiLabel,
  phase19ExecutionJson,
  phase19ReaderPreflight,
} from "../phase-19/reader-execution.js";
import {
  measurePhase13,
  renderPhase13DesignMatrix,
  renderPhase13Results,
  renderPhase13TransferLab,
} from "../reports/phase-13-transfer.js";
import { renderPhase14OperatorEffects } from "../reports/phase-14-operator-effects.js";
import { renderPhase15DiscoveryEngine } from "../reports/phase-15-discovery-engine.js";
import { renderPhase16DiscoveryV3 } from "../reports/phase-16-discovery-v3.js";
import { renderPhase17CaaValidation } from "../reports/phase-17-caa-validation.js";
import { renderPhase19EvidenceRerank } from "../reports/phase-19-evidence-rerank.js";
import { challengeHash } from "../trials/run.js";
import { emit, flag, positional } from "./arguments.js";

export function phase13Dispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    const results = measurePhase13(root);
    if (sub === "report") emit(argv, renderPhase13TransferLab(results));
    else if (sub === "results") emit(argv, renderPhase13Results(results));
    else if (sub === "design") emit(argv, renderPhase13DesignMatrix(results));
    else throw new Error(`unknown phase13 subcommand "${sub}"; expected report, results or design`);
    return 0;
  }
}

export function phase14Dispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "challenge") {
      const family = flag(argv, "--family");
      const starter = flag(argv, "--starter");
      const out = flag(argv, "--out");
      if (family === null || starter === null || out === null) {
        throw new Error("phase14 challenge needs --family, --starter and --out");
      }
      const familyId = parsePhase14FamilyId(family);
      const starterProfile = parsePhase14StarterProfile(starter);
      const pkg = phase14ChallengePackage(root, familyId, starterProfile);
      writeChallengePackage(pkg, out);
      process.stdout.write(
        `wrote ${pkg.files.length} files for ${familyId}/${starterProfile} at ${challengeHash(pkg)} to ${out}\n`,
      );
    } else if (sub === "status") process.stdout.write(renderPhase14ExecutionStatus(root));
    else if (sub === "execute") {
      const attemptId = flag(argv, "--attempt");
      if (attemptId === null) throw new Error("phase14 execute needs --attempt");
      parsePhase14AttemptId(root, attemptId);
      process.stdout.write(renderPhase14ExecutionResult(executePhase14Attempt(root, attemptId)));
    } else if (sub === "label") {
      const attemptId = flag(argv, "--attempt");
      const reader = flag(argv, "--reader");
      if (attemptId === null || (reader !== "openai" && reader !== "anthropic")) {
        throw new Error("phase14 label needs --attempt and --reader openai|anthropic");
      }
      process.stdout.write(
        renderPhase14LabelExecutionResult(executePhase14BlindLabel(root, attemptId, reader)),
      );
    } else if (sub === "report") emit(argv, renderPhase14OperatorEffects(root));
    else if (sub === "packages") emit(argv, renderPhase14PackageLock(buildPhase14PackageLock(root)));
    else if (sub === "scenarios") emit(argv, renderPhase14ScenarioLock(buildPhase14ScenarioLock(root)));
    else if (sub === "preflight") emit(argv, renderPhase14Preflight(buildPhase14Preflight(root)));
    else if (sub === "trials") emit(argv, renderPhase14TrialLedger(buildPhase14TrialLedger(root)));
    else if (sub === "effects") emit(argv, renderPhase14EffectLedger(buildPhase14EffectLedger(root)));
    else {
      throw new Error(
        `unknown phase14 subcommand "${sub}"; expected report, packages, scenarios, preflight, trials, effects, challenge, status, execute or label`,
      );
    }
    return 0;
  }
}

export function phase15Dispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    const run = runPhase15Discovery(root);
    if (sub === "report") emit(argv, renderPhase15DiscoveryEngine(root));
    else if (sub === "provenance") emit(argv, phase15Json(phase15ProvenanceArtifact(run)));
    else if (sub === "queue") emit(argv, phase15Json(phase15CandidateQueueArtifact(run)));
    else if (sub === "packets") emit(argv, phase15Json(phase15ReaderPacketsArtifact(run)));
    else if (sub === "probes") emit(argv, phase15Json(phase15ProbeResultsArtifact(run)));
    else if (sub === "comparison") emit(argv, phase15Json(phase15ComparisonArtifact(run)));
    else if (sub === "corrections") emit(argv, phase15Json(phase15CorrectionsArtifact(run)));
    else {
      throw new Error(
        `unknown phase15 subcommand "${sub}"; expected report, provenance, queue, packets, probes, comparison or corrections`,
      );
    }
    return 0;
  }
}

export function phase16Dispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    const run =
      sub === "calibration" || sub === "preflight" || sub === "review" || sub === "next"
        ? null
        : runPhase16Discovery(root);
    if (sub === "report") emit(argv, renderPhase16DiscoveryV3(root));
    else if (sub === "calibration") emit(argv, phase16Json(runPhase16Calibration(root)));
    else if (sub === "sources" && run !== null) emit(argv, phase16Json(phase16SourceArtifact(run)));
    else if (sub === "contracts" && run !== null) emit(argv, phase16Json(phase16ContractsArtifact(run)));
    else if (sub === "gate" && run !== null) emit(argv, phase16Json(phase16GateArtifact(run)));
    else if (sub === "traceability" && run !== null)
      emit(argv, phase16Json(phase16TraceabilityArtifact(run)));
    else if (sub === "queue" && run !== null) emit(argv, phase16Json(phase16QueueArtifact(run)));
    else if (sub === "packets" && run !== null) emit(argv, phase16Json(phase16PacketsArtifact(run)));
    else if (sub === "reviews" && run !== null) emit(argv, phase16Json(phase16ReviewsArtifact(run)));
    else if (sub === "probes" && run !== null) emit(argv, phase16Json(phase16ProbesArtifact(run)));
    else if (sub === "comparison" && run !== null)
      emit(argv, phase16Json(phase16ComparisonArtifact(root, run)));
    else if (sub === "hashes" && run !== null) emit(argv, phase16Json(phase16InputHashesArtifact(root, run)));
    else if (sub === "corrections" && run !== null) emit(argv, phase16Json(phase16CorrectionsArtifact(run)));
    else if (sub === "preflight") emit(argv, phase16Json(phase16PreflightArtifact(root)));
    else if (sub === "next") {
      process.stdout.write(`${nextPhase16Review(root) ?? "complete"}\n`);
    } else if (sub === "review") {
      const candidateId = flag(argv, "--candidate");
      const reader = flag(argv, "--reader");
      if (candidateId === null || (reader !== "openai" && reader !== "anthropic")) {
        throw new Error("phase16 review needs --candidate and --reader openai|anthropic");
      }
      emit(argv, phase16ReviewExecutionJson(executePhase16ReaderReview(root, candidateId, reader)));
    } else if (sub === "final-reviews") {
      emit(argv, phase16Json(phase16ContinuationReviewsArtifact(runPhase16Continuation(root))));
    } else if (sub === "final-probes") {
      emit(argv, phase16Json(phase16ContinuationProbesArtifact(runPhase16Continuation(root))));
    } else if (sub === "final-comparison") {
      const continuation = runPhase16Continuation(root);
      emit(argv, phase16Json(phase16ContinuationComparisonArtifact(root, continuation)));
    } else if (sub === "continuation") {
      const continuation = runPhase16Continuation(root);
      emit(argv, phase16Json(phase16ContinuationStatusArtifact(root, continuation)));
    } else {
      throw new Error(
        `unknown phase16 subcommand "${sub}"; expected report, calibration, sources, contracts, gate, traceability, queue, packets, reviews, probes, comparison, hashes, corrections, preflight, review, next, final-reviews, final-probes, final-comparison or continuation`,
      );
    }
    return 0;
  }
}

export function phase17Dispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report") emit(argv, renderPhase17CaaValidation(root));
    else if (sub === "audit") emit(argv, phase17ProbeAuditJson(runPhase17ProbeAudit(root)));
    else if (sub === "probe") emit(argv, phase17ProbeV2Json(runPhase17ProbeV2(root)));
    else if (sub === "controls") emit(argv, phase17PackageControlsJson(runPhase17PackageControls(root)));
    else if (sub === "preflight") emit(argv, phase17PreflightJson(runPhase17Preflight(root)));
    else if (sub === "ledger") emit(argv, phase17TrialLedgerJson(buildPhase17TrialLedger(root)));
    else if (sub === "next") {
      process.stdout.write(`${nextPhase17Attempt(root)?.attemptId ?? "complete"}\n`);
    } else if (sub === "trial") {
      const attemptId = flag(argv, "--attempt");
      if (attemptId === null) throw new Error("phase17 trial needs --attempt <id>");
      const retry = Number(flag(argv, "--retry") ?? "1");
      process.stdout.write(renderPhase17ExecutionResult(executePhase17Attempt(root, attemptId, retry)));
    } else {
      throw new Error(
        `unknown phase17 subcommand "${sub}"; expected report, audit, probe, controls, preflight, ledger, next or trial`,
      );
    }
    return 0;
  }
}

export function phase19Dispatch(argv: readonly string[], root: string, command: string): number {
  {
    const sub = positional(argv, 1) ?? "report";
    if (sub === "report") emit(argv, renderPhase19EvidenceRerank(root));
    else if (sub === "preflight") emit(argv, phase19Json(phase19ReaderPreflight(root)));
    else if (sub === "packets") emit(argv, phase19Json(buildPhase19UiPacketManifest(root)));
    else if (sub === "labels") emit(argv, phase19Json(buildPhase19UiLabelLedger(root)));
    else if (sub === "rerank") emit(argv, phase19Json(buildPhase19Reranking(root)));
    else if (sub === "retained-rerank") emit(argv, phase19Json(readPhase19Reranking(root)));
    else if (sub === "reviews") emit(argv, phase19Json(buildPhase19ReviewLedger(root)));
    else if (sub === "next-label") {
      process.stdout.write(`${JSON.stringify(nextPhase19UiLabel(root))}\n`);
    } else if (sub === "label") {
      const packetId = flag(argv, "--packet");
      const reader = flag(argv, "--reader");
      if (packetId === null || (reader !== "openai" && reader !== "anthropic")) {
        throw new Error("phase19 label needs --packet and --reader openai|anthropic");
      }
      process.stdout.write(phase19ExecutionJson(executePhase19UiLabel(root, packetId, reader)));
    } else if (sub === "next-review") {
      process.stdout.write(`${JSON.stringify(nextPhase19CandidateReview(root))}\n`);
    } else if (sub === "review") {
      const candidateId = flag(argv, "--candidate");
      const reader = flag(argv, "--reader");
      if (candidateId === null || (reader !== "openai" && reader !== "anthropic")) {
        throw new Error("phase19 review needs --candidate and --reader openai|anthropic");
      }
      process.stdout.write(phase19ExecutionJson(executePhase19CandidateReview(root, candidateId, reader)));
    } else {
      throw new Error(
        `unknown phase19 subcommand "${sub}"; expected report, preflight, packets, labels, rerank, reviews, next-label, label, next-review or review`,
      );
    }
    return 0;
  }
}
