import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { BUILT_FAMILY_IDS, builtFamily } from "../src/families/registry.js";
import type { AssuranceOperation } from "../src/packages/assurance.js";
import { validateFamilyControls } from "../src/packages/family-validation.js";
import { canonicalJson, publishPackage, sha256 } from "../src/packages/record.js";
import { packageSourceSeed } from "../src/packages/source.js";
import {
  gradeProtectedScenarios,
  protectedScenariosFor,
  verifyProtectedEvidence,
} from "../src/trials/router.js";
import { runSecureContainerHost } from "../src/trials/secure-runner.js";

const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "foundry-route-conformance-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const fixture = (familyId: string, kind = "reference", prefix = "", checkerPrefix = "") => {
  const directory = join(scratch, familyId, kind);
  mkdirSync(directory, { recursive: true });
  const family = builtFamily(familyId);
  const reference = resolve(
    dirname(family.typesPath),
    kind === "alternative" ? "alternative.ts" : "reference.ts",
  );
  const entry = join(directory, "subject.ts");
  const checker = familyId === "checker-required-memory-poisoning";
  writeFileSync(
    entry,
    `${prefix}\nexport { ${kind === "alternative" ? (checker ? "subject" : "alternative") : checker ? "referenceSubject" : "reference"} as subject } from ${JSON.stringify(reference)};`,
  );
  if (kind.startsWith("mutant-")) {
    const id = kind.slice("mutant-".length);
    writeFileSync(
      entry,
      `import { ALL_SUBJECTS } from ${JSON.stringify(resolve(dirname(family.typesPath), "runner.ts"))};
      const selected=ALL_SUBJECTS.find(s=>s.id===${JSON.stringify(id)}); export const subject=${checker ? "selected.subject" : "selected"};`,
    );
  }
  const entries = [entry];
  if (checker) {
    const file = join(directory, "checker.ts");
    writeFileSync(
      file,
      `${checkerPrefix}\nexport { ${kind === "alternative" ? "checker" : "strongChecker"} as checker } from ${JSON.stringify(reference)};`,
    );
    if (kind.startsWith("mutant-"))
      writeFileSync(
        file,
        `import { ALL_SUBJECTS } from ${JSON.stringify(resolve(dirname(family.typesPath), "runner.ts"))};export const checker=ALL_SUBJECTS.find(s=>s.id===${JSON.stringify(kind.slice(7))}).checker;`,
      );
    entries.push(file);
  }
  execFileSync(
    "pnpm",
    [
      "exec",
      "tsup",
      ...entries,
      "--out-dir",
      directory,
      "--format",
      "esm",
      "--no-dts",
      "--no-clean",
      "--no-splitting",
    ],
    { cwd: root, stdio: "pipe", timeout: 60_000 },
  );
  // Public submission convention is mjs; the trusted bundle is never added to this directory.
  copyFileSync(join(directory, "subject.js"), join(directory, "subject.mjs"));
  if (checker) copyFileSync(join(directory, "checker.js"), join(directory, "checker.mjs"));
  return join(directory, "subject.mjs");
};

describe("actual protected family interfaces", () => {
  for (const familyId of BUILT_FAMILY_IDS) {
    it(`${familyId}: reference and no-work through the real route`, async () => {
      const modulePath = fixture(familyId);
      const all = protectedScenariosFor(familyId);
      // Greedy one-way coverage of every declared selected knob value, plus the longest lifecycle.
      // Semantic sweeps cover the whole selected population; this is explicitly NOT exhaustive
      // protected Cartesian coverage. Shared state-machine parity is checked separately below.
      const seen = new Set<string>();
      const scenarios = all.filter((s) => {
        const params = (s as { params?: Record<string, unknown> }).params ?? {};
        const keys = Object.entries(params).map(([key, value]) => `${key}:${JSON.stringify(value)}`);
        if (keys.every((k) => seen.has(k))) return false;
        for (const k of keys) seen.add(k);
        return true;
      });
      const completedReplay = all.find(
        (s) =>
          (s as { expectedOutcome?: string }).expectedOutcome === "completed" &&
          ((s as { params?: { replayCount?: number } }).params?.replayCount ?? 0) > 1,
      );
      if (completedReplay && !scenarios.includes(completedReplay)) scenarios.push(completedReplay);
      expect(scenarios.length).toBeGreaterThan(0);
      let positive:
        | { scenario: (typeof scenarios)[number]; result: ReturnType<typeof runSecureContainerHost> }
        | undefined;
      const snapshot = publishPackage(
        join(scratch, "packages"),
        packageSourceSeed(root, familyId, "prompt-03"),
      );
      const operations: AssuranceOperation[] = [];
      const executions: unknown[] = [];
      let active = "";
      const execute: typeof runSecureContainerHost = (options, payload) => {
        const result = runSecureContainerHost(options, payload);
        executions.push({
          control: active,
          scenarioId: (payload as { scenario: { id: string } }).scenario.id,
          submissionDigest: sha256(readFileSync(options.modulePath)),
          evidenceDigest: sha256(
            canonicalJson({ channels: result.channels, report: result.report, error: result.error }),
          ),
          error: result.error,
          errorKind: result.errorKind ?? null,
          execution: result.execution ?? null,
        });
        return result;
      };
      const control = (id: string, run: () => void) =>
        operations.push({
          id,
          artifactDigest: sha256(readFileSync("test/protected-family-routes.test.ts")),
          route: "cell-container",
          evidenceClass: "local-execution",
          run: async () => {
            active = id;
            const start = executions.length;
            run();
            return {
              passed: true,
              detail: {
                executions: executions.slice(start),
                selectedScenarioIds: scenarios.map((s) => s.id),
              },
            };
          },
        });
      control("reference", () => {
        for (const scenario of scenarios) {
          const result = execute({ familyId, modulePath }, { scenario });
          expect(result.error, JSON.stringify(result.diagnostics)).toBeNull();
          expect(result.execution?.completed).toBe(true);
          expect(result.execution?.reportedAttempts).toBe(result.execution?.expectedAttempts);
          expect(verifyProtectedEvidence(familyId, scenario, result)).toEqual([]);
          if (["effects", "ledger", "queries"].some((k) => (result.channels[k]?.length ?? 0) > 0))
            positive ??= { scenario, result };
        }
      });
      control("alternative", () => {
        const alternative = fixture(familyId, "alternative");
        for (const scenario of scenarios) {
          const result = execute({ familyId, modulePath: alternative }, { scenario });
          expect(result.error, JSON.stringify(result.diagnostics)).toBeNull();
          expect(result.execution?.completed).toBe(true);
          expect(result.execution?.reportedAttempts).toBe(result.execution?.expectedAttempts);
          expect(verifyProtectedEvidence(familyId, scenario, result)).toEqual([]);
        }
      });
      control("near-miss", () => {
        const sweep = builtFamily(familyId).run();
        const control = sweep.mutantsCaught.find(
          (c) => c.caught && all.some((s) => sweep.matrix.results[s.id]?.[c.mutantId]?.failed.length === 0),
        );
        expect(control, "a narrow activating and non-activating control is required").toBeDefined();
        if (!control) throw Error("missing narrow control");
        const activation = all.find((s) =>
          sweep.matrix.results[s.id]?.[control.mutantId]?.failed.includes(control.check),
        );
        const nonActivation = all.find(
          (s) => sweep.matrix.results[s.id]?.[control.mutantId]?.failed.length === 0,
        );
        const mutant = fixture(familyId, `mutant-${control.mutantId}`);
        for (const scenario of [activation, nonActivation]) {
          if (!scenario) throw Error("missing parity witness");
          const result = execute({ familyId, modulePath: mutant }, { scenario });
          expect(result.error).toBeNull();
          expect(
            [...new Set(verifyProtectedEvidence(familyId, scenario, result).map((f) => f.check))].sort(),
          ).toEqual(sweep.matrix.results[scenario.id]?.[control.mutantId]?.failed);
        }
      });
      control("repeatability", () => {
        const repeated = execute({ familyId, modulePath }, { scenario: scenarios[0] });
        const repeatedAgain = execute({ familyId, modulePath }, { scenario: scenarios[0] });
        expect({ channels: repeated.channels, report: repeated.report, error: repeated.error }).toEqual({
          channels: repeatedAgain.channels,
          report: repeatedAgain.report,
          error: repeatedAgain.error,
        });
      });
      control("private-boundary", () => {
        const privateProbe = fixture(
          familyId,
          "private-boundary",
          `import fs from 'node:fs';
        if (process.getuid() !== 1000) throw Error('wrong subject identity');
        const dirs=fs.readdirSync('/tmp').filter(n=>n.startsWith('authority-private-'));
        if(dirs.length!==1) throw Error('missing private-file positive control');
        for(const path of ['/proc/1/environ','/proc/1/fd/0','/proc/1/mem', '/tmp/'+dirs[0]+'/adapter.mjs']) {
          try { const fd=fs.openSync(path, fs.constants.O_RDONLY|fs.constants.O_NONBLOCK);fs.closeSync(fd);throw Error('PRIVATE_READ_SUCCEEDED'); }
          catch(e) { if(!['EACCES','EPERM'].includes(e.code)) throw e; }
        }`,
        );
        const probed = execute({ familyId, modulePath: privateProbe }, { scenario: scenarios[0] });
        expect(probed.error).toBeNull();
        expect(verifyProtectedEvidence(familyId, scenarios[0], probed)).toEqual([]);
      });
      control("positive-work", () => {
        const sweep = builtFamily(familyId).run();
        const negatives = new Set([
          ...sweep.baselinesBlocked,
          ...sweep.mutantsCaught
            .filter((m) =>
              /wrong-payload|foreign-effect|duplicate-decision|correct-key-wrong|unrequested-work|always-/.test(
                m.mutantId,
              ),
            )
            .map((m) => m.mutantId),
        ]);
        for (const id of negatives) {
          const witness = all.find((s) => (sweep.matrix.results[s.id]?.[id]?.failed.length ?? 0) > 0);
          if (!witness) throw Error(`missing baseline witness: ${id}`);
          const bad = fixture(familyId, `mutant-${id}`);
          const result = execute({ familyId, modulePath: bad }, { scenario: witness });
          if (id === "no-checker") {
            // Missing required executable artifact is invalid execution, not a semantic failure.
            expect(result.error).not.toBeNull();
            expect(result.report).toBeNull();
            continue;
          }
          expect(result.error).toBeNull();
          expect(verifyProtectedEvidence(familyId, witness, result).length).toBeGreaterThan(0);
        }
        if (positive) {
          const forged = join(dirname(modulePath), "forged.mjs");
          const reports = Array.isArray(positive.result.report)
            ? positive.result.report
            : [positive.result.report];
          // Reports identical to a passing run and decorative purported ledgers, but NO operations.
          writeFileSync(
            forged,
            `const reports=${JSON.stringify(reports)};let i=0;
          const run=()=>({...reports[Math.min(i++,reports.length-1)],forgedLedger:${JSON.stringify(positive.result.channels)}});
          export const subject={run,runSession:run,replay:run};`,
          );
          const result = execute({ familyId, modulePath: forged }, { scenario: positive.scenario });
          expect(result.error).toBeNull();
          expect(verifyProtectedEvidence(familyId, positive.scenario, result).length).toBeGreaterThan(0);
        } else {
          expect(familyId).toBe("checker-required-memory-poisoning");
          const sweep = builtFamily(familyId).run();
          for (const id of [
            "accept-all-checker",
            "reject-all-checker",
            "checker-never-invokes-subject",
            "visible-only-checker",
          ]) {
            const witness = all.find((s) => (sweep.matrix.results[s.id]?.[id]?.failed.length ?? 0) > 0);
            if (!witness) throw Error(`missing checker witness: ${id}`);
            const bad = fixture(familyId, `mutant-${id}`);
            const result = execute({ familyId, modulePath: bad }, { scenario: witness });
            expect(result.error).toBeNull();
            expect(verifyProtectedEvidence(familyId, witness, result).length).toBeGreaterThan(0);
          }
          const noWork = fixture(familyId, "checker-no-work");
          writeFileSync(noWork, "export const subject={runSession(){return {decisions:[],audit:[]}}};");
          const witness = all[0];
          if (!witness) throw Error("missing no-work case");
          const result = execute({ familyId, modulePath: noWork }, { scenario: witness });
          expect(result.error).toBeNull();
          expect(verifyProtectedEvidence(familyId, witness, result).length).toBeGreaterThan(0);
        }
      });
      control("protocol", () => {
        const invalid = join(dirname(modulePath), "invalid.mjs");
        writeFileSync(invalid, "process.exit(0); export const subject={};");
        const graded = gradeProtectedScenarios(familyId, invalid, scenarios.slice(0, 1));
        expect(graded.hostErrors).toBe(1);
        expect(graded.outcome?.complete).toBe(false);
        expect(graded.isolation).toBe("cell-container");
        executions.push({
          control: active,
          kind: "incomplete",
          outcome: graded.outcome,
          errors: graded.errors,
        });
        const malformed = join(dirname(modulePath), "malformed.mjs");
        writeFileSync(
          malformed,
          `import{writeSync}from'node:fs';writeSync(3,'{"seq":999,"kind":"finish","args":[]}\\n');export const subject={};`,
        );
        const malformedResult = gradeProtectedScenarios(familyId, malformed, scenarios.slice(0, 1));
        expect(malformedResult.outcome?.complete).toBe(false);
        executions.push({
          control: active,
          kind: "malformed",
          outcome: malformedResult.outcome,
          errors: malformedResult.errors,
        });
        const oversized = join(dirname(modulePath), "oversized.mjs");
        writeFileSync(
          oversized,
          `import{writeSync}from'node:fs';writeSync(3,'x'.repeat(70000));export const subject={};`,
        );
        const oversizedResult = gradeProtectedScenarios(familyId, oversized, scenarios.slice(0, 1));
        expect(oversizedResult.outcome?.complete).toBe(false);
        executions.push({
          control: active,
          kind: "oversized",
          outcome: oversizedResult.outcome,
          errors: oversizedResult.errors,
        });
        const flood = join(dirname(modulePath), "flood.mjs");
        writeFileSync(
          flood,
          "import {writeSync} from 'node:fs';const chunk=Buffer.alloc(65536,120);for(let i=0;i<300;i++){let at=0;while(at<chunk.length){try{at+=writeSync(1,chunk,at)}catch(e){if(e.code!=='EAGAIN')throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1)}}}export const subject={};",
        );
        const resourceResult = gradeProtectedScenarios(familyId, flood, scenarios.slice(0, 1));
        expect(resourceResult.outcome?.complete).toBe(false);
        expect(resourceResult.errors?.[0]?.kind).toBe("resource");
        executions.push({
          control: active,
          kind: "diagnostic-limit",
          outcome: resourceResult.outcome,
          errors: resourceResult.errors,
        });
      });
      control("exact-coverage", () => {
        expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
        for (const group of ["reference", "alternative"]) {
          const rows = executions.filter((e) => (e as { control: string }).control === group) as {
            scenarioId: string;
          }[];
          expect(rows.map((r) => r.scenarioId)).toEqual(scenarios.map((s) => s.id));
        }
      });
      const evidence = await validateFamilyControls(root, snapshot, operations, {
        contractReviewed: true,
        unresolvedAmbiguities: 0,
        unrepairedBypasses: 0,
      });
      expect(evidence.decision.stages["trial-eligible"].allowed).toBe(false);
      const output = join(root, ".local", "prompt-03", "routes");
      mkdirSync(output, { recursive: true });
      writeFileSync(
        join(output, `${familyId}.json`),
        `${JSON.stringify(
          {
            familyId,
            imageIdentity: execFileSync(
              "docker",
              ["image", "inspect", "node:22-alpine", "--format", "{{.Id}}"],
              { encoding: "utf8" },
            ).trim(),
            package: snapshot.record,
            selectedScenarioIds: scenarios.map((s) => s.id),
            totalSelectedPopulation: all.length,
            ...evidence,
          },
          null,
          2,
        )}\n`,
      );
    }, 180_000);
  }
});

describe("replay controls exercise every attempt through the real boundary", () => {
  for (const familyId of ["ui-action-record-replay", "ui-replay-live-dom"]) {
    it(`${familyId}: earlier lies, missing steps, delayed reads and duplicate effects`, () => {
      const scenario = protectedScenariosFor(familyId).find(
        (s) =>
          (s as { expectedOutcome?: string }).expectedOutcome === "completed" &&
          (s as { params?: { replayCount: number } }).params?.replayCount === 2,
      );
      if (!scenario) throw Error("missing repeated-delivery positive witness");
      const reference = JSON.stringify(resolve(dirname(builtFamily(familyId).typesPath), "reference.ts"));
      for (const [kind, edit] of [
        [
          "earlier-observation-lie",
          `r={...r,steps:r.steps.map(s=>s.ran&&s.preconditionObserved!==null?{...s,preconditionObserved:'not-observed'}:s)};`,
        ],
        ["earlier-missing-step", "r={...r,steps:r.steps.slice(1)};"],
      ]) {
        const modulePath = fixture(
          familyId,
          kind,
          `import {reference as base} from ${reference}; const original=base.replay;let pass=0;
          base.replay=(trace,app)=>{let r=original(trace,app);if(pass++===0){${edit}}return r;};`,
        );
        const result = runSecureContainerHost({ familyId, modulePath }, { scenario });
        expect(result.error).toBeNull();
        expect(verifyProtectedEvidence(familyId, scenario, result).length).toBeGreaterThan(0);
      }
      const delayed = fixture(
        familyId,
        "delayed-observation",
        `import {reference as base} from ${reference};const original=base.replay;
        base.replay=(trace,app)=>{const pending=[];const proxy={...app,attr:(id,name)=>{
          const step=trace.steps.find(s=>s.precondition.attr===name);if(!step)return app.attr(id,name);
          pending.push([id,name]);return step.precondition.attrValue;}};
          const report=original(trace,proxy);for(const [id,name] of pending)app.attr(id,name);return report;};`,
      );
      const delayedResult = runSecureContainerHost({ familyId, modulePath: delayed }, { scenario });
      expect(delayedResult.error).toBeNull();
      expect(
        verifyProtectedEvidence(familyId, scenario, delayedResult).some(
          (f) => f.check === "precondition_observed",
        ),
      ).toBe(true);
      const duplicate = fixture(familyId, "mutant-duplicate-executor");
      const duplicateResult = runSecureContainerHost({ familyId, modulePath: duplicate }, { scenario });
      expect(duplicateResult.error).toBeNull();
      expect(
        verifyProtectedEvidence(familyId, scenario, duplicateResult).some(
          (f) => f.check === "replay_idempotent",
        ),
      ).toBe(true);
    }, 120_000);
  }
});

it("generated checker cases execute submitted code and expose recoverable API errors", () => {
  const familyId = "checker-required-memory-poisoning";
  const reference = JSON.stringify(resolve(dirname(builtFamily(familyId).typesPath), "reference.ts"));
  const modulePath = fixture(
    familyId,
    "generation-api",
    "",
    `import {strongChecker as base} from ${reference};
    const original=base.run;
    base.run=input=>{
      const invalid=(fn,code)=>{try{fn();throw Error('missing API error')}catch(e){if(e.code!==code)throw e}};
      invalid(()=>input.runCase('unknown-case'),'CASE_UNKNOWN');
      invalid(()=>input.makeCase({seed:-1}),'CASE_PARAMS');
      const a=input.makeCase({seed:101,attack:'secret_recall',sessionsBetween:3,memoryKind:'fact_store'});
      const b=input.makeCase({seed:102,attack:'none',sessionsBetween:0,memoryKind:'summary'});
      if(JSON.stringify(a)!==JSON.stringify(input.makeCase(a.params))||a.id===b.id||JSON.stringify(a.sessions)===JSON.stringify(b.sessions))throw Error('case identity or content drift');
      const traces=[input.runCase(a.id),input.runCase(b.id)];
      if(traces.some(t=>!t.audit.length || !t.toolInvocations.length))throw Error('generated subject not actually executed');
      for(let seed=200;seed<214;seed++)input.makeCase({seed});
      invalid(()=>input.makeCase({seed:999}),'CASE_LIMIT');
      const result=original(input);
      return {...result,casesRun:[a.id,b.id,...result.casesRun],subjectInvocations:result.subjectInvocations+2};
    };`,
  );
  const scenario = protectedScenariosFor(familyId)[0];
  if (!scenario) throw Error("missing case");
  const result = runSecureContainerHost({ familyId, modulePath }, { scenario });
  expect(result.error).toBeNull();
  expect(verifyProtectedEvidence(familyId, scenario, result)).toEqual([]);
}, 120_000);
