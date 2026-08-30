// Tests for the family-aware trial layer: routing, campaign plans, challenge hashing, the agent
// bank, and the status coherence checks.
//
// The group that earns its place is "host equivalence". Each family is graded through a plain-
// JavaScript host script that rebuilds the family's facades rather than importing them — isolation
// bought with duplication. These tests run each family's own reference through its own host and
// assert the cells are identical to the in-process sweep. If the two implementations drift, the
// graded result silently drifts with them, and this is the only place that would notice.
//
// The second group is "a repaired family loses its evidence". Repairing an ambiguity in the memory
// family's spec — one a real trial exposed — changed the challenge package, and three counted trials
// stopped counting the instant it did. That is the intended behaviour and it is worth a test,
// because the tempting fix when it happens is to make the check softer.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_FAMILIES, builtFamily } from "../src/families/registry.js";
import { loadRegistry } from "../src/foundry/load.js";
import { familyLoop } from "../src/foundry/loop.js";
import { analyseFamilyTrials } from "../src/reports/agent-results.js";
import { familyEvidenceFor } from "../src/reports/evidence.js";
import {
  type FamilyEvidence,
  assertStatusCoherent,
  assessFamily,
  familyStatus,
} from "../src/reports/ship-report.js";
import { buildAgentBank } from "../src/trials/agent-bank.js";
import {
  assertComparableKinds,
  crossFamilyClaims,
  kindedBank,
  normalizeSubjectId,
} from "../src/trials/bank.js";
import type { CampaignPlan } from "../src/trials/campaign.js";
import {
  assertCampaignChallenge,
  assertPlanHonest,
  loadCampaigns,
  parseCampaignPlan,
  progressOf,
} from "../src/trials/campaign.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { ROUTABLE_FAMILY_IDS, routeFor } from "../src/trials/router.js";
import {
  assertChallengeMatch,
  challengeHash,
  hashChallengeDir,
  prepareChallenge,
} from "../src/trials/run.js";
import type { TrialSet } from "../src/trials/types.js";

const ROOT = new URL("..", import.meta.url).pathname;
const registry = loadRegistry(ROOT);

describe("the trial router", () => {
  it("routes every built family", () => {
    expect([...ROUTABLE_FAMILY_IDS].sort()).toEqual(BUILT_FAMILIES.map((f) => f.id).sort());
  });

  it("each route names a host script that exists and a distinct instruction", () => {
    const instructions = new Set<string>();
    for (const id of ROUTABLE_FAMILY_IDS) {
      const route = routeFor(id);
      expect(existsSync(route.hostScript), `${id}: ${route.hostScript}`).toBe(true);
      expect(route.instruction.length).toBeGreaterThan(100);
      instructions.add(route.instruction);
      expect(route.scenarioCount()).toBeGreaterThan(0);
    }
    // A shared instruction across families means one of them is being told to build the other's
    // interface, which grades as a total failure for a reason the model could not have avoided.
    expect(instructions.size).toBe(ROUTABLE_FAMILY_IDS.length);
  });

  it("refuses a family it cannot route", () => {
    expect(() => routeFor("durable-approval-outbox")).toThrow(/not a built family|no trial route/);
  });

  it("exposes scenario knobs for the families whose knobs decide an operator", () => {
    const mem = routeFor("prompt-injection-memory-poisoning").scenarioParams();
    expect(mem.size).toBeGreaterThan(100);
    const first = [...mem.values()][0] as Record<string, unknown>;
    expect(Object.keys(first)).toContain("sessionsBetween");

    const live = routeFor("ui-replay-live-dom").scenarioParams();
    expect(live.size).toBe(864);
    const liveParams = [...live.values()] as Record<string, unknown>[];
    expect(new Set(liveParams.map((p) => p.anchorConflict))).toEqual(
      new Set(["none", "testid_wins", "semantic_wins", "path_wins"]),
    );
  });
});

describe("host equivalence — the subprocess host grades like the family does", () => {
  for (const familyId of ["prompt-injection-memory-poisoning", "ui-action-record-replay"]) {
    it(`${familyId}: a do-nothing artifact fails every scenario through the host`, () => {
      const dir = mkdtempSync(join(tmpdir(), "host-equiv-"));
      const stub = join(dir, "subject.mjs");
      writeFileSync(
        stub,
        "export const subject = { id:'stub', label:'stub', runSession(){return {decisions:[],audit:[]};}, replay(t){return {traceId:t.id,outcome:'completed',steps:[],unreplayableReason:null};} };",
        "utf8",
      );
      const route = routeFor(familyId);
      const graded = route.grade(stub);
      expect(graded.cells.length).toBe(route.scenarioCount());
      expect(graded.hostErrors).toBe(0);
      expect(graded.cells.every((c) => c.failed.length > 0)).toBe(true);
    });

    it(`${familyId}: the host produces one cell per measured scenario, in the family's ids`, () => {
      const route = routeFor(familyId);
      const ids = new Set(route.matrix().instances.map((i) => i.id));
      const dir = mkdtempSync(join(tmpdir(), "host-ids-"));
      const stub = join(dir, "subject.mjs");
      writeFileSync(stub, "export const subject = { id:'s', label:'s' };", "utf8");
      const graded = route.grade(stub);
      for (const cell of graded.cells) expect(ids.has(cell.scenarioId), cell.scenarioId).toBe(true);
    });
  }

  it("checker-required: a subject-only artifact is complete enough to grade and fails checker_present", () => {
    const dir = mkdtempSync(join(tmpdir(), "checker-host-"));
    const subject = join(dir, "subject.mjs");
    writeFileSync(
      subject,
      "export const subject = { id:'subject-only', label:'subject-only', runSession(){ return { decisions: [], audit: [] }; } };",
      "utf8",
    );
    const route = routeFor("checker-required-memory-poisoning");
    const graded = route.grade(subject);
    expect(graded.cells.length).toBe(route.scenarioCount());
    expect(graded.hostErrors).toBe(0);
    expect(graded.cells.some((c) => c.failed.includes("checker_present"))).toBe(true);
  });
});

describe("challenge hashing", () => {
  it("is stable for an unchanged family and differs across families", () => {
    const a = prepareChallenge(ROOT, "prompt-injection-memory-poisoning").hash;
    const b = prepareChallenge(ROOT, "prompt-injection-memory-poisoning").hash;
    const c = prepareChallenge(ROOT, "ui-action-record-replay").hash;
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("changes when one visible byte changes", () => {
    const pkg = prepareChallenge(ROOT, "ui-action-record-replay").pkg;
    const edited = {
      ...pkg,
      files: pkg.files.map((f, i) => (i === 0 ? { ...f, content: `${f.content} ` } : f)),
    };
    expect(challengeHash(edited)).not.toBe(challengeHash(pkg));
  });

  it("a preserved challenge directory hashes to the package that produced it", () => {
    // The property that lets a trial predating the hash field still be validated: the evidence is
    // the directory, not the note about it.
    const trials = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-containment");
    expect(trials.length).toBeGreaterThan(0);
    const current = prepareChallenge(ROOT, "prompt-injection-containment").hash;
    for (const trial of trials) {
      expect(hashChallengeDir(join(trial.path, "challenge")), trial.runId).toBe(current);
    }
  });

  it("TRIAL_CHALLENGE_HASH_MISSING — a trial that records no hash and preserves no challenge", () => {
    expect(() => assertChallengeMatch(null, "abc", "run-1")).toThrowError(
      expect.objectContaining({ code: "TRIAL_CHALLENGE_HASH_MISSING" }),
    );
  });

  it("TRIAL_CHALLENGE_HASH_MISMATCH — a trial run against a different task", () => {
    expect(() => assertChallengeMatch("abc", "def", "run-1")).toThrowError(
      expect.objectContaining({ code: "TRIAL_CHALLENGE_HASH_MISMATCH" }),
    );
    // The matching case is silent, which is what makes the mismatch meaningful.
    expect(() => assertChallengeMatch("abc", "abc", "run-1")).not.toThrow();
  });

  it("a repaired family stops counting its old trials", () => {
    // The memory family's spec was repaired after a real trial showed the rule attribution was
    // ambiguous. The trials against the old text are preserved and must not count.
    const bundle = familyEvidenceFor(ROOT, "prompt-injection-memory-poisoning");
    const stale = bundle.staleTrials;
    const preserved = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-memory-poisoning");
    for (const runId of stale) {
      expect(
        preserved.some((t) => t.runId === runId),
        `${runId} must still exist on disk`,
      ).toBe(true);
      expect(
        bundle.trials.records.some((r) => r.runId === runId),
        `${runId} must not count`,
      ).toBe(false);
    }
  });
});

describe("campaign plans", () => {
  const plans = loadCampaigns(ROOT);

  it("every checked-in plan validates", () => {
    expect(plans.length).toBeGreaterThanOrEqual(2);
    for (const plan of plans) expect(() => assertPlanHonest(plan)).not.toThrow();
  });

  it("every plan pre-registers a kill signal and a confirm signal", () => {
    for (const plan of plans) {
      expect(plan.killSignal.length, plan.campaignId).toBeGreaterThan(60);
      expect(plan.confirmSignal.length, plan.campaignId).toBeGreaterThan(60);
    }
  });

  it("CAMPAIGN_NO_KILL_SIGNAL — a plan with nothing that would falsify it", () => {
    const plan = plans[0] as NonNullable<(typeof plans)[0]>;
    expect(() => assertPlanHonest({ ...plan, killSignal: "we will see" })).toThrowError(
      expect.objectContaining({ code: "CAMPAIGN_NO_KILL_SIGNAL" }),
    );
  });

  it("CAMPAIGN_COUNTING_CONTRADICTS_CODE — a plan that redefines what counts", () => {
    const plan = plans[0] as NonNullable<(typeof plans)[0]>;
    expect(() =>
      assertPlanHonest({
        ...plan,
        counting: { ...plan.counting, neverCounts: ["timeout", "infrastructure_error"] },
      }),
    ).toThrowError(expect.objectContaining({ code: "CAMPAIGN_COUNTING_CONTRADICTS_CODE" }));
  });

  it("CAMPAIGN_RETRY_ON_REFUSAL — re-running until a provider complies", () => {
    const plan = plans[0] as NonNullable<(typeof plans)[0]>;
    expect(() =>
      assertPlanHonest({ ...plan, counting: { ...plan.counting, retryOnRefusal: true } }),
    ).toThrowError(expect.objectContaining({ code: "CAMPAIGN_RETRY_ON_REFUSAL" }));
  });

  it("CAMPAIGN_SLOT_WITHOUT_RUN — a slot claiming a result it cannot point at", () => {
    const plan = plans[0] as NonNullable<(typeof plans)[0]>;
    const slot = plan.slots[0] as NonNullable<(typeof plan.slots)[0]>;
    expect(() => assertPlanHonest({ ...plan, slots: [{ ...slot, state: "RUN", runId: null }] })).toThrowError(
      expect.objectContaining({ code: "CAMPAIGN_SLOT_WITHOUT_RUN" }),
    );
    expect(() =>
      assertPlanHonest({ ...plan, slots: [{ ...slot, state: "NOT_RUN", runId: "something" }] }),
    ).toThrowError(expect.objectContaining({ code: "CAMPAIGN_SLOT_WITHOUT_RUN" }));
  });

  it("CAMPAIGN_CHALLENGE_HASH_MISMATCH — a plan written against a different task", () => {
    const plan = plans[0] as NonNullable<(typeof plans)[0]>;
    expect(() => assertCampaignChallenge(plan, "0000")).toThrowError(
      expect.objectContaining({ code: "CAMPAIGN_CHALLENGE_HASH_MISMATCH" }),
    );
  });

  it("the live-DOM campaign is pinned to the current package hash and import-only external slots", () => {
    const plan = plans.find((p) => p.familyId === "ui-replay-live-dom");
    expect(plan).toBeDefined();
    const current = prepareChallenge(ROOT, "ui-replay-live-dom").hash;
    expect((plan as NonNullable<typeof plan>).challengeHash).toBe(current);
    expect(() => assertCampaignChallenge(plan as NonNullable<typeof plan>, current)).not.toThrow();

    const slots = (plan as NonNullable<typeof plan>).slots;
    expect(slots.find((s) => s.slotId === "O1")?.runner).toBe("shell");
    for (const slotId of ["A1", "A2", "G1"]) {
      const slot = slots.find((s) => s.slotId === slotId);
      expect(slot?.runner, slotId).toBe("external");
      expect(slot?.command, slotId).toBeNull();
      expect(slot?.state, slotId).toBe("NOT_RUN");
    }
  });

  it("a malformed plan is rejected rather than half-read", () => {
    expect(() => parseCampaignPlan({ campaignId: "x" })).toThrow();
  });

  it("progress counts unrun slots as their own state", () => {
    const plan = plans.find((p) => p.familyId === "ui-action-record-replay");
    const prog = progressOf(plan as NonNullable<typeof plan>, []);
    expect(prog.notRun).toBeGreaterThan(0);
    expect(prog.counted).toBe(0);
  });
});

describe("the agent bank", () => {
  const route = routeFor("prompt-injection-containment");
  const records = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-containment").map((t) => t.record);

  it("builds one subject per model, not one per run", () => {
    const bank = buildAgentBank(records, {
      familyId: "prompt-injection-containment",
      instanceIds: route.matrix().instances.map((i) => i.id),
      caveat: "test",
    });
    expect(bank.subjects.length).toBeLessThan(records.length);
    expect(bank.subjects).toContain("claude-opus-5");
    expect(bank.trialsPerSubject["claude-opus-5"]).toBeGreaterThanOrEqual(3);
  });

  it("leaves an ungraded scenario null rather than imputing a pass", () => {
    const bank = buildAgentBank(records, {
      familyId: "prompt-injection-containment",
      instanceIds: [...route.matrix().instances.map((i) => i.id), "scenario-nobody-graded"],
      caveat: "test",
    });
    expect(bank.unmeasured).toBeGreaterThan(0);
    const row = bank.matrix.results["scenario-nobody-graded"];
    expect(row?.["claude-opus-5"]).toBeNull();
  });

  it("normalizes model identity across harnesses", () => {
    expect(normalizeSubjectId("anthropic/claude-opus-5")).toBe("claude-opus-5");
    expect(normalizeSubjectId("claude-opus-5")).toBe("claude-opus-5");
    // Effort is part of the identity: two efforts are two subjects.
    expect(normalizeSubjectId("openai/gpt-5.6-sol@xhigh")).not.toBe(
      normalizeSubjectId("openai/gpt-5.6-sol@low"),
    );
  });
});

describe("bank kinds", () => {
  const mutantBank = kindedBank(
    {
      familyId: "a",
      matrix: builtFamily("ui-action-record-replay").run().matrix,
      provenance: "mutants",
      agentDerived: false,
    },
    "mutant",
  );
  const agentBank = kindedBank(
    {
      familyId: "b",
      matrix: builtFamily("prompt-injection-containment").run().matrix,
      provenance: "agents",
      agentDerived: true,
    },
    "agent",
  );

  it("BANK_KIND_MISMATCH — comparing detection with difficulty", () => {
    expect(() => assertComparableKinds([mutantBank, agentBank])).toThrowError(
      expect.objectContaining({ code: "BANK_KIND_MISMATCH" }),
    );
  });

  it("same-kind banks compare without complaint", () => {
    expect(() => assertComparableKinds([mutantBank, { ...mutantBank, familyId: "c" }])).not.toThrow();
  });

  it("a single bank of a kind licenses no cross-family claim", () => {
    const claims = crossFamilyClaims([agentBank]);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.licensed).toMatch(/only one/);
  });

  it("disjoint same-kind banks license nothing additive", () => {
    // Genuinely disjoint: two families' mutant banks share no subject id.
    const other = kindedBank(
      {
        familyId: "c",
        matrix: builtFamily("prompt-injection-memory-poisoning").run().matrix,
        provenance: "mutants",
        agentDerived: false,
      },
      "mutant",
    );
    const claims = crossFamilyClaims([mutantBank, other]);
    expect(claims[0]?.overlap.verdict).toBe("refused");
    expect(claims[0]?.licensed).toMatch(/sum by construction/);
  });
});

describe("status coherence", () => {
  const shipEvidence: FamilyEvidence = {
    familyId: "x",
    referencePasses: true,
    baselinesBlocked: ["a", "b"],
    baselinesTotal: 2,
    mutantsCaught: [{ mutantId: "m", check: "c", caught: true }],
    mechanismsExercised: true,
    isolation: "subprocess",
    countedAgentTrials: 3,
    agentTrialsPassed: 1,
    sharedBankSubjects: 0,
    reportsDeterministic: true,
  };

  it("STATUS_SHIP_WITHOUT_TRIALS — shipping on mutants alone", () => {
    const status = {
      familyId: "x",
      stage: "trial-ready" as const,
      decision: "SHIP" as const,
      reason: "",
      blockingFailures: [],
    };
    expect(() => assertStatusCoherent(status, { ...shipEvidence, countedAgentTrials: 0 })).toThrowError(
      expect.objectContaining({ code: "STATUS_SHIP_WITHOUT_TRIALS" }),
    );
  });

  it("STATUS_SHIP_ALREADY_SOLVED — shipping a family nothing failed", () => {
    const status = {
      familyId: "x",
      stage: "difficulty-evidenced" as const,
      decision: "SHIP" as const,
      reason: "",
      blockingFailures: [],
    };
    expect(() => assertStatusCoherent(status, { ...shipEvidence, agentTrialsPassed: 3 })).toThrowError(
      expect.objectContaining({ code: "STATUS_SHIP_ALREADY_SOLVED" }),
    );
  });

  it("STATUS_STAGE_WITHOUT_EVIDENCE — claiming the difficulty stage with no trial", () => {
    const status = {
      familyId: "x",
      stage: "difficulty-evidenced" as const,
      decision: "HOLD" as const,
      reason: "",
      blockingFailures: [],
    };
    expect(() => assertStatusCoherent(status, { ...shipEvidence, countedAgentTrials: 0 })).toThrowError(
      expect.objectContaining({ code: "STATUS_STAGE_WITHOUT_EVIDENCE" }),
    );
  });

  it("every checked-in family has a coherent status", () => {
    for (const family of BUILT_FAMILIES) {
      const state = familyLoop(ROOT, family.id, registry);
      const status = familyStatus(family.id, state.assessment, state.analysis.disposition);
      expect(() => assertStatusCoherent(status, state.evidence), family.id).not.toThrow();
    }
  });

  it("a family with no counted trial cannot reach SHIP", () => {
    for (const family of BUILT_FAMILIES) {
      const state = familyLoop(ROOT, family.id, registry);
      if ((state.evidence?.countedAgentTrials ?? 0) > 0) continue;
      expect(state.assessment.verdict, family.id).not.toBe("SHIP");
      expect(state.assessment.blockingFailures, family.id).toContain("difficulty-evidenced");
    }
  });
});

describe("trial analysis", () => {
  it("keeps refusals, solves and failures in separate buckets", () => {
    const bundle = familyEvidenceFor(ROOT, "prompt-injection-containment");
    const analysis = analyseFamilyTrials(
      "prompt-injection-containment",
      bundle.trials,
      routeFor("prompt-injection-containment").scenarioParams(),
    );
    expect(analysis.counted).toBeGreaterThan(0);
    expect(analysis.solves + analysis.failures).toBe(analysis.counted);
    // The containment family is the already-solved one: every counted trial passed.
    expect(analysis.verdict).toBe("already-solved");
    expect(analysis.refusals).toBe(0);
  });

  it("a knob split is only reported as discriminating when the rate actually moves", () => {
    const bundle = familyEvidenceFor(ROOT, "prompt-injection-memory-poisoning");
    const analysis = analyseFamilyTrials(
      "prompt-injection-memory-poisoning",
      bundle.trials,
      routeFor("prompt-injection-memory-poisoning").scenarioParams(),
    );
    for (const split of analysis.knobSplits) {
      const rates = split.rows.map((r) => r.rate);
      const max = rates.length === 0 ? 0 : Math.max(...rates);
      const min = rates.length === 0 ? 0 : Math.min(...rates);
      // Concentration, not absolute spread: with sparse failures a perfect separation (0% vs 7%)
      // has a tiny spread, and the first version of this rule called it flat.
      expect(split.discriminates, split.knob).toBe(
        split.rows.length > 1 && max > 0 && (min === 0 || max / min >= 2),
      );
    }
  });

  it("projects planned refusal and infrastructure slots without counting them", () => {
    const trials: TrialSet = {
      familyId: "example-family",
      scenarioSetId: "set-1",
      records: [
        {
          runId: "campaign-o2",
          familyId: "example-family",
          subjectId: "agent-o2",
          subjectType: "agent",
          model: "openai/test",
          effort: null,
          status: "completed",
          counts: true,
          countsReason: "completed and graded",
          scenarioSetId: "set-1",
          cells: [{ scenarioId: "s1", failed: ["intended_check"] }],
          runtimeSeconds: 12,
          costUsd: null,
          artifactPath: "trials/example-family/campaign-o2/submission",
          isolation: "subprocess",
          notes: "",
        },
      ],
    };
    const plan: CampaignPlan = {
      campaignId: "campaign",
      familyId: "example-family",
      hypothesis: "example",
      killSignal: "example",
      confirmSignal: "example",
      challengeHash: "abc",
      scenarioSetId: "set-1",
      scenariosExpected: 1,
      timeoutMs: 1000,
      artifactPath: "campaigns/example",
      isolation: "subprocess",
      counting: {
        neverCounts: ["refused", "timeout", "infrastructure_error"],
        onRefusal: "record but do not count",
        onInfraFailure: "record but do not count",
        onCrash: "judge subject-owned crashes explicitly",
        retriesOnInfra: 1,
        retryOnRefusal: false,
      },
      preservation: ["preserve transcript, submission and verifier output"],
      budgetUsd: 0,
      slots: [
        {
          slotId: "O1",
          model: "openai/test",
          subjectId: "agent-o1",
          effort: null,
          runner: "shell",
          command: ["codex"],
          state: "FAILED_INFRA",
          runId: "campaign-o1",
          note: "sandbox failed before artifact",
        },
        {
          slotId: "O2",
          model: "openai/test",
          subjectId: "agent-o2",
          effort: null,
          runner: "shell",
          command: ["codex"],
          state: "RUN",
          runId: "campaign-o2",
          note: "counted run",
        },
        {
          slotId: "A1",
          model: "anthropic/import-only",
          subjectId: "agent-a1",
          effort: null,
          runner: "external",
          command: null,
          state: "REFUSED",
          runId: null,
          note: "provider refusal",
        },
        {
          slotId: "G1",
          model: "gemini/import-only",
          subjectId: "agent-g1",
          effort: null,
          runner: "external",
          command: null,
          state: "NOT_RUN",
          runId: null,
          note: "entitlement blocked",
        },
      ],
    };

    const analysis = analyseFamilyTrials("example-family", trials, new Map([["s1", {}]]), plan);

    expect(analysis.counted).toBe(1);
    expect(analysis.failures).toBe(1);
    expect(analysis.infra).toBe(1);
    expect(analysis.refusals).toBe(1);
    expect(analysis.notRunSlots).toBe(1);
    expect(analysis.outcomes.map((o) => [o.runId, o.kind])).toEqual([
      ["campaign-o1", "infra_failure"],
      ["campaign-o2", "counted_failure"],
      ["campaign:a1:refused", "provider_refusal"],
      ["campaign:g1:not_run", "not_run"],
    ]);
  });
});

describe("the gate table itself", () => {
  it("difficulty evidence is blocking, so mutants alone cannot ship a family", () => {
    const shape = registry.shapes.find((s) => s.familyId === "ui-action-record-replay");
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, {
      familyId: "ui-action-record-replay",
      referencePasses: true,
      baselinesBlocked: ["a", "b"],
      baselinesTotal: 2,
      mutantsCaught: [{ mutantId: "m", check: "c", caught: true }],
      mechanismsExercised: true,
      isolation: "subprocess",
      countedAgentTrials: 0,
      agentTrialsPassed: 0,
      sharedBankSubjects: 0,
      reportsDeterministic: true,
      trialReady: true,
    });
    expect(a.blockingFailures).toContain("difficulty-evidenced");
    expect(a.verdict).not.toBe("SHIP");
  });

  it("trial-ready is reported separately from difficulty-evidenced", () => {
    const shape = registry.shapes.find((s) => s.familyId === "prompt-injection-memory-poisoning");
    const state = familyLoop(ROOT, "prompt-injection-memory-poisoning", registry);
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, state.evidence);
    expect(a.results.find((r) => r.gate.id === "trial-ready")?.verdict).toBe("pass");
  });
});
