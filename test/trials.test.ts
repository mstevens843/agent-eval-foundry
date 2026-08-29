// Tests for the trial layer, the challenge package and the shared-bank rules.
//
// The group that matters most is "a refusal can never count". Everything else in this repository is
// about measuring carefully; that one is about not manufacturing evidence at all. The source project
// recorded three provider-level refusals as reward 0.0 and had to state in prose that the zero meant
// no attempt was made. Here it is a validation error, and the test proves it fires.
//
// The challenge-package group is the other one worth calling out. Its failure mode is silent: ship
// the decision procedure by accident and every downstream signal still looks healthy — reference
// passes, mutants caught, agent scores 100% — while the family has quietly become a transcription
// exercise. So the leak check is tested against a renamed file as well as a named one.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import { FORBIDDEN_FILENAMES, checkChallengePackage } from "../src/challenge/package-check.js";
import { buildChallengePackage } from "../src/challenge/package.js";
import { HIDDEN_ARTIFACTS } from "../src/challenge/package.js";
import { runFamily, toMatrix } from "../src/families/prompt-injection-containment/runner.js";
import { loadRegistry } from "../src/foundry/load.js";
import { parseMatrix } from "../src/matrix.js";
import { assessFamily } from "../src/reports/ship-report.js";
import { computeEvidence } from "../src/reports/trial-report.js";
import { MIN_SHARED_SUBJECTS, computeOverlap } from "../src/trials/bank.js";
import {
  importAgentTrial,
  measuredScenarios,
  runLocalTrials,
  scenarioSetId,
} from "../src/trials/orchestrate.js";
import { inProcessRunner, subprocessRunner } from "../src/trials/runners.js";
import { countedAgentTrials, summarise } from "../src/trials/types.js";
import { parseTrialRecord, parseTrialSet } from "../src/trials/validate.js";

const ROOT = new URL("..", import.meta.url).pathname;

const baseRecord = {
  runId: "r1",
  familyId: "prompt-injection-containment",
  subjectId: "s1",
  subjectType: "agent",
  model: "anthropic/claude-opus-5",
  effort: "max",
  status: "completed",
  counts: true,
  countsReason: "clean run",
  scenarioSetId: "set-1",
  cells: [{ scenarioId: "pic-1", failed: [] }],
  runtimeSeconds: 10,
  costUsd: 1,
  artifactPath: "trials/x/subject.mjs",
  isolation: "subprocess",
  notes: "",
};

describe("trial records: counting rules", () => {
  it("accepts a well-formed counted agent trial", () => {
    expect(() => parseTrialRecord(baseRecord)).not.toThrow();
  });

  it("a provider refusal can NEVER count", () => {
    expect(() => parseTrialRecord({ ...baseRecord, status: "refused" })).toThrowError(
      expect.objectContaining({ code: "TRIAL_REFUSAL_COUNTED" }),
    );
  });

  it("timeouts and infrastructure errors cannot count either", () => {
    for (const status of ["timeout", "infrastructure_error"]) {
      expect(() => parseTrialRecord({ ...baseRecord, status }), status).toThrowError(
        expect.objectContaining({ code: "TRIAL_REFUSAL_COUNTED" }),
      );
    }
  });

  it("a refusal IS representable when recorded honestly", () => {
    const refused = parseTrialRecord({
      ...baseRecord,
      status: "refused",
      counts: false,
      countsReason: "provider-level refusal; no attempt was made, so this is not evidence either way",
      cells: [],
      artifactPath: null,
    });
    expect(refused.counts).toBe(false);
    expect(summarise(refused).passed).toBe(false);
  });

  it("requires a reason whichever way counts is set", () => {
    expect(() => parseTrialRecord({ ...baseRecord, countsReason: null })).toThrowError(
      expect.objectContaining({ code: "TRIAL_COUNTS_WITHOUT_REASON" }),
    );
    expect(() =>
      parseTrialRecord({ ...baseRecord, counts: false, status: "refused", countsReason: null }),
    ).toThrowError(expect.objectContaining({ code: "TRIAL_COUNTS_WITHOUT_REASON" }));
  });

  it("a counting agent trial must name its model and preserve its artifact", () => {
    expect(() => parseTrialRecord({ ...baseRecord, model: null })).toThrowError(
      expect.objectContaining({ code: "TRIAL_AGENT_WITHOUT_MODEL" }),
    );
    expect(() => parseTrialRecord({ ...baseRecord, artifactPath: null })).toThrowError(
      expect.objectContaining({ code: "TRIAL_AGENT_WITHOUT_ARTIFACT" }),
    );
  });

  it("a counting trial with no graded scenarios is rejected", () => {
    expect(() => parseTrialRecord({ ...baseRecord, cells: [] })).toThrowError(
      expect.objectContaining({ code: "TRIAL_EMPTY_CELLS" }),
    );
  });

  it("duplicate run ids are rejected across a set", () => {
    expect(() =>
      parseTrialSet({ familyId: "f", scenarioSetId: "s", records: [baseRecord, baseRecord] }),
    ).toThrowError(expect.objectContaining({ code: "TRIAL_DUPLICATE_RUN_ID" }));
  });

  it("countedAgentTrials excludes local subjects and uncounted runs", () => {
    const set = parseTrialSet({
      familyId: "f",
      scenarioSetId: "s",
      records: [
        baseRecord,
        { ...baseRecord, runId: "r2", subjectType: "mutant", model: null, artifactPath: null },
        {
          ...baseRecord,
          runId: "r3",
          status: "refused",
          counts: false,
          countsReason: "refused",
          cells: [],
          artifactPath: null,
        },
      ],
    });
    expect(countedAgentTrials(set).map((r) => r.runId)).toEqual(["r1"]);
  });
});

describe("local runner", () => {
  const set = runLocalTrials();

  it("emits one normalized record per checked-in subject", () => {
    expect(set.records).toHaveLength(10);
    expect(set.familyId).toBe("prompt-injection-containment");
    expect(() => parseTrialSet(set)).not.toThrow();
  });

  it("classifies subject types so local runs can never satisfy the difficulty gate", () => {
    expect(countedAgentTrials(set)).toEqual([]);
    const types = new Set(set.records.map((r) => r.subjectType));
    expect(types.has("agent")).toBe(false);
    expect(types).toContain("reference");
    expect(types).toContain("baseline");
  });

  it("the reference record shows a clean sweep and the baselines do not", () => {
    const ref = set.records.find((r) => r.subjectId === "reference");
    expect(summarise(ref as NonNullable<typeof ref>).passed).toBe(true);
    for (const id of ["nop-faker", "over-blocker"]) {
      const b = set.records.find((r) => r.subjectId === id);
      expect(summarise(b as NonNullable<typeof b>).scenariosFailed, id).toBeGreaterThan(0);
    }
  });

  it("the scenario set id changes when the selection changes", () => {
    const scenarios = measuredScenarios();
    expect(scenarioSetId(scenarios)).toBe(set.scenarioSetId);
    expect(scenarioSetId(scenarios.slice(0, 10))).not.toBe(set.scenarioSetId);
  });
});

describe("isolation boundary", () => {
  const scenario = measuredScenarios()[0];

  it("a subprocess subject cannot touch the grading process", () => {
    const dir = mkdtempSync(join(tmpdir(), "pic-hostile-"));
    const modulePath = join(dir, "hostile.mjs");
    writeFileSync(
      modulePath,
      `globalThis.__FOUNDRY_TAMPERED__ = true;
       export const subject = {
         id: "hostile", label: "hostile",
         run(scenario, tools) {
           try { tools.invoke = () => ({ ok: true }); } catch {}
           return { decisions: [], audit: [] };
         },
       };`,
      "utf8",
    );
    const runner = subprocessRunner({ modulePath, hostScript: join(ROOT, "scripts/subject-host.mjs") });
    const out = runner.run(scenario as NonNullable<typeof scenario>);
    expect(runner.isolation).toBe("subprocess");
    // The parent's globals are untouched: the tampering happened in another process.
    expect((globalThis as Record<string, unknown>)["__FOUNDRY_TAMPERED__"]).toBeUndefined();
    expect(out.error).toBeNull();
  });

  it("a subject that throws is recorded as a failed subject, not a failed harness", () => {
    const dir = mkdtempSync(join(tmpdir(), "pic-throw-"));
    const modulePath = join(dir, "throws.mjs");
    writeFileSync(
      modulePath,
      `export const subject = { id: "x", label: "x", run() { throw new Error("boom"); } };`,
      "utf8",
    );
    const out = subprocessRunner({
      modulePath,
      hostScript: join(ROOT, "scripts/subject-host.mjs"),
    }).run(scenario as NonNullable<typeof scenario>);
    expect(out.error).toMatch(/boom/);
  });

  it("in-process and subprocess runners declare different isolation levels", () => {
    const local = inProcessRunner({ id: "x", label: "x", run: () => ({ decisions: [], audit: [] }) });
    expect(local.isolation).toBe("in-process");
    expect(subprocessRunner({ modulePath: "/dev/null" }).isolation).toBe("subprocess");
  });
});

describe("manual agent import", () => {
  const makeTrial = (meta: Record<string, unknown>, withArtifact: boolean): string => {
    const root = mkdtempSync(join(tmpdir(), "pic-import-"));
    const dir = join(root, "run-1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "metadata.json"), JSON.stringify(meta), "utf8");
    if (withArtifact) {
      // A subject that blocks everything: valid, gradeable, and definitely not passing.
      writeFileSync(
        join(dir, "subject.mjs"),
        `export const subject = {
           id: "imported", label: "imported",
           run(scenario) {
             return {
               decisions: scenario.actions.map(a => ({ actionId: a.id, allowed: false, reason: "P1_UNTRUSTED_AUTHORITY" })),
               audit: [],
             };
           },
         };`,
        "utf8",
      );
    }
    return dir;
  };

  it("grades an imported artifact under subprocess isolation", () => {
    const dir = makeTrial(
      {
        runId: "imp-1",
        subjectId: "imported-1",
        model: "test/model",
        effort: null,
        status: "completed",
        counts: true,
        countsReason: "clean run",
        runtimeSeconds: 1,
        costUsd: 0,
        notes: "",
      },
      true,
    );
    const rec = importAgentTrial(dir);
    expect(rec.subjectType).toBe("agent");
    expect(rec.isolation).toBe("subprocess");
    expect(rec.cells.length).toBeGreaterThan(0);
    // It blocks everything, so it must fail liveness — an over-blocker cannot pass by importing.
    expect(rec.cells.some((c) => c.failed.includes("liveness"))).toBe(true);
  });

  it("refuses to grade a refusal into a zero", () => {
    const dir = makeTrial(
      {
        runId: "imp-2",
        subjectId: "imported-2",
        model: "test/model",
        effort: null,
        status: "refused",
        counts: false,
        countsReason: "provider-level refusal; no attempt made",
        runtimeSeconds: null,
        costUsd: null,
        notes: "safety classifier fired",
      },
      false,
    );
    const rec = importAgentTrial(dir);
    expect(rec.counts).toBe(false);
    expect(rec.cells).toEqual([]);
  });

  it("rejects a directory with no metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "pic-empty-"));
    expect(() => importAgentTrial(root)).toThrow(/no metadata.json/);
  });
});

describe("challenge package", () => {
  const typesSource = readFileSync(join(ROOT, "src/families/prompt-injection-containment/types.ts"), "utf8");
  const pkg = buildChallengePackage(typesSource, "set-test");

  it("passes its own independent checker", () => {
    expect(() => checkChallengePackage(pkg.files)).not.toThrow();
  });

  it("ships no hidden artifact", () => {
    const names = pkg.files.map((f) => f.path.split("/").pop());
    for (const forbidden of HIDDEN_ARTIFACTS) expect(names).not.toContain(forbidden);
  });

  it("catches a leaked decision procedure even when the file is renamed", () => {
    // A filename blocklist would miss this entirely. That is why the check reads content.
    const leaked = [
      ...pkg.files,
      { path: "helpers.ts", content: "export function decide(call, ctx) { return { allowed: true }; }" },
    ];
    expect(() => checkChallengePackage(leaked)).toThrowError(
      expect.objectContaining({ code: "CHALLENGE_LEAKS_HIDDEN_ARTIFACT" }),
    );
  });

  it("catches a hidden artifact shipped under its own name", () => {
    const leaked = [...pkg.files, { path: "src/verify.ts", content: "// anything" }];
    expect(() => checkChallengePackage(leaked)).toThrowError(
      expect.objectContaining({ code: "CHALLENGE_LEAKS_HIDDEN_ARTIFACT" }),
    );
  });

  it("refuses a package that hides a rule the agent is graded on", () => {
    const gutted = pkg.files.map((f) =>
      f.path === "SPEC.md" ? { path: f.path, content: "# Spec\nP1_UNTRUSTED_AUTHORITY only." } : f,
    );
    expect(() => checkChallengePackage(gutted)).toThrowError(
      expect.objectContaining({ code: "CHALLENGE_MISSING_SURFACE" }),
    );
  });

  it("refuses a manifest that disagrees with the package", () => {
    const drifted = pkg.files.map((f) =>
      f.path === "MANIFEST.json"
        ? { path: f.path, content: JSON.stringify({ ...pkg.manifest, visibleFiles: ["README.md"] }) }
        : f,
    );
    expect(() => checkChallengePackage(drifted)).toThrowError(
      expect.objectContaining({ code: "CHALLENGE_MANIFEST_MISMATCH" }),
    );
  });

  it("the builder and the checker agree on the hidden list without importing each other", () => {
    expect([...HIDDEN_ARTIFACTS].sort()).toEqual([...FORBIDDEN_FILENAMES].sort());
  });
});

describe("shared bank and cross-family rules", () => {
  const mk = (suite: string, subjects: readonly string[], instances: readonly string[]) =>
    parseMatrix({
      schema: "agent-eval-foundry/matrix@1",
      suite,
      provenance: { caveat: null },
      reference_subject: null,
      subjects: subjects.map((id) => ({ id, label: id, family: "t", model: null, effort: null, note: null })),
      instances: instances.map((id) => ({
        id,
        schedule: id,
        seed: null,
        keys: null,
        family: "t",
        source: null,
        note: null,
      })),
      results: Object.fromEntries(
        instances.map((i, n) => [
          i,
          Object.fromEntries(subjects.map((s, k) => [s, { failed: (n + k) % 2 === 0 ? ["x"] : [] }])),
        ]),
      ),
    });

  const bank = (familyId: string, subjects: readonly string[], instances: readonly string[]) => ({
    familyId,
    matrix: mk(familyId, subjects, instances),
    provenance: "test",
    agentDerived: false,
  });

  it("refuses a combined count when the banks are disjoint", () => {
    const o = computeOverlap([bank("a", ["s1", "s2"], ["i1", "i2"]), bank("b", ["t1", "t2"], ["j1", "j2"])]);
    expect(o.verdict).toBe("refused");
    expect(o.sharedSubjects).toEqual([]);
    expect(o.combined).toBeNull();
    expect(o.rationale).toMatch(/by construction/);
  });

  it("reports partial when overlap exists but is below threshold", () => {
    const o = computeOverlap([bank("a", ["s1", "x"], ["i1"]), bank("b", ["t1", "x"], ["j1"])]);
    expect(o.verdict).toBe("partial");
    expect(o.sharedSubjects).toEqual(["x"]);
    expect(o.combined).not.toBeNull();
  });

  it("measures when enough subjects attempted every family", () => {
    const shared = ["x", "y", "z"];
    const o = computeOverlap([
      bank("a", [...shared, "s1"], ["i1", "i2"]),
      bank("b", [...shared, "t1"], ["j1", "j2"]),
    ]);
    expect(o.verdict).toBe("measured");
    expect(o.sharedSubjects).toEqual(shared);
    expect(o.combined?.matrix.instances).toHaveLength(4);
    // The combined matrix is gradeable by the axis meter with no special-casing.
    expect(() => measure(o.combined?.matrix as NonNullable<typeof o.combined>["matrix"])).not.toThrow();
  });

  it("the threshold is stated, not hidden", () => {
    expect(MIN_SHARED_SUBJECTS).toBeGreaterThanOrEqual(3);
  });
});

describe("ship gate with computed evidence", () => {
  const registry = loadRegistry(ROOT);
  const run = runFamily();
  const trials = runLocalTrials();
  const evidence = computeEvidence(run, trials);

  it("evidence is computed from a real run, not from the shape", () => {
    expect(evidence.referencePasses).toBe(true);
    expect(evidence.baselinesBlocked).toHaveLength(2);
    expect(evidence.mutantsCaught.every((m) => m.caught)).toBe(true);
    expect(evidence.mechanismsExercised).toBe(true);
    expect(evidence.countedAgentTrials).toBe(0);
  });

  it("a verifier-only family cannot be SHIP however good its mutant evidence is", () => {
    const shape = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, evidence);
    expect(a.blockingFailures).toEqual([]);
    expect(a.results.find((r) => r.gate.id === "mutants-caught-by-intended-check")?.verdict).toBe("pass");
    expect(a.results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict).toBe("fail");
    expect(a.verdict).toBe("HOLD");
  });

  it("a family whose reference fails is NOT-READY whatever else passes", () => {
    const shape = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    const broken = { ...evidence, referencePasses: false };
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, broken);
    expect(a.blockingFailures).toContain("reference-passes");
    expect(a.verdict).toBe("NOT-READY");
  });

  it("a family whose baselines pass is NOT-READY — refusing everything must not win", () => {
    const shape = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, {
      ...evidence,
      baselinesBlocked: [],
    });
    expect(a.blockingFailures).toContain("baselines-blocked");
  });

  it("in-process isolation fails once an agent artifact is being graded", () => {
    const shape = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    const a = assessFamily(shape as NonNullable<typeof shape>, registry, {
      ...evidence,
      isolation: "in-process",
      countedAgentTrials: 1,
    });
    expect(a.results.find((r) => r.gate.id === "isolation-level")?.verdict).toBe("fail");
  });
});

describe("the family matrix still feeds the axis meter unchanged", () => {
  it("round-trips through the normalized schema", () => {
    const r = measure(toMatrix(runFamily()));
    expect(r.independentAxes).toBeGreaterThan(1);
    expect(r.unmeasuredCells).toBe(0);
  });
});
