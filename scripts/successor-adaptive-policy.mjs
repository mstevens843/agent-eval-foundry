import assert from "node:assert/strict";

export const SUCCESSOR_TASKS = [
  {
    id: "capacity-maintenance-repair",
    version: "2.0.1",
    analysisDocument: "reports/screening/third-five/13-capacity-maintenance-repair.md",
  },
  {
    id: "partial-release-repair",
    version: "2.0.1",
    analysisDocument: "reports/screening/next-five/08-partial-release-repair.md",
  },
  {
    id: "verified-installation-repair",
    version: "2.0.1",
    analysisDocument: "reports/screening/third-five/12-verified-installation-repair.md",
  },
  {
    id: "compatible-rollout-repair",
    version: "3.0.1",
    analysisDocument: "reports/screening/original-five/05-compatible-rollout-repair.md",
  },
  {
    id: "ticket-consolidation-repair",
    version: "2.0.1",
    analysisDocument: "reports/screening/next-five/09-ticket-consolidation-repair.md",
  },
];

export const providerForTrial = (trial) => {
  assert(Number.isSafeInteger(trial) && trial >= 1 && trial <= 6, "Trial must be 1 through 6");
  return trial <= 3 ? "claude" : "codex";
};

export const initialTaskState = (id) => ({
  id,
  nextTrial: 1,
  counted: 0,
  cleanFailures: 0,
  providers: { claude: 0, codex: 0 },
  stopReason: null,
  attempts: [],
});

export function nextTrial(state) {
  assert(state.nextTrial === state.counted + 1, "Counted trials must be contiguous");
  if (state.stopReason !== null || state.counted === 6) return null;
  return { trial: state.nextTrial, provider: providerForTrial(state.nextTrial) };
}

export function applyTrialOutcome(state, outcome) {
  assert(["pass", "clean-fail", "unscored"].includes(outcome), "Unknown trial outcome");
  const slot = nextTrial(state);
  assert(slot, "Task is already stopped");
  const next = structuredClone(state);
  next.attempts.push({ ...slot, outcome });
  if (outcome === "unscored") {
    next.stopReason = "infrastructure-or-unresolved-grading";
    return next;
  }
  next.counted++;
  next.providers[slot.provider]++;
  next.nextTrial++;
  if (outcome === "pass") next.stopReason = "solver-pass";
  else {
    next.cleanFailures++;
    if (next.counted === 6) next.stopReason = "six-clean-failures";
  }
  assert(next.providers.claude <= 3 && next.providers.codex <= 3);
  assert(next.cleanFailures <= next.counted && next.counted <= 6);
  return next;
}

export function campaignPlan() {
  return {
    schemaVersion: 1,
    tasks: SUCCESSOR_TASKS,
    initialCountedTrialsPerTask: 5,
    maxCountedTrialsPerTask: 6,
    maxProviderCalls: 30,
    maxConcurrent: 6,
    automaticRetries: false,
    schedule: [1, 2, 3, 4, 5, 6].map((trial) => ({
      trial,
      provider: providerForTrial(trial),
      condition:
        trial === 1
          ? "initial"
          : trial === 6
            ? "five-prior-clean-failures"
            : "all-prior-counted-trials-clean-failed",
    })),
  };
}
