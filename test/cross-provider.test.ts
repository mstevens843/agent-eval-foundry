// Tests for the cross-provider layer: provider detection, strict import, evidence lifecycle,
// difficulty curves and the realism labels.
//
// The group that earns its place is "evidence lifecycle". The previous phase repaired a spec that a
// real trial proved ambiguous, which invalidated three counted trials — and the moment that happens
// is exactly when the tempting move is to soften the check. These tests pin the behaviour so the
// softening has to be deliberate.
//
// The second group is "a provider that was never asked is not a model that failed". Four outcome
// kinds, four separate buckets, and a real campaign that produced three of them inside twenty
// minutes: Claude counted, Codex counted, Gemini hit an account-tier error in three seconds.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_FAMILIES, REALISM_LEVELS, builtFamily } from "../src/families/registry.js";
import {
  BROWSER_HARNESS_REQUIREMENTS,
  browserHarnessPlanFailures,
} from "../src/families/ui-replay-browser-backed/harness.js";
import { browserBackedReadiness } from "../src/families/ui-replay-browser-backed/readiness.js";
import { renderBrowserBackedReadiness } from "../src/reports/browser-backed-readiness.js";
import { BROWSER_BACKED_NEXT_PLAN } from "../src/reports/browser-backed-scaffold.js";
import { diagnose } from "../src/reports/diagnosis.js";
import { computeCurve, wilson } from "../src/reports/difficulty.js";
import { familyEvidenceFor } from "../src/reports/evidence.js";
import { renderLiveDomCodexDiagnosis } from "../src/reports/live-dom-diagnosis.js";
import {
  type ArtifactQuality,
  describeArtifact,
  failurePairs,
  renderProviderVariance,
} from "../src/reports/provider-variance.js";
import { CAMPAIGN_SUBCOMMANDS, assertCampaignSubcommand, loadCampaigns } from "../src/trials/campaign.js";
import { prepareProviderBundle, readImportedBundle } from "../src/trials/cross-provider.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import {
  assertAmbiguityPostmortem,
  assertCampaignReissued,
  assertNoStaleCounted,
  assertSupersededDisclosed,
  evidenceLedger,
} from "../src/trials/evidence-lifecycle.js";
import { PROVIDERS, buildCommand, checkProvider, providerById } from "../src/trials/provider-registry.js";
import { AUTH_MARKERS, classifyRun } from "../src/trials/providers.js";
import { routeFor } from "../src/trials/router.js";
import { prepareChallenge } from "../src/trials/run.js";
import type { TrialRecord } from "../src/trials/types.js";

const ROOT = new URL("..", import.meta.url).pathname;
const MEMORY = "prompt-injection-memory-poisoning";

describe("the provider registry", () => {
  it("declares one spec per model family, each with an invocation note", () => {
    expect(PROVIDERS.length).toBeGreaterThanOrEqual(4);
    for (const spec of PROVIDERS) {
      expect(spec.invocationNote.length, spec.id).toBeGreaterThan(40);
      if (spec.binary !== null) expect(spec.command).not.toBeNull();
    }
    expect(new Set(PROVIDERS.map((p) => p.family)).size).toBeGreaterThanOrEqual(4);
  });

  it("substitutes the instruction into the argv template", () => {
    const spec = providerById("claude");
    const cmd = buildCommand(spec, "DO THE THING");
    expect(cmd).toContain("DO THE THING");
    expect(cmd?.[0]).toBe("claude");
  });

  it("an external provider has no command and is never runnable here", () => {
    const spec = providerById("external");
    expect(buildCommand(spec, "x")).toBeNull();
    expect(checkProvider(spec).available).toBe(false);
  });

  it("availability is decided by running the binary, not by declaring it", () => {
    const fake = { ...providerById("codex"), id: "ghost", binary: "definitely-not-a-real-binary-xyz" };
    const check = checkProvider(fake);
    expect(check.available).toBe(false);
    expect(check.detail).toMatch(/not runnable here/);
  });

  it("declares Anthropic providers import-only in this phase", () => {
    for (const id of ["claude", "claude-sonnet", "claude-haiku", "claude-fable"]) {
      const status = checkProvider(providerById(id));
      expect(status.available, id).toBe(false);
      expect(status.state, id).toBe("import-only");
      expect(status.detail, id).toMatch(/out of tokens|import-only/);
    }
  });
});

describe("classification: never asked is not failed", () => {
  it("an authentication or entitlement error is infrastructure, not a crash", () => {
    for (const marker of AUTH_MARKERS.slice(0, 5)) {
      const out = classifyRun(`some output\n${marker}\nmore output`, false, false, true);
      expect(out.classification, marker).toBe("infrastructure_error");
      expect(out.detail).toMatch(/could not authenticate|not entitled/);
    }
  });

  it("a crash with no auth marker stays a crash", () => {
    expect(classifyRun("TypeError: undefined is not a function", false, false, true).classification).toBe(
      "crashed",
    );
  });

  it("an artifact beats every other signal", () => {
    expect(classifyRun("not logged in", true, false, true).classification).toBe("completed");
  });

  it("the real Gemini run is recorded as infrastructure and does not count", () => {
    const dirs = readFamilyTrials(join(ROOT, "trials"), MEMORY);
    const gemini = dirs.find((d) => d.runId.includes("gemini"));
    if (gemini === undefined) return; // no gemini attempt on this checkout
    expect(gemini.record.counts).toBe(false);
    expect(["infrastructure_error", "crashed"]).toContain(gemini.record.status);
    expect(gemini.record.cells).toEqual([]);
  });
});

describe("prepared bundles for providers that cannot run here", () => {
  const dir = mkdtempSync(join(tmpdir(), "bundle-"));
  const bundle = prepareProviderBundle(ROOT, MEMORY, "external", dir);

  it("writes everything an external runner needs", () => {
    for (const name of ["INSTRUCTION.txt", "README.md", "metadata.json", "run.sh", "PROVIDER.json"]) {
      expect(existsSync(join(dir, name)), name).toBe(true);
    }
    expect(existsSync(join(dir, "challenge", "SPEC.md"))).toBe(true);
    expect(existsSync(join(dir, "submission"))).toBe(true);
  });

  it("pins the challenge hash into the metadata template", () => {
    const meta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8")) as Record<string, unknown>;
    expect(meta["challengeHash"]).toBe(bundle.challenge.hash);
    expect(meta["familyId"]).toBe(MEMORY);
  });

  it("ships no hidden artifact", () => {
    const spec = builtFamily(MEMORY);
    const files = bundle.challenge.pkg.files.map((f) => f.path.split("/").pop());
    for (const hidden of bundle.challenge.pkg.manifest.hiddenArtifacts) {
      expect(files).not.toContain(hidden);
    }
    expect(spec.leakProfile.familyId).toBe(MEMORY);
  });
});

describe("checker-required prepared bundles and imports", () => {
  const familyId = "checker-required-memory-poisoning";
  const dir = mkdtempSync(join(tmpdir(), "checker-bundle-"));
  const bundle = prepareProviderBundle(ROOT, familyId, "external", dir);
  const currentHash = prepareChallenge(ROOT, familyId).hash;

  const makeBundle = (files: Record<string, string>) => {
    const runDir = mkdtempSync(join(tmpdir(), "checker-import-"));
    writeFileSync(
      join(runDir, "metadata.json"),
      JSON.stringify({
        runId: "checker-import-1",
        familyId,
        provider: "external",
        model: "openai/gpt-5.6-sol",
        subjectId: "gpt-5.6-sol",
        status: "completed",
        challengeHash: currentHash,
      }),
      "utf8",
    );
    for (const [name, content] of Object.entries(files)) {
      const target = join(runDir, name);
      mkdirSync(target.split("/").slice(0, -1).join("/") || runDir, { recursive: true });
      writeFileSync(target, content, "utf8");
    }
    return runDir;
  };

  it("tells external runners to preserve both artifacts", () => {
    expect(bundle.challenge.hash).toBe(currentHash);
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    const runScript = readFileSync(join(dir, "run.sh"), "utf8");
    expect(readme).toContain("submission/subject.mjs");
    expect(readme).toContain("submission/checker.mjs");
    expect(runScript).toContain("submission/subject.mjs");
    expect(runScript).toContain("submission/checker.mjs");
  });

  it("refuses a completed checker-required import missing checker.mjs", () => {
    const runDir = makeBundle({
      "transcript.txt": "model wrote only the subject",
      "submission/subject.mjs": "export const subject = {};",
    });
    expect(() => readImportedBundle(runDir, familyId, currentHash)).toThrowError(
      expect.objectContaining({ code: "IMPORT_MISSING_SUBMISSION" }),
    );
  });

  it("accepts a completed checker-required import with both artifacts preserved", () => {
    const runDir = makeBundle({
      "transcript.txt": "model wrote both files",
      "submission/subject.mjs": "export const subject = {};",
      "submission/checker.mjs": "export const checker = {};",
    });
    const imported = readImportedBundle(runDir, familyId, currentHash);
    expect(imported.submissionFiles.map((f) => f.path).sort()).toEqual(["checker.mjs", "subject.mjs"]);
    expect(imported.submissionPath?.endsWith("subject.mjs")).toBe(true);
  });
});

describe("strict import", () => {
  const currentHash = prepareChallenge(ROOT, MEMORY).hash;

  const makeBundle = (overrides: Record<string, unknown>, files: Record<string, string> = {}) => {
    const dir = mkdtempSync(join(tmpdir(), "import-"));
    writeFileSync(
      join(dir, "metadata.json"),
      JSON.stringify({
        runId: "imported-1",
        familyId: MEMORY,
        provider: "external",
        model: "openai/gpt-5.6-sol",
        subjectId: "gpt-5.6-sol",
        status: "completed",
        challengeHash: currentHash,
        ...overrides,
      }),
      "utf8",
    );
    for (const [name, content] of Object.entries(files)) {
      const target = join(dir, name);
      if (name.includes("/")) {
        const parent = join(dir, name.split("/")[0] ?? "");
        if (!existsSync(parent)) mkdtempSync(parent);
      }
      writeFileSync(target, content, "utf8");
    }
    return dir;
  };

  it("IMPORT_MISSING_METADATA — a directory with no metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "import-empty-"));
    expect(() => readImportedBundle(dir, MEMORY, currentHash)).toThrowError(
      expect.objectContaining({ code: "IMPORT_MISSING_METADATA" }),
    );
  });

  it("IMPORT_FAMILY_MISMATCH — a bundle for another family", () => {
    const dir = makeBundle({ familyId: "ui-action-record-replay" });
    expect(() => readImportedBundle(dir, MEMORY, currentHash)).toThrowError(
      expect.objectContaining({ code: "IMPORT_FAMILY_MISMATCH" }),
    );
  });

  it("IMPORT_CHALLENGE_MISMATCH — a bundle run against a different version of the task", () => {
    const dir = makeBundle({ challengeHash: "0000deadbeef" });
    expect(() => readImportedBundle(dir, MEMORY, currentHash)).toThrowError(
      expect.objectContaining({ code: "IMPORT_CHALLENGE_MISMATCH" }),
    );
  });

  it("IMPORT_MISSING_TRANSCRIPT — a completed run nobody can read", () => {
    const dir = makeBundle({}, { "transcript.txt": "" });
    expect(() => readImportedBundle(dir, MEMORY, currentHash)).toThrowError(
      expect.objectContaining({ code: "IMPORT_MISSING_TRANSCRIPT" }),
    );
  });

  it("IMPORT_MISSING_SUBMISSION — a completed run with nothing to grade", () => {
    const dir = makeBundle({}, { "transcript.txt": "the model said things" });
    expect(() => readImportedBundle(dir, MEMORY, currentHash)).toThrowError(
      expect.objectContaining({ code: "IMPORT_MISSING_SUBMISSION" }),
    );
  });

  it("a refusal imports cleanly with neither transcript nor artifact requirements", () => {
    const dir = makeBundle({ status: "refused" }, { "transcript.txt": "I can't help with that." });
    const bundle = readImportedBundle(dir, MEMORY, currentHash);
    expect(bundle.status).toBe("refused");
    expect(bundle.submissionPath).toBeNull();
  });
});

describe("the evidence lifecycle", () => {
  const currentHash = prepareChallenge(ROOT, MEMORY).hash;
  const ledger = evidenceLedger(MEMORY, currentHash, readFamilyTrials(join(ROOT, "trials"), MEMORY));

  it("classifies the real trials into their states", () => {
    expect(ledger.counted.length).toBeGreaterThan(0);
    expect(ledger.superseded.length).toBeGreaterThan(0);
    for (const entry of ledger.entries) {
      if (entry.state === "superseded") expect(entry.ranAgainst).not.toBe(currentHash);
      if (entry.state === "counted") expect(entry.ranAgainst).toBe(currentHash);
    }
  });

  it("EVIDENCE_STALE_COUNTED — a superseded trial appearing in a counted set", () => {
    const stale = ledger.superseded[0] as string;
    const fake = { runId: stale, counts: true } as unknown as TrialRecord;
    expect(() => assertNoStaleCounted(ledger, [fake])).toThrowError(
      expect.objectContaining({ code: "EVIDENCE_STALE_COUNTED" }),
    );
  });

  it("the real counted set contains no superseded trial", () => {
    const bundle = familyEvidenceFor(ROOT, MEMORY);
    expect(() => assertNoStaleCounted(ledger, bundle.trials.records)).not.toThrow();
  });

  it("EVIDENCE_CAMPAIGN_NOT_REISSUED — a plan written for the old task", () => {
    const plan = loadCampaigns(ROOT).find((p) => p.familyId === MEMORY);
    expect(plan).toBeDefined();
    expect(() => assertCampaignReissued(plan as NonNullable<typeof plan>, "0000")).toThrowError(
      expect.objectContaining({ code: "EVIDENCE_CAMPAIGN_NOT_REISSUED" }),
    );
    // The checked-in plan WAS reissued after the repair, so it passes.
    expect(() => assertCampaignReissued(plan as NonNullable<typeof plan>, currentHash)).not.toThrow();
  });

  it("EVIDENCE_SUPERSEDED_HIDDEN — a report that omits the invalidated runs", () => {
    expect(() => assertSupersededDisclosed(ledger, "everything is fine")).toThrowError(
      expect.objectContaining({ code: "EVIDENCE_SUPERSEDED_HIDDEN" }),
    );
    const honest = ledger.superseded.join(" ");
    expect(() => assertSupersededDisclosed(ledger, honest)).not.toThrow();
  });

  it("EVIDENCE_AMBIGUITY_UNDOCUMENTED — a repair with no postmortem", () => {
    expect(() => assertAmbiguityPostmortem(MEMORY, ledger, false)).toThrowError(
      expect.objectContaining({ code: "EVIDENCE_AMBIGUITY_UNDOCUMENTED" }),
    );
    expect(() => assertAmbiguityPostmortem(MEMORY, ledger, true)).not.toThrow();
  });

  it("the checked-in reports do disclose the superseded runs", () => {
    const report = readFileSync(join(ROOT, "reports/spec-ambiguity-and-stale-evidence-report.md"), "utf8");
    expect(() => assertSupersededDisclosed(ledger, report)).not.toThrow();
  });
});

describe("difficulty curves", () => {
  const record = (model: string, failed: number, counts = true): TrialRecord =>
    ({
      runId: `${model}-${failed}`,
      familyId: MEMORY,
      subjectId: model.split("/").pop() ?? model,
      subjectType: "agent",
      model,
      effort: null,
      status: counts ? "completed" : "refused",
      counts,
      countsReason: "test",
      scenarioSetId: "s",
      cells: Array.from({ length: 10 }, (_, i) => ({
        scenarioId: `s${i}`,
        failed: i < failed ? ["check"] : [],
      })),
      runtimeSeconds: 1,
      costUsd: null,
      artifactPath: null,
      isolation: "subprocess",
      notes: "",
    }) as TrialRecord;

  it("one model family failing is `separates`, not `generalises`", () => {
    const curve = computeCurve({
      familyId: MEMORY,
      records: [record("anthropic/a", 3), record("anthropic/a", 0)],
      notRunByFamily: {},
      operatorConfirmed: false,
    });
    expect(curve.strength).toBe("separates");
    expect(curve.familiesWithFailures).toEqual(["anthropic"]);
  });

  it("failures from two model families is `generalises`", () => {
    const curve = computeCurve({
      familyId: MEMORY,
      records: [record("anthropic/a", 3), record("openai/b", 2)],
      notRunByFamily: {},
      operatorConfirmed: true,
    });
    expect(curve.strength).toBe("generalises");
  });

  it("one family failing and another passing is NOT generalisation", () => {
    // The real shape of the current memory-poisoning evidence.
    const curve = computeCurve({
      familyId: MEMORY,
      records: [record("anthropic/a", 3), record("openai/b", 0)],
      notRunByFamily: {},
      operatorConfirmed: true,
    });
    expect(curve.strength).toBe("operator-confirmed");
    expect(curve.claim).toMatch(/not that it works/);
  });

  it("no counted failure is already-solved however many trials there are", () => {
    const curve = computeCurve({
      familyId: MEMORY,
      records: [record("anthropic/a", 0), record("openai/b", 0), record("google/c", 0)],
      notRunByFamily: {},
      operatorConfirmed: true,
    });
    expect(curve.strength).toBe("already-solved");
  });

  it("refusals never enter the counted denominator", () => {
    const curve = computeCurve({
      familyId: MEMORY,
      records: [record("anthropic/a", 3), record("openai/b", 0, false)],
      notRunByFamily: {},
      operatorConfirmed: false,
    });
    const openai = curve.providers.find((p) => p.providerFamily === "openai");
    expect(openai?.counted).toBe(0);
    expect(openai?.refused).toBe(1);
    expect(openai?.failRate).toBeNull();
  });

  it("intervals are wide at these counts and never impossible", () => {
    const [lo, hi] = wilson(1, 3);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.5);
  });

  // The memory family crossed the five-trial threshold when the third and fourth subjects were run,
  // so `underpowered` is now false for it — which is the flag doing its job rather than the flag
  // being wrong. What must stay true is the RULE: a family below the threshold is flagged, and one
  // above it is not. Asserting the rule instead of the current answer keeps this test from having to
  // be edited every time a trial lands.
  it("flags a family below the trial threshold and stops flagging it above", () => {
    const record = (model: string, failed: number): TrialRecord =>
      ({
        runId: `${model}-${failed}`,
        familyId: MEMORY,
        subjectId: model.split("/").pop() ?? model,
        subjectType: "agent",
        model,
        effort: null,
        status: "completed",
        counts: true,
        countsReason: "test",
        scenarioSetId: "s",
        cells: Array.from({ length: 10 }, (_, i) => ({
          scenarioId: `s${i}`,
          failed: i < failed ? ["check"] : [],
        })),
        runtimeSeconds: 1,
        costUsd: null,
        artifactPath: null,
        isolation: "subprocess",
        notes: "",
      }) as TrialRecord;

    const few = computeCurve({
      familyId: MEMORY,
      records: [record("anthropic/a", 3), record("anthropic/b", 0)],
      notRunByFamily: {},
      operatorConfirmed: true,
    });
    expect(few.underpowered).toBe(true);

    const many = computeCurve({
      familyId: MEMORY,
      records: Array.from({ length: 6 }, (_, i) => record(`anthropic/m${i}`, i % 2)),
      notRunByFamily: {},
      operatorConfirmed: true,
    });
    expect(many.underpowered).toBe(false);
  });

  // And the live repository is past the threshold on its most-trialed family, which is worth
  // asserting as a fact rather than leaving implicit.
  it("the memory family now has enough counted trials to quote a rate", () => {
    const bundle = familyEvidenceFor(ROOT, MEMORY);
    const curve = computeCurve({
      familyId: MEMORY,
      records: bundle.trials.records,
      notRunByFamily: {},
      operatorConfirmed: true,
    });
    expect(curve.underpowered).toBe(false);
  });
});

describe("failure diagnosis", () => {
  const params = new Map(
    Array.from({ length: 12 }, (_, i) => [
      `s${i}`,
      { knob: i < 6 ? "low" : "high" } as Record<string, unknown>,
    ]),
  );
  const make = (failedIds: readonly number[], check: string): TrialRecord =>
    ({
      runId: "r",
      familyId: MEMORY,
      subjectId: "m",
      subjectType: "agent",
      model: "anthropic/a",
      effort: null,
      status: "completed",
      counts: true,
      countsReason: "ok",
      scenarioSetId: "s",
      cells: Array.from({ length: 12 }, (_, i) => ({
        scenarioId: `s${i}`,
        failed: failedIds.includes(i) ? [check] : [],
      })),
      runtimeSeconds: 1,
      costUsd: null,
      artifactPath: null,
      isolation: "subprocess",
      notes: "",
    }) as TrialRecord;

  it("failures confined to one knob value read as a capability finding", () => {
    const d = diagnose({
      familyId: MEMORY,
      record: make([6, 7, 8], "no_forbidden_call"),
      params,
      hypothesisChecks: ["no_forbidden_call"],
      hypothesisKnob: "knob",
    });
    expect(d.reading).toBe("capability");
    expect(d.matchesHypothesis).toBe(true);
    expect(d.repairSuspected).toBe(false);
  });

  it("a uniform single-check wipeout reads as a likely spec defect", () => {
    // The shape the M3/M5 ambiguity produced: one check, every knob value, evenly.
    const d = diagnose({
      familyId: MEMORY,
      record: make([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "block_reason_correct"),
      params,
      hypothesisChecks: ["no_forbidden_call"],
      hypothesisKnob: "knob",
    });
    expect(d.reading).toBe("likely-spec-defect");
    expect(d.repairSuspected).toBe(true);
    expect(d.notes.join(" ")).toMatch(/rule nobody could have satisfied/);
  });

  it("a clean trial is diagnosed as clean", () => {
    const d = diagnose({
      familyId: MEMORY,
      record: make([], "x"),
      params,
      hypothesisChecks: [],
      hypothesisKnob: null,
    });
    expect(d.reading).toBe("clean");
  });

  it("Live-DOM diagnosis keeps categorical mutant evidence separate from agent evidence", () => {
    const record = {
      ...make([0, 1], "replay_completes"),
      runId: "live-dom-test",
      familyId: "ui-replay-live-dom",
      model: "openai/gpt-5.6-sol",
      cells: [
        { scenarioId: "s0", failed: ["replay_completes"] },
        { scenarioId: "s1", failed: ["precondition_observed"] },
        { scenarioId: "s2", failed: [] },
      ],
    } as TrialRecord;
    const text = renderLiveDomCodexDiagnosis({
      records: [record],
      params: new Map([
        ["s0", { anchorConflict: "testid_wins", settleBudget: 0 }],
        ["s1", { anchorConflict: "semantic_wins", settleBudget: 2 }],
        ["s2", { anchorConflict: "path_wins", settleBudget: 6 }],
      ]),
      categoricalAnchorAxisProvenByMutants: true,
    });
    expect(text).toContain("categorical anchor axis proven by mutant bank | yes");
    expect(text).toContain("`replay_completes`");
    expect(text).toContain("`precondition_observed`");
    expect(text).toContain("did not fail `correct_anchor_resolution`");
  });
});

describe("realism labels", () => {
  it("every built family declares a level and what the next one would add", () => {
    for (const family of BUILT_FAMILIES) {
      expect(REALISM_LEVELS).toContain(family.realism);
      expect(family.realismGap.length, family.id).toBeGreaterThan(60);
    }
  });

  it("no family claims to be browser-backed", () => {
    // The label is a claim about implementation. Nothing here drives a browser, and a report that
    // said otherwise would be the exact overclaim the level exists to prevent.
    for (const family of BUILT_FAMILIES) {
      expect(family.realism, family.id).not.toBe("browser-backed");
    }
  });

  // KNOWN-BAD: the UI family claiming `dom-like` while being a simulated tree.
  //
  // It carried that label for two phases. The harness is an IMMUTABLE seven-node tree with a single
  // mutable boolean, resolved by `data-testid` only: nothing can drift, and nothing an action does
  // changes what a later action sees. Those are precisely the mechanics `dom-like` names, so the
  // label was a claim the code did not support. It is `simulated-tree` until a harness with a
  // mutable tree exists.
  it("the UI family is a simulated tree, not dom-like, until the harness changes", () => {
    expect(builtFamily("ui-action-record-replay").realism).toBe("simulated-tree");
    const report = readFileSync(join(ROOT, "reports/ui-action-record-replay-upgrade-report.md"), "utf8");
    expect(report).toMatch(/no renderer|deterministic tree/);
    expect(report).toMatch(/absent/);
  });

  it("the browser-backed scaffold encodes the next harness obligations without changing current labels", () => {
    expect(BROWSER_HARNESS_REQUIREMENTS.join(" ")).toMatch(/real DOM/);
    expect(BROWSER_HARNESS_REQUIREMENTS.join(" ")).toMatch(/effect ledger owned by the harness/);
    expect(
      browserHarnessPlanFailures({
        driver: "playwright",
        ownsEffectLedger: true,
        exposesPersistentHandlesToSubject: false,
        recordsModelCalls: true,
        finiteSettleBudget: true,
        sealsBeforeGrading: true,
        preservesBrowserTrace: true,
      }),
    ).toEqual([]);
    expect(
      browserHarnessPlanFailures({
        driver: "playwright",
        ownsEffectLedger: false,
        exposesPersistentHandlesToSubject: true,
        recordsModelCalls: false,
        finiteSettleBudget: false,
        sealsBeforeGrading: false,
        preservesBrowserTrace: false,
      }),
    ).toContain("effect ledger is not harness-owned");
  });

  it("browser-backed readiness is concrete but not measured", () => {
    const readiness = browserBackedReadiness(BROWSER_BACKED_NEXT_PLAN);
    expect(readiness.architectureReady).toBe(true);
    expect(readiness.browserBackedReady).toBe(false);
    expect(readiness.browserBackedMeasured).toBe(false);
    expect(readiness.checks.map((check) => check.id)).toContain("playwright-driver-implemented");
    expect(readiness.checks.find((check) => check.id === "playwright-driver-implemented")?.verdict).toBe(
      "fail",
    );
    const report = renderBrowserBackedReadiness(readiness);
    expect(report).toContain("Live-DOM remains dom-like");
    expect(report).toContain("Status: HOLD");
  });
});

describe("campaign subcommands", () => {
  it("accepts every declared subcommand", () => {
    for (const sub of CAMPAIGN_SUBCOMMANDS) {
      expect(() => assertCampaignSubcommand(sub)).not.toThrow();
    }
  });

  it("passes through no subcommand and flags, which the plan listing handles", () => {
    expect(() => assertCampaignSubcommand(undefined)).not.toThrow();
    expect(() => assertCampaignSubcommand("--plan")).not.toThrow();
  });

  // KNOWN-BAD: a typo that succeeds.
  //
  // `trials campaign statsu` used to fall through to the plan listing: two tidy rows, exit zero, and
  // nothing to tell the reader their command did not exist. A wrong command that produces
  // confident-looking output is worse than one that fails loudly.
  it("refuses a mistyped subcommand instead of listing plans", () => {
    expect(() => assertCampaignSubcommand("statsu")).toThrow(/not a campaign subcommand/);
    expect(() => assertCampaignSubcommand("statsu")).toThrow(/prepare, import, status/);
  });
});

describe("cross-provider failure overlap", () => {
  const run = (
    runId: string,
    model: string,
    scenarios: readonly string[],
    over: readonly string[],
    subjectType: "agent" | "mutant" = "agent",
  ): TrialRecord =>
    ({
      runId,
      familyId: MEMORY,
      subjectId: model.split("/").pop() ?? model,
      subjectType,
      model,
      effort: null,
      status: "completed",
      counts: true,
      countsReason: "test",
      scenarioSetId: "s",
      cells: over.map((id) => ({ scenarioId: id, failed: scenarios.includes(id) ? ["c"] : [] })),
      runtimeSeconds: 1,
      costUsd: null,
      artifactPath: null,
      isolation: "subprocess",
      notes: "",
    }) as TrialRecord;

  const ALL = ["s0", "s1", "s2", "s3"];

  it("names the four set relations correctly", () => {
    const pairs = failurePairs(MEMORY, [
      run("a", "anthropic/x", ["s0", "s1"], ALL),
      run("b", "openai/y", ["s0", "s1"], ALL),
      run("c", "openai/z", ["s0"], ALL),
      run("d", "google/w", ["s2", "s3"], ALL),
      run("e", "google/v", ["s1", "s2"], ALL),
    ]);
    const rel = (x: string, y: string) => pairs.find((p) => p.a === x && p.b === y)?.relation;
    expect(rel("a", "b")).toBe("identical");
    expect(rel("a", "c")).toBe("nested");
    expect(rel("a", "d")).toBe("disjoint");
    expect(rel("a", "e")).toBe("overlapping");
    expect(pairs.find((p) => p.a === "b" && p.b === "c")?.crossProvider).toBe(false);
    expect(pairs.find((p) => p.a === "a" && p.b === "b")?.crossProvider).toBe(true);
  });

  // KNOWN-BAD: mutants compared against models in a provider table.
  //
  // This shipped once. The first version of the overlap section took every counted failing record,
  // and the containment family's nine hand-written mutants swamped the table with 36 rows of
  // `local-nop-faker` versus `local-over-blocker` — implementations this repository wrote, in a
  // report about what different labs' models do. It is the exact merge the kinded banks exist to
  // prevent, arriving through a new report rather than through the bank code.
  it("never puts a mutant in a provider comparison", () => {
    const pairs = failurePairs(MEMORY, [
      run("mp-1", "anthropic/x", ["s0"], ALL),
      run("over-blocker", "mutant", ["s0", "s1"], ALL, "mutant"),
      run("nop-faker", "mutant", ["s1"], ALL, "mutant"),
    ]);
    expect(pairs).toHaveLength(0);
    for (const p of pairs) expect([p.a, p.b]).not.toContain("over-blocker");
  });

  // KNOWN-BAD: a family whose runs all nest reading as though it measured several things.
  //
  // The UI family's three trials fail 33, 46 and 90 scenarios, and the two smaller sets are strict
  // subsets of the largest. Three trials, three failure counts, one axis — the same collapse the
  // axis meter applies to instances. A report that lists them without saying so lets more runs read
  // as more coverage.
  it("says so when every pair nests", () => {
    const chained = [
      run("small", "anthropic/x", ["s0"], ALL),
      run("mid", "anthropic/y", ["s0", "s1"], ALL),
      run("big", "openai/z", ["s0", "s1", "s2"], ALL),
    ];
    const pairs = failurePairs(MEMORY, chained);
    expect(pairs.every((p) => p.relation === "nested")).toBe(true);

    const text = renderProviderVariance({
      families: [
        {
          familyId: MEMORY,
          curve: computeCurve({
            familyId: MEMORY,
            records: chained,
            notRunByFamily: {},
            operatorConfirmed: false,
          }),
          records: chained,
        },
      ],
      availability: [],
      artifacts: [],
    });
    expect(text).toContain("form a chain");
    expect(text).toContain("one axis observed at several sensitivities");
  });

  it("does not claim a chain when a pair is disjoint", () => {
    const mixed = [run("a", "anthropic/x", ["s0"], ALL), run("b", "openai/y", ["s2"], ALL)];
    const text = renderProviderVariance({
      families: [
        {
          familyId: MEMORY,
          curve: computeCurve({
            familyId: MEMORY,
            records: mixed,
            notRunByFamily: {},
            operatorConfirmed: false,
          }),
          records: mixed,
        },
      ],
      availability: [],
      artifacts: [],
    });
    expect(text).not.toContain("form a chain under subset inclusion");
    expect(text).toContain("at least one pair is disjoint or overlapping");
  });
});

describe("artifact description", () => {
  it("counts rule citations and spots self-verification", () => {
    const q = describeArtifact(
      "r",
      "anthropic",
      "// M1_UNTRUSTED_AUTHORITY\nfunction f(){ assert(true); }\n",
      ["M1_UNTRUSTED_AUTHORITY", "M2_CAPABILITY_NOT_GRANTED"],
      "counted",
      0,
    );
    expect(q.citesRules).toBe(1);
    expect(q.ruleCodesPublished).toBe(2);
    expect(q.selfVerifying).toBe(true);
    expect(q.lines).toBeGreaterThan(1);
  });

  it("a bare submission is neither", () => {
    const q = describeArtifact("r", "openai", "export const subject = {};", ["M1"], "counted", 0);
    expect(q.citesRules).toBe(0);
    expect(q.selfVerifying).toBe(false);
  });

  // KNOWN-BAD: a family that publishes no rule codes scoring 0 out of 0.
  //
  // The UI family states its contract as invariants rather than a numbered policy. Reporting `0`
  // there puts it at the bottom of a column it was never eligible for, and the reader draws the
  // obvious wrong conclusion. Zero-of-zero is not a low score, it is a missing measurement.
  it("reports n/a rather than zero when a family publishes no rule codes", () => {
    const q = describeArtifact("ui-1", "anthropic", "const x = 1;", [], "counted", 3);
    expect(q.citesRules).toBeNull();
    expect(q.ruleCodesPublished).toBe(0);

    const text = renderProviderVariance({ families: [], availability: [], artifacts: [q] });
    expect(text).toContain("n/a");
    expect(text).not.toMatch(/\| 0\/0 \|/);
  });

  // KNOWN-BAD: a superseded run quoted as a confident false positive.
  //
  // This one shipped. `mp-claude-2` cited 7 of 8 rule codes and failed 47 scenarios, and its own
  // record still says counted — because `counts` is about grading, not about whether the challenge
  // it was graded against still exists. The M3/M5 repair invalidated it. Reading `record.counts`
  // instead of the evidence ledger put an invalidated trial back into a report as the strongest
  // evidence on the page, which is the precise failure `assertNoStaleCounted` exists to prevent.
  it("never quotes a superseded run as a confident false positive", () => {
    const cited = "M1 M2 M3 M4 M5 M6 M7 M8";
    const codes = cited.split(" ");
    const superseded = describeArtifact("mp-old", "anthropic", cited, codes, "superseded", 47);
    const counted = describeArtifact("mp-new", "openai", cited, codes, "counted", 32);

    const both = renderProviderVariance({
      families: [],
      availability: [],
      artifacts: [superseded, counted],
    });
    expect(both).toContain("mp-new");
    expect(both).toMatch(/Confident false positives: 1 of 1/);

    const onlyStale = renderProviderVariance({
      families: [],
      availability: [],
      artifacts: [superseded],
    });
    expect(onlyStale).toContain("**superseded**");
    expect(onlyStale).toMatch(/Confident false positives.*None yet/s);
  });

  // The absence of self-checks is a finding, and a report that only prints a column of "no" makes
  // the reader tally it themselves. Whichever way the count goes, it gets stated in prose.
  it("states the self-verification tally rather than leaving it to be counted", () => {
    const none: ArtifactQuality[] = [
      describeArtifact("a", "anthropic", "const x = 1;", ["M1"], "counted", 1),
      describeArtifact("b", "openai", "const y = 2;", ["M1"], "counted", 1),
    ];
    expect(renderProviderVariance({ families: [], availability: [], artifacts: none })).toContain(
      "Not one of the 2 submissions built a self-check",
    );

    const some = [...none, describeArtifact("c", "google", "assert(1);", ["M1"], "counted", 0)];
    expect(renderProviderVariance({ families: [], availability: [], artifacts: some })).toContain(
      "1 of 3 submissions built some form of self-check",
    );
  });
});
