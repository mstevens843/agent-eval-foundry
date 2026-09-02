// Tests for the trial orchestration layer: directories, providers, history import, and the gate that
// the real trials forced into existence.
//
// The group that earns its place is "countability is never inferred". Three real Claude trials were
// run through this layer while it was being built, and the first one died in two seconds because the
// environment redaction stripped the CLI's own credentials. It was recorded as `crashed`, uncounted,
// with the transcript preserved — which is exactly right, and is the behaviour these tests pin. A
// layer that had silently produced an empty submission would have written a trial record showing a
// model scoring zero.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildChallengePackage } from "../src/challenge/package.js";
import { runFamily } from "../src/families/prompt-injection-containment/runner.js";
import { loadRegistry } from "../src/foundry/load.js";
import { familyEvidenceFor } from "../src/reports/evidence.js";
import { assessFamily } from "../src/reports/ship-report.js";
import { computeEvidence } from "../src/reports/trial-report.js";
import { assertBankCoherent, combinedMatrixFor, computeOverlap } from "../src/trials/bank.js";
import {
  HIDDEN_IN_CHALLENGE,
  TRIAL_FILES,
  assertComparable,
  readFamilyTrials,
  readTrialDirectory,
  writeTrialDirectory,
} from "../src/trials/directory.js";
import {
  classifyHistorical,
  classifyRunKind,
  importDurableOutboxHistory,
  normalizeModel,
  parseHarborResult,
} from "../src/trials/history.js";
import {
  SUBJECT_ERROR,
  assertNoBaselineImposters,
  baselineDisqualifier,
  cellSignature,
} from "../src/trials/orchestrate.js";
import { runLocalTrials } from "../src/trials/orchestrate.js";
import { decideCountability } from "../src/trials/orchestrator.js";
import { checkProvider, providerById } from "../src/trials/provider-registry.js";
import {
  PROVIDERS,
  classifyRun,
  dockerPlan,
  getProvider,
  parseProviderUsage,
  shellAdapter,
  withUsageReporting,
} from "../src/trials/providers.js";
import { parseTrialRecord } from "../src/trials/validate.js";

const ROOT = new URL("..", import.meta.url).pathname;

const baseRecord = {
  runId: "t1",
  familyId: "fam",
  subjectId: "s1",
  subjectType: "agent" as const,
  model: "test/model",
  effort: null,
  status: "completed" as const,
  counts: true,
  countsReason: "clean",
  scenarioSetId: "set1",
  cells: [{ scenarioId: "sc1", failed: [] }],
  runtimeSeconds: 1,
  costUsd: 0,
  artifactPath: "submission",
  isolation: "subprocess" as const,
  notes: "",
};

const writeDir = (over: Partial<Parameters<typeof writeTrialDirectory>[0]> = {}) => {
  const root = mkdtempSync(join(tmpdir(), "foundry-td-"));
  writeTrialDirectory({
    root,
    familyId: "fam",
    runId: "t1",
    record: baseRecord,
    countability: { counts: true, reason: "clean", classification: "completed" },
    transcript: "ok",
    challengeFiles: [{ path: "README.md", content: "task" }],
    submissionFiles: [{ path: "subject.mjs", content: "export const subject = {};" }],
    verifierOutput: { cells: [{ scenarioId: "sc1", failed: [] }], detail: "graded" },
    metadata: { runId: "t1" },
    ...over,
  });
  return join(root, "fam", "t1");
};

describe("trial directory", () => {
  it("round-trips a complete directory", () => {
    const dir = writeDir();
    const t = readTrialDirectory(dir);
    expect(t.runId).toBe("t1");
    expect(t.submissionFiles).toEqual(["subject.mjs"]);
    expect(t.countability.counts).toBe(true);
  });

  it("refuses a directory missing any required file", () => {
    const dir = writeDir();
    rmSync(join(dir, TRIAL_FILES.transcript));
    expect(() => readTrialDirectory(dir)).toThrowError(
      expect.objectContaining({ code: "TRIALDIR_MISSING_FILE" }),
    );
  });

  it("refuses a counted trial whose verifier graded nothing", () => {
    // The load-bearing one: counts:true with an empty verifier file is a pass nobody graded.
    const dir = writeDir({ verifierOutput: { cells: [], detail: "nothing ran" } });
    expect(() => readTrialDirectory(dir)).toThrowError(
      expect.objectContaining({ code: "TRIALDIR_COUNTED_WITHOUT_VERIFIER" }),
    );
  });

  it("refuses a counted trial with no preserved artifact", () => {
    const dir = writeDir({ submissionFiles: [] });
    expect(() => readTrialDirectory(dir)).toThrowError(
      expect.objectContaining({ code: "TRIALDIR_COUNTED_WITHOUT_SUBMISSION" }),
    );
  });

  it("refuses a directory whose challenge copy leaked a hidden artifact", () => {
    for (const hidden of HIDDEN_IN_CHALLENGE.slice(0, 3)) {
      const dir = writeDir({
        challengeFiles: [
          { path: "README.md", content: "task" },
          { path: `src/${hidden}`, content: "// the answer key" },
        ],
      });
      expect(() => readTrialDirectory(dir), hidden).toThrowError(
        expect.objectContaining({ code: "TRIALDIR_CHALLENGE_LEAK" }),
      );
    }
  });
});

describe("countability is never inferred", () => {
  it("refusals, timeouts and infrastructure errors can never count", () => {
    for (const c of ["refused", "timeout", "infrastructure_error"] as const) {
      const d = decideCountability(c, "detail", 128);
      expect(d.counts, c).toBe(false);
      expect(d.reason).toMatch(/absence of an attempt/);
    }
  });

  it("a crash does not count by default, and says why", () => {
    const d = decideCountability("crashed", "exited non-zero", 0);
    expect(d.counts).toBe(false);
    expect(d.reason).toMatch(/harness bug/);
  });

  it("a completed run that graded nothing does not count", () => {
    expect(decideCountability("completed", "artifact produced", 0).counts).toBe(false);
  });

  it("a completed run with graded cells counts", () => {
    expect(decideCountability("completed", "artifact produced", 128).counts).toBe(true);
  });
});

describe("providers", () => {
  it("declares both implemented and unconfigured adapters", () => {
    expect(PROVIDERS.filter((p) => p.status === "implemented").length).toBeGreaterThanOrEqual(2);
    expect(PROVIDERS.filter((p) => p.status === "declared").length).toBeGreaterThanOrEqual(3);
  });

  it("an unconfigured provider refuses rather than returning an empty submission", () => {
    for (const p of PROVIDERS.filter((x) => x.status === "declared")) {
      expect(
        () => p.run({ challengeDir: "/tmp", submissionPath: "s", instruction: "i", timeoutMs: 1, env: {} }),
        p.id,
      ).toThrow(/not configured/);
      expect(p.requires, p.id).toBeTruthy();
    }
  });

  it("the shell runner enforces its timeout", () => {
    const chal = mkdtempSync(join(tmpdir(), "foundry-chal-"));
    writeFileSync(join(chal, "README.md"), "task", "utf8");
    const out = shellAdapter.run({
      challengeDir: chal,
      submissionPath: "submission/subject.mjs",
      instruction: "",
      timeoutMs: 500,
      env: {},
      command: ["node", "-e", "setTimeout(()=>{},60000)"],
    });
    expect(out.classification).toBe("timeout");
    expect(out.runtimeSeconds).toBeLessThan(30);
  });

  it("a run that produces no artifact is never `completed`", () => {
    const chal = mkdtempSync(join(tmpdir(), "foundry-chal2-"));
    writeFileSync(join(chal, "README.md"), "task", "utf8");
    const out = shellAdapter.run({
      challengeDir: chal,
      submissionPath: "submission/subject.mjs",
      instruction: "",
      timeoutMs: 10_000,
      env: {},
      command: ["node", "-e", "console.log('did nothing')"],
    });
    expect(out.submission).toEqual([]);
    expect(out.classification).not.toBe("completed");
  });

  it("classifyRun prefers the artifact over the prose", () => {
    // A model that hedges and then does the work has done the work.
    expect(classifyRun("I can't help with that", true, false, false).classification).toBe("completed");
    expect(classifyRun("I can't help with that", false, false, false).classification).toBe("refused");
  });

  it("the docker plan mounts the challenge read-only, nothing else, and no network", () => {
    const plan = dockerPlan({
      challengeDir: "/c",
      submissionPath: "s",
      instruction: "",
      timeoutMs: 1,
      env: { TOKEN: "x" },
    });
    expect(plan.network).toBe("none");
    expect(plan.mounts.find((m) => m.target === "/work/challenge")?.mode).toBe("ro");
    expect(plan.mounts.find((m) => m.target === "/work/submission")?.mode).toBe("rw");
    // No verifier or matrix path is mounted at all.
    expect(plan.mounts.some((m) => /verif|matrix|scenario/i.test(m.source))).toBe(false);
    expect(plan.argv).toContain("--network=none");
    expect(plan.argv.join(" ")).toMatch(/--env=TOKEN/);
  });

  it("unknown providers are rejected", () => {
    expect(() => getProvider("nope")).toThrow(/unknown provider/);
  });

  it("provider registry keeps Anthropic import-only and external import-only for this phase", () => {
    const claude = checkProvider(providerById("claude"));
    expect(claude.available).toBe(false);
    expect(claude.state).toBe("import-only");
    expect(claude.detail).toMatch(/out of tokens|import-only/i);

    const external = checkProvider(providerById("external"));
    expect(external.available).toBe(false);
    expect(external.state).toBe("import-only");
  });
});

describe("what a trial cost", () => {
  // Every assertion here reads the provider's REAL output shape out of a preserved transcript in
  // trials/, because the point of the field is that it is measured. A fixture invented here would
  // test the parser against my guess about the format rather than against the format.
  const transcript = (rel: string): string => readFileSync(join(ROOT, "trials", rel), "utf8");

  it("reads codex's own token report, and refuses to price it", () => {
    // trials/durable-approval-outbox/cc267-codex-1/transcript.txt, final JSONL line:
    //   {"type":"turn.completed","usage":{"input_tokens":4311721,"cached_input_tokens":4165376,
    //    "cache_write_input_tokens":0,"output_tokens":62134,"reasoning_output_tokens":35512}}
    const usage = parseProviderUsage(transcript("durable-approval-outbox/cc267-codex-1/transcript.txt"));
    expect(usage).not.toBeNull();
    expect(usage?.inputTokens).toBe(4_311_721);
    expect(usage?.cachedInputTokens).toBe(4_165_376);
    expect(usage?.outputTokens).toBe(62_134);
    // The Codex CLI emits no price anywhere in the stream. Multiplying those tokens by a published
    // rate would produce a number that reads exactly like the measured ones beside it.
    expect(usage?.costUsd).toBeNull();
    expect(usage?.source).toMatch(/never a price/);
  });

  it("reads claude's own token report and its own price", () => {
    // trials/durable-approval-outbox/cc267-claude-1/transcript.txt, the `result` event:
    //   {"type":"result",...,"total_cost_usd":13.805058500000003,"usage":{"input_tokens":182,
    //    "cache_creation_input_tokens":222912,"cache_read_input_tokens":15184357,
    //    "output_tokens":159314,...}}
    const usage = parseProviderUsage(transcript("durable-approval-outbox/cc267-claude-1/transcript.txt"));
    expect(usage?.costUsd).toBe(13.805058500000003);
    expect(usage?.outputTokens).toBe(159_314);
    // Claude reports the three input figures disjointly, so billed input is their sum.
    expect(usage?.inputTokens).toBe(182 + 15_184_357 + 222_912);
    expect(usage?.cachedInputTokens).toBe(15_184_357);
  });

  it("a transcript with no usage report yields null rather than a zero", () => {
    // pic-codex-1 is seven lines of prose: the campaign ran the CLI in its human-readable mode, which
    // is why every costUsd this repository wrote for a run it executed itself is null.
    expect(
      parseProviderUsage(transcript("prompt-injection-containment/pic-codex-1/transcript.txt")),
    ).toBeNull();
  });

  it("turns on the usage stream for the exact command templates the campaigns use", () => {
    expect(
      withUsageReporting(["codex", "exec", "--dangerously-bypass-approvals-and-sandbox", "{instruction}"]),
    ).toEqual(["codex", "exec", "--json", "--dangerously-bypass-approvals-and-sandbox", "{instruction}"]);
    expect(
      withUsageReporting(["claude", "-p", "{instruction}", "--permission-mode", "bypassPermissions"]),
    ).toEqual([
      "claude",
      "--output-format",
      "json",
      "-p",
      "{instruction}",
      "--permission-mode",
      "bypassPermissions",
    ]);
    // Idempotent, and it never touches a command it does not recognise.
    const already = ["codex", "exec", "--json", "{instruction}"];
    expect(withUsageReporting(already)).toEqual(already);
    expect(withUsageReporting(["gemini", "--approval-mode", "yolo", "-p", "{instruction}"])).toEqual([
      "gemini",
      "--approval-mode",
      "yolo",
      "-p",
      "{instruction}",
    ]);
  });

  it("carries usage onto the run result without calling any provider", () => {
    // A local node process impersonating the claude output shape. No provider is contacted, so this
    // is runnable without spending: what is under test is the harness, not the model.
    const chal = mkdtempSync(join(tmpdir(), "foundry-usage-"));
    writeFileSync(join(chal, "README.md"), "task", "utf8");
    const line = JSON.stringify({
      type: "result",
      total_cost_usd: 0.25,
      usage: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 7 },
    });
    const out = shellAdapter.run({
      challengeDir: chal,
      submissionPath: "submission/subject.mjs",
      instruction: "",
      timeoutMs: 10_000,
      env: {},
      command: ["node", "-e", `console.log(${JSON.stringify(line)})`],
    });
    expect(out.usage?.costUsd).toBe(0.25);
    expect(out.usage?.inputTokens).toBe(15);
    // The effective argv is returned so the trial metadata records what ran, not what was planned.
    expect(out.command).toEqual(["node", "-e", `console.log(${JSON.stringify(line)})`]);
  });

  it("a cost the provider never reported cannot be recorded beside its tokens", () => {
    const base = {
      runId: "r1",
      familyId: "prompt-injection-containment",
      subjectId: "s",
      subjectType: "agent",
      model: "openai/gpt-5.6",
      effort: null,
      status: "completed",
      counts: true,
      countsReason: "graded",
      scenarioSetId: "set",
      cells: [{ scenarioId: "a", failed: [] }],
      runtimeSeconds: 1,
      artifactPath: "trials/x/submission",
      isolation: "subprocess",
      notes: "",
      usage: {
        inputTokens: 100,
        cachedInputTokens: 0,
        outputTokens: 10,
        costUsd: null,
        source: "codex `turn.completed` usage; the Codex CLI reports tokens and never a price",
      },
    };
    // $3.50 is the literal the repository already quotes under a heading that says "measured".
    expect(() => parseTrialRecord({ ...base, costUsd: 3.5 })).toThrow(/TRIAL_COST_CONTRADICTS_USAGE/);
    expect(parseTrialRecord({ ...base, costUsd: null }).usage?.inputTokens).toBe(100);
  });
});

describe("historical import", () => {
  it("classifies before reading reward", () => {
    const base = {
      runName: "x",
      agent: "codex",
      model: "openai/gpt-5.6-sol",
      effort: "adhoc",
      reward: 0,
      erroredTrials: 1,
      costUsd: 1,
      runtimeSeconds: 10,
      trialIds: [],
    };
    expect(classifyHistorical({ ...base, exceptions: ["AgentSafetyRefusalError"] }).status).toBe("refused");
    expect(classifyHistorical({ ...base, exceptions: ["AgentTimeoutError"] }).status).toBe("timeout");
    expect(classifyHistorical({ ...base, exceptions: [] }).status).toBe("infrastructure_error");
    expect(classifyHistorical({ ...base, exceptions: [], erroredTrials: 0 }).status).toBe("completed");
  });

  it("a refusal never counts even though its reward is 0.0", () => {
    const c = classifyHistorical({
      runName: "cheat-codex",
      agent: "codex",
      model: "openai/gpt-5.6-sol",
      effort: "adhoc",
      reward: 0,
      exceptions: ["AgentSafetyRefusalError"],
      erroredTrials: 1,
      costUsd: 0.03,
      runtimeSeconds: 100,
      trialIds: [],
    });
    expect(c.counts).toBe(false);
    expect(c.reason).toMatch(/not evidence in either direction/);
  });

  it("separates cheat and gate runs from standard attempts by kind", () => {
    expect(classifyRunKind("cheat-codex-cc267")).toBe("cheat");
    expect(classifyRunKind("gate-v2-nop")).toBe("gate");
    expect(classifyRunKind("cc267-claude-1")).toBe("standard");
    expect(classifyRunKind("v2-opus-3b")).toBe("standard");
  });

  it("normalizes model identity so one model is one subject across families", () => {
    expect(normalizeModel("claude-code", "anthropic/claude-opus-5", "adhoc")).toBe("claude-opus-5");
    expect(normalizeModel("codex", "openai/gpt-5.6-sol", "xhigh")).toBe("gpt-5.6-sol@xhigh");
  });

  it("parses a Harbor result and survives a malformed one", () => {
    expect(parseHarborResult("x", { nope: true })).toBeNull();
    const parsed = parseHarborResult("r", {
      started_at: "2026-08-25T15:00:00",
      finished_at: "2026-08-25T15:10:00",
      stats: {
        n_errored_trials: 0,
        cost_usd: 1.5,
        evals: {
          "claude-code__anthropic/claude-opus-5__max": {
            reward_stats: { reward: { "0.0": ["t1"] } },
            exception_stats: {},
          },
        },
      },
    });
    expect(parsed?.reward).toBe(0);
    expect(parsed?.runtimeSeconds).toBe(600);
    expect(parsed?.costUsd).toBe(1.5);
  });

  it("returns an empty import for a missing directory rather than throwing", () => {
    const h = importDurableOutboxHistory("/does/not/exist", "f", "s");
    expect(h.records).toEqual([]);
  });
});

describe("challenge package leak prevention, at the directory level", () => {
  it("the generated package contains none of the hidden artifacts", () => {
    const typesSource = readFileSync(
      join(ROOT, "src/families/prompt-injection-containment/types.ts"),
      "utf8",
    );
    const pkg = buildChallengePackage(typesSource, "set");
    const names = pkg.files.map((f) => f.path.split("/").pop());
    for (const hidden of HIDDEN_IN_CHALLENGE) expect(names).not.toContain(hidden);
  });
});

describe("the real agent trials on record", () => {
  const trials = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-containment");

  it("three counted Claude trials exist with preserved artifacts", () => {
    const counted = trials.filter((t) => t.record.counts);
    expect(counted.length).toBeGreaterThanOrEqual(3);
    for (const t of counted) {
      expect(t.record.subjectType).toBe("agent");
      expect(t.record.isolation).toBe("subprocess");
      expect(t.submissionFiles).toContain("subject.mjs");
      expect(t.record.cells.length).toBe(128);
    }
  });

  it("every counted trial passed every scenario — the already-solved finding", () => {
    for (const t of trials.filter((x) => x.record.counts)) {
      const failed = t.record.cells.filter((c) => c.failed.length > 0);
      expect(failed, `${t.runId} unexpectedly failed scenarios`).toEqual([]);
    }
  });

  it("the submissions are real implementations, not stubs", () => {
    for (const t of trials.filter((x) => x.record.counts)) {
      const src = readFileSync(join(t.path, "submission", "subject.mjs"), "utf8");
      expect(src.length, t.runId).toBeGreaterThan(3000);
      expect(src, t.runId).toMatch(/provenance/);
      expect(src, t.runId).toMatch(/P1_UNTRUSTED_AUTHORITY/);
    }
  });
});

describe("the already-solved gate", () => {
  const registry = loadRegistry(ROOT);
  const run = runFamily();
  const local = runLocalTrials();
  const durable = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-containment").map((t) => t.record);
  const trials = { ...local, records: [...local.records, ...durable] };
  const evidence = computeEvidence(run, trials);
  const shape = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");

  it("counts the real trials and notices they all passed", () => {
    expect(evidence.countedAgentTrials).toBeGreaterThanOrEqual(3);
    expect(evidence.agentTrialsPassed).toBe(evidence.countedAgentTrials);
  });

  it("a family every agent solves is NOT-READY, and now for two reasons", () => {
    // WAS: `expect(...difficulty-evidenced...).toBe("pass")`.
    //
    // That assertion encoded the OLD evidence picture rather than a bug: under the old gate, six
    // counted trials WERE the difficulty evidence, because `countedAgentTrials > 0` was the whole
    // question. Every one of those six passed 128 of 128, and their root-cause records say `clean`.
    // A clean solve is a fact about the family being easy for this subject; it is not evidence that
    // the family is hard under any label, so the gate that asks for capability-attributed failure
    // now fails too. The test's conclusion — NOT-READY — was right then and is right now.
    //
    // (`computeEvidence` does not read the sidecars at all, so this also exercises the safe default:
    // evidence that never computed root causes reads as zero capability trials, not as a pass.)
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, evidence);
    expect(a.results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict).toBe("fail");
    expect(a.results.find((r) => r.gate.id === "not-already-solved")?.verdict).toBe("fail");
    expect(a.blockingFailures).toContain("not-already-solved");
    expect(a.blockingFailures).toContain("difficulty-evidenced");
    expect(a.verdict).toBe("NOT-READY");
  });

  it("the same family WOULD ship if one agent had failed AND somebody said why", () => {
    // Guards against the gate being unconditionally red.
    //
    // WAS: the same call without `capabilityEvidencedTrials`, asserting `blockingFailures` is empty
    // on the strength of one failing trial alone. That encoded the bug: "an agent failed" was
    // treated as "the family is hard", which is exactly how a spec defect and a harness contract
    // violation were published as difficulty. One failing trial is still necessary and is no longer
    // sufficient — the failure has to have been attributed.
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, {
      ...evidence,
      agentTrialsPassed: evidence.countedAgentTrials - 1,
      capabilityEvidencedTrials: 1,
      unlabelledCountedTrials: 0,
      sharedBankSubjects: 3,
    });
    expect(a.blockingFailures).toEqual([]);
    expect(a.verdict).toBe("SHIP");
  });

  it("but not if the failure is unattributed: the label is what ships it, not the failure count", () => {
    // The other half of the anti-vacuity pair. Identical evidence, one field different, and the
    // family does not ship. Without this the test above would pass on a gate that had simply been
    // loosened again.
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, {
      ...evidence,
      agentTrialsPassed: evidence.countedAgentTrials - 1,
      capabilityEvidencedTrials: 0,
      unlabelledCountedTrials: 1,
      sharedBankSubjects: 3,
    });
    expect(a.blockingFailures).toEqual(["difficulty-evidenced"]);
    expect(a.results.find((r) => r.gate.id === "not-already-solved")?.verdict).toBe("pass");
    expect(a.verdict).toBe("NOT-READY");
  });

  it("in-process isolation fails once agent artifacts are graded", () => {
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, {
      ...evidence,
      isolation: "in-process",
    });
    expect(a.results.find((r) => r.gate.id === "isolation-level")?.verdict).toBe("fail");
  });
});

describe("shared bank on real data", () => {
  const outbox = JSON.parse(readFileSync(join(ROOT, "examples/durable-outbox/matrix.json"), "utf8")) as {
    subjects: { id: string }[];
  };

  it("the outbox and containment mutant banks remain disjoint", () => {
    // The MATRIX banks are engines vs mutants and share nothing; the overlap that moved is at the
    // TRIAL level, where claude-opus-5 has now attempted both.
    const ids = new Set(outbox.subjects.map((s) => s.id));
    expect(ids.has("claude-opus-5")).toBe(false);
  });

  it("computeOverlap still refuses an additive claim for disjoint matrices", () => {
    const mk = (suite: string, subjectIds: string[]) => ({
      familyId: suite,
      provenance: "test",
      agentDerived: false,
      matrix: {
        schema: "agent-eval-foundry/matrix@1",
        suite,
        provenance: {
          repo: null,
          artifact_commit: null,
          task_sha256: null,
          suite_shape: null,
          checks_total: null,
          checks_declared: null,
          extracted_from: [],
          caveat: null,
        },
        reference_subject: null,
        subjects: subjectIds.map((id) => ({
          id,
          label: id,
          family: "t",
          model: null,
          effort: null,
          note: null,
        })),
        instances: [],
        results: {},
      },
    });
    const o = computeOverlap([mk("a", ["x"]), mk("b", ["y"])]);
    expect(o.verdict).toBe("refused");
    expect(o.combined).toBeNull();
  });
});

describe("UI action record/replay family", () => {
  const registry = loadRegistry(ROOT);
  const shape = registry.shapes.find((s) => s.familyId === "ui-action-record-replay");

  it("is registered and validates", () => {
    expect(shape).toBeDefined();
    expect(shape?.mechanisms).toContain("ui-replay-mismatch");
    expect(shape?.knobs.length).toBeGreaterThanOrEqual(5);
    expect(shape?.expectedMutants.length).toBeGreaterThanOrEqual(4);
  });

  it("ships with counted trials while preserving the advisory chain limitation", () => {
    const evidence = familyEvidenceFor(ROOT, "ui-action-record-replay").evidence;
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, evidence);
    expect(a.blockingFailures).toEqual([]);
    expect(a.results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict).toBe("pass");
    expect(a.results.find((r) => r.gate.id === "agent-axes-independent")?.verdict).toBe("fail");
    expect(a.verdict).toBe("SHIP");
  });

  it("declares both halves so refusing to replay cannot pass", () => {
    // The family is built now, so its shape is generated from the code and its fairness constraints
    // are where the two-sided contract is stated. The over-blocking half is named there.
    const fairness = (shape?.fairnessConstraints ?? []).join(" ");
    expect(fairness).toMatch(/unreplayable fails `replay_completes`/);
    expect((shape?.expectedFailureModes ?? []).join(" ")).toMatch(/[Ii]mprovising|halting/i);
  });
});

describe("known-bad cases for the bank and comparability rules", () => {
  const mkBank = (familyId: string, subjectIds: readonly string[]) => ({
    familyId,
    provenance: "test",
    agentDerived: false,
    matrix: {
      schema: "agent-eval-foundry/matrix@1" as const,
      suite: familyId,
      provenance: {
        repo: null,
        artifact_commit: null,
        task_sha256: null,
        suite_shape: null,
        checks_total: null,
        checks_declared: null,
        extracted_from: [],
        caveat: null,
      },
      reference_subject: null,
      subjects: subjectIds.map((id) => ({
        id,
        label: id,
        family: "t",
        model: null,
        effort: null,
        note: null,
      })),
      instances: [],
      results: {},
    },
  });

  it("BANK_ADDITIVE_WITHOUT_OVERLAP — asking for a combined count across disjoint banks", () => {
    // The tempting mistake: the union matrix exists and its width is large. It is the sum of the
    // parts by construction, and this is the checker that stops it being published.
    const overlap = computeOverlap([mkBank("a", ["x"]), mkBank("b", ["y"])]);
    expect(overlap.verdict).toBe("refused");
    expect(() => combinedMatrixFor(overlap)).toThrowError(
      expect.objectContaining({ code: "BANK_ADDITIVE_WITHOUT_OVERLAP" }),
    );
  });

  it("the same call succeeds once the banks actually share subjects", () => {
    const overlap = computeOverlap([mkBank("a", ["x", "y", "z"]), mkBank("b", ["x", "y", "z"])]);
    expect(overlap.verdict).toBe("measured");
    expect(combinedMatrixFor(overlap).subjects.map((s) => s.id)).toEqual(["x", "y", "z"]);
  });

  it("BANK_INCOMPARABLE_SCENARIO_SET — pooling trials graded on two different suites", () => {
    const a = { ...baseRecord, runId: "a", scenarioSetId: "pic-128" };
    const b = { ...baseRecord, runId: "b", scenarioSetId: "pic-256" };
    expect(() => assertBankCoherent("fam", [a, b])).toThrowError(
      expect.objectContaining({ code: "BANK_INCOMPARABLE_SCENARIO_SET" }),
    );
    // An UNCOUNTED trial on the other set is not a pooling problem — it contributes no cells.
    expect(() => assertBankCoherent("fam", [a, { ...b, counts: false }])).not.toThrow();
  });

  it("TRIALDIR_SET_MISMATCH — comparing counted trials from two scenario sets", () => {
    const dir = (runId: string, set: string) => {
      const root = mkdtempSync(join(tmpdir(), "foundry-cmp-"));
      writeTrialDirectory({
        root,
        familyId: "fam",
        runId,
        record: { ...baseRecord, runId, scenarioSetId: set },
        countability: { counts: true, reason: "clean", classification: "completed" },
        transcript: "ok",
        challengeFiles: [{ path: "README.md", content: "task" }],
        submissionFiles: [{ path: "subject.mjs", content: "export const subject = {};" }],
        verifierOutput: { cells: [{ scenarioId: "sc1", failed: [] }], detail: "graded" },
        metadata: { runId },
      });
      return readTrialDirectory(join(root, "fam", runId));
    };
    const trials = [dir("a", "pic-128"), dir("b", "pic-256")];
    expect(() => assertComparable(trials)).toThrowError(
      expect.objectContaining({ code: "TRIALDIR_SET_MISMATCH" }),
    );
    expect(() => assertComparable([trials[0] as NonNullable<(typeof trials)[0]>])).not.toThrow();
  });

  it("the real checked-in trials are comparable and coherent", () => {
    const real = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-containment");
    expect(() => assertComparable(real)).not.toThrow();
    expect(() =>
      assertBankCoherent(
        "prompt-injection-containment",
        real.map((t) => t.record),
      ),
    ).not.toThrow();
  });
});

describe("a stub cannot become difficulty evidence", () => {
  // The group that exists because a smoke test broke the gate. Driving `trials run` with a command
  // that wrote a five-line do-nothing module produced a counted agent trial failing 128 of 128, and
  // the containment family flipped from NOT-READY to SHIP on the strength of it. Both halves of the
  // fix are pinned here: the veto that stops the record being written as counted, and the
  // independent assertion that rejects such a record even if something else wrote it.
  const disqualify = baselineDisqualifier();
  const local = runLocalTrials();
  const nop = local.records.find((r) => r.subjectId === "nop-faker");
  const reference = local.records.find((r) => r.subjectId === "reference");
  const follower = local.records.find((r) => r.subjectId === "injection-follower");

  it("an artifact that never ran is not an attempt", () => {
    const cells = (nop as NonNullable<typeof nop>).cells.map((c) => ({
      scenarioId: c.scenarioId,
      failed: [SUBJECT_ERROR],
    }));
    expect(disqualify(cells)).toMatch(/failed to run at all/);
  });

  it("an artifact indistinguishable from the nop baseline is not an attempt", () => {
    expect(disqualify((nop as NonNullable<typeof nop>).cells)).toMatch(/indistinguishable/);
  });

  it("a real wrong implementation still counts", () => {
    // The guard must not swallow genuine failures: a mutant fails plenty of scenarios and differs
    // from the baseline, so it passes the veto.
    expect(disqualify((follower as NonNullable<typeof follower>).cells)).toBeNull();
    expect(disqualify((reference as NonNullable<typeof reference>).cells)).toBeNull();
  });

  it("the checker rejects a counted agent record that matches a baseline", () => {
    const imposter = {
      ...baseRecord,
      runId: "imposter",
      cells: (nop as NonNullable<typeof nop>).cells,
    };
    expect(() => assertNoBaselineImposters([imposter])).toThrowError(
      expect.objectContaining({ code: "TRIAL_BASELINE_IMPOSTER" }),
    );
    // Same cells, declared as the baseline it is: allowed, because it claims nothing.
    expect(() =>
      assertNoBaselineImposters([{ ...imposter, subjectType: "baseline" as const }]),
    ).not.toThrow();
  });

  it("the checked-in real trials survive the checker", () => {
    const real = readFamilyTrials(join(ROOT, "trials"), "prompt-injection-containment").map((t) => t.record);
    expect(real.length).toBeGreaterThan(0);
    expect(() => assertNoBaselineImposters(real)).not.toThrow();
  });

  it("cell signatures are order-independent and exact", () => {
    const cells = [
      { scenarioId: "b", failed: ["y", "x"] },
      { scenarioId: "a", failed: ["z"] },
    ];
    const shuffled = [
      { scenarioId: "a", failed: ["z"] },
      { scenarioId: "b", failed: ["x", "y"] },
    ];
    expect(cellSignature(cells)).toBe(cellSignature(shuffled));
    expect(cellSignature(cells)).not.toBe(cellSignature([{ scenarioId: "a", failed: ["z"] }]));
  });
});
