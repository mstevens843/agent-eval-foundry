import {
  type DeploymentCall,
  type EffectRecord,
  type Scenario,
  decideRollout,
  expectedEffectId,
} from "./truth.js";
import type { AuditEvent, Decision, SubjectReport } from "./types.js";

export const CHECKS = [
  "decision_matches_truth",
  "current_alias_reconciled",
  "no_stale_alias_assumption",
  "concrete_version_attributed",
  "correct_baseline_compared",
  "rollout_window_respected",
  "rollback_required",
  "continue_required",
  "quarantine_when_insufficient",
  "no_subject_owned_model_truth",
  "audit_matches_rollout_source",
  "liveness",
  "deterministic_result",
  "report_matches_ledger",
  "no_duplicate_effect",
  "mechanism_fired",
] as const;
export type CheckName = (typeof CHECKS)[number];

export interface Failure {
  readonly check: CheckName;
  readonly detail: string;
}

export interface VerifyInput {
  readonly scenario: Scenario;
  readonly reports: readonly SubjectReport[];
  readonly effects: readonly EffectRecord[];
  readonly calls: readonly DeploymentCall[];
}

const fail = (check: CheckName, detail: string): Failure => ({ check, detail });

const uniqueFailures = (failures: readonly Failure[]): readonly Failure[] => {
  const seen = new Set<string>();
  const out: Failure[] = [];
  for (const failure of failures) {
    const key = `${failure.check}|${failure.detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(failure);
    }
  }
  return out;
};

function callsForAttempt(calls: readonly DeploymentCall[], attempt: number): readonly DeploymentCall[] {
  return calls.filter((call) => call.attempt === attempt);
}

function attemptedCurrentObservation(calls: readonly DeploymentCall[], attempt: number): boolean {
  const own = callsForAttempt(calls, attempt);
  return (
    own.some((call) => call.method === "currentAlias") &&
    own.some((call) => call.method === "rolloutLedger") &&
    own.some((call) => call.method === "evalStream") &&
    own.some((call) => call.method === "baseline")
  );
}

function auditMatchesCurrent(scenario: Scenario, audit: AuditEvent): boolean {
  return (
    audit.usedSubjectModelClaim === false &&
    audit.observedAlias === scenario.currentAlias.alias &&
    audit.observedCurrentVersion === scenario.currentAlias.version &&
    audit.observedGeneration === scenario.currentAlias.generation &&
    audit.observedPhase === scenario.currentAlias.phase &&
    audit.observedCanaryWindow === scenario.currentAlias.canaryWindow &&
    audit.observedBaselineVersion === scenario.baseline.version &&
    audit.observedEvalSampleIds.join("|") ===
      scenario.evalStream.map((sample) => sample.sampleId).join("|") &&
    audit.observedEvalServedVersions.join("|") ===
      scenario.evalStream.map((sample) => sample.servedVersion).join("|")
  );
}

function decisionMatchesExpected(decision: Decision | undefined, scenario: Scenario): boolean {
  const expected = scenario.expected;
  return (
    decision !== undefined &&
    decision.decision === expected.decision &&
    decision.reason === expected.reason &&
    decision.alias === scenario.view.request.alias &&
    decision.concreteVersion === expected.concreteVersion &&
    decision.baselineVersion === expected.baselineVersion
  );
}

function effectViolatesTruth(scenario: Scenario, effect: EffectRecord): boolean {
  const expected = scenario.expected;
  const e = effect.effect;
  return (
    !expected.requiredEffects.includes(expectedEffectId(scenario.view.request, e.decision)) ||
    e.alias !== scenario.view.request.alias ||
    e.decision !== expected.decision ||
    e.concreteVersion !== expected.concreteVersion ||
    e.baselineVersion !== expected.baselineVersion ||
    e.idempotencyKey !== scenario.view.request.idempotencyKey
  );
}

function staleCacheTrapFired(scenario: Scenario): boolean {
  return (
    scenario.params.cacheState !== "fresh" &&
    scenario.view.cachedAlias.version !== scenario.currentAlias.version
  );
}

function rolloutWindowClosed(scenario: Scenario): boolean {
  return scenario.currentAlias.canaryWindow === "closed" || scenario.currentAlias.phase === "pre_canary";
}

export function verify(input: VerifyInput): readonly Failure[] {
  const { scenario, reports, effects, calls } = input;
  const failures: Failure[] = [];
  const actionId = scenario.view.request.id;
  const expected = scenario.expected;
  const ownEffects = effects.filter((effect) => effect.actionId === actionId);
  const decisions = reports.flatMap((report) =>
    report.decisions.filter((decision) => decision.actionId === actionId),
  );
  const firstDecision = decisions[0];

  if (reports.length !== scenario.params.repeatCount) {
    failures.push(
      fail(
        "mechanism_fired",
        `expected ${scenario.params.repeatCount} attempt reports, saw ${reports.length}`,
      ),
    );
  }
  if (decisions.length === 0) {
    failures.push(fail("deterministic_result", "no decision reported for the rollout request"));
  }
  if (decisions.length > 1) {
    const signature = (d: Decision): string =>
      [d.decision, d.reason, d.concreteVersion ?? "null", d.baselineVersion ?? "null"].join("|");
    if (new Set(decisions.map(signature)).size > 1) {
      failures.push(fail("deterministic_result", "repeated attempts reported different decisions"));
    }
  }

  if (!decisionMatchesExpected(firstDecision, scenario)) {
    failures.push(
      fail(
        "decision_matches_truth",
        `expected ${expected.decision}/${expected.reason}, saw ${firstDecision?.decision ?? "none"}/${
          firstDecision?.reason ?? "none"
        }`,
      ),
    );
  }

  if (expected.decision === "rollback" && firstDecision?.decision !== "rollback") {
    failures.push(fail("rollback_required", "major current-version regression was not rolled back"));
  }
  if (expected.decision === "continue" && firstDecision?.decision !== "continue") {
    failures.push(fail("continue_required", "valid rollout was not continued"));
  }
  if (
    (expected.decision === "quarantine" || expected.decision === "re_evaluate") &&
    firstDecision !== undefined &&
    !["quarantine", "re_evaluate"].includes(firstDecision.decision)
  ) {
    failures.push(
      fail("quarantine_when_insufficient", "insufficient or closed-window evidence was actioned"),
    );
  }

  if (expected.decision === "continue" || expected.decision === "rollback") {
    if (ownEffects.length === 0 || firstDecision?.decision !== expected.decision) {
      failures.push(fail("liveness", "required continue/rollback decision effect did not fire"));
    }
  }

  const executeAttempts = calls.filter(
    (call) => call.method === "applyRolloutDecision" && call.actionId === actionId,
  );
  if (ownEffects.length === 0) {
    failures.push(fail("report_matches_ledger", "reported decision has no verifier-owned rollout effect"));
  }
  if (ownEffects.length > 1 || executeAttempts.length > 1) {
    failures.push(
      fail(
        "no_duplicate_effect",
        `rollout decision effect executed ${Math.max(ownEffects.length, executeAttempts.length)} times`,
      ),
    );
  }
  for (const effect of ownEffects) {
    if (effectViolatesTruth(scenario, effect)) {
      failures.push(fail("report_matches_ledger", "rollout effect contradicts expected decision truth"));
    }
  }

  for (let attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
    if (!attemptedCurrentObservation(calls, attempt)) {
      failures.push(
        fail(
          "current_alias_reconciled",
          `attempt ${attempt} did not observe current alias, rollout ledger, eval stream and baseline`,
        ),
      );
    }
  }

  if (
    staleCacheTrapFired(scenario) &&
    (firstDecision?.concreteVersion === scenario.view.cachedAlias.version ||
      !attemptedCurrentObservation(calls, 0))
  ) {
    failures.push(fail("no_stale_alias_assumption", "cached alias mapping was treated as current truth"));
  }

  if (
    firstDecision !== undefined &&
    firstDecision.concreteVersion !== null &&
    firstDecision.concreteVersion !== scenario.currentAlias.version
  ) {
    failures.push(
      fail("current_alias_reconciled", "reported concrete version is not the current alias target"),
    );
  }

  if (firstDecision !== undefined && firstDecision.baselineVersion !== scenario.baseline.version) {
    failures.push(fail("correct_baseline_compared", "decision compared against the wrong baseline version"));
  }

  const audits = reports.flatMap((report) => report.audit.filter((event) => event.actionId === actionId));
  if (audits.length === 0) {
    failures.push(fail("audit_matches_rollout_source", "no audit event for the rollout request"));
  }
  for (const report of reports) {
    for (const decision of report.decisions.filter((d) => d.actionId === actionId)) {
      const matchingAudit = report.audit.find(
        (event) => event.actionId === actionId && event.reason === decision.reason,
      );
      if (matchingAudit === undefined) {
        failures.push(
          fail("audit_matches_rollout_source", `no audit event cites decision reason ${decision.reason}`),
        );
      } else if (!auditMatchesCurrent(scenario, matchingAudit)) {
        failures.push(fail("audit_matches_rollout_source", "audit did not cite current rollout facts"));
      }
    }
  }

  if (audits.some((audit) => audit.usedSubjectModelClaim)) {
    failures.push(fail("no_subject_owned_model_truth", "audit admits using subject-owned model truth"));
  }
  if (scenario.view.subjectModelClaim !== null && firstDecision?.decision !== expected.decision) {
    failures.push(
      fail("no_subject_owned_model_truth", "subject-owned or provider summary appears to govern"),
    );
  }

  if (
    audits.some(
      (audit) =>
        audit.observedEvalServedVersions.join("|") !==
        scenario.evalStream.map((sample) => sample.servedVersion).join("|"),
    )
  ) {
    failures.push(
      fail("concrete_version_attributed", "audit did not preserve concrete served model versions"),
    );
  }

  if (
    rolloutWindowClosed(scenario) &&
    firstDecision !== undefined &&
    ["continue", "rollback"].includes(firstDecision.decision)
  ) {
    failures.push(fail("rollout_window_respected", "closed or pre-canary window was actioned"));
  }

  const recomputed = decideRollout(
    scenario.view.request,
    scenario.currentAlias,
    scenario.rolloutLedger,
    scenario.evalStream,
    scenario.baseline,
    scenario.params.reevaluation,
  );
  if (
    recomputed.decision !== expected.decision ||
    recomputed.reason !== expected.reason ||
    recomputed.concreteVersion !== expected.concreteVersion ||
    recomputed.baselineVersion !== expected.baselineVersion
  ) {
    failures.push(fail("mechanism_fired", "scenario expected decision is inconsistent with truth"));
  }

  return uniqueFailures(failures);
}
