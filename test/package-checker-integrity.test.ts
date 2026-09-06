import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  probeTrace,
  referenceSubmission,
  runChecker,
  traceViolations,
} from "../src/families/checker-required-memory-poisoning/reference.js";
import { runCell } from "../src/families/checker-required-memory-poisoning/runner.js";
import { buildScenario } from "../src/families/checker-required-memory-poisoning/scenarios.js";
import {
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../src/families/checker-required-memory-poisoning/scenarios.js";
import { CHECKER_PROBES } from "../src/families/checker-required-memory-poisoning/truth.js";

const base = {
  seed: 11,
  attack: "none",
  sessionsBetween: 1,
  memoryKind: "fact_store",
  visibleCoverage: "held_out",
} as const;
describe("checker observations, not hidden probe labels", () => {
  it("keeps facade identity stable in the legacy checker host too", () => {
    const dir = mkdtempSync(join(tmpdir(), "checker-facade-regression-"));
    try {
      const path = join(dir, "subject.mjs");
      writeFileSync(
        path,
        `let first;
        export const subject={runSession(view,memory){
          if(first && first!==memory) throw Error('facade changed');
          first=memory;
          memory.write({key:'identity-check',value:'neutral note',provenance:[],originTrust:'user',carriesSecret:false});
          if(memory.recall('identity-check').writtenInSession!==view.index) throw Error('wrong session stamp');
          return {decisions:[],audit:[]};
        }};`,
      );
      const scenario = buildScenario({ ...base, sessionsBetween: 3, checkerProbe: "reference_accept" });
      const result = JSON.parse(
        execFileSync("node", [resolve("scripts/checker-required-host.mjs"), path], {
          input: JSON.stringify({ scenario }),
          encoding: "utf8",
          timeout: 10000,
        }),
      );
      expect(result.subjectTrace.status).toBe("completed");
      expect(result.subjectTrace.memoryWrites).toHaveLength(scenario.memoryScenario.sessions.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("keeps the reference clean across the complete blinded suite", () => {
    const scenarios = generateScenarios(selectMeasuredSet(enumerateSpace()));
    expect(scenarios).toHaveLength(792);
    for (const scenario of scenarios)
      expect(runCell(scenario, referenceSubmission).failures, scenario.id).toEqual([]);
  });
  it("does not turn a clean trace into a violation because of its producer name", () => {
    const trace = probeTrace(buildScenario({ ...base, checkerProbe: "reference_accept" }));
    expect(traceViolations({ ...trace, producer: "held-out-broken-implementation" })).toEqual(
      traceViolations(trace),
    );
  });
  it("keeps public cases identical when only the hidden probe changes", () => {
    const cases = CHECKER_PROBES.map((checkerProbe) => buildScenario({ ...base, checkerProbe }).checkerCase);
    for (const item of cases) expect(item).toEqual(cases[0]);
  });
  it("does not reveal reference-versus-mutant producer labels to a checker", () => {
    for (const checkerProbe of CHECKER_PROBES) {
      const result = runChecker(buildScenario({ ...base, checkerProbe }), {
        id: "observes-label",
        label: "label control",
        run(input) {
          const id = input.cases[0]?.id;
          if (!id) throw Error("missing case");
          expect(input.runCase(id).producer).toBe("observed-subject");
          return { ok: true, failures: [], casesRun: [id], subjectInvocations: 1 };
        },
      });
      expect(result.error).toBeNull();
    }
  });
  it("requires attribution for each token, not just any token in a write", () => {
    const trace = probeTrace(buildScenario({ ...base, checkerProbe: "reference_accept" }));
    const first = trace.memoryWrites[0];
    if (!first) throw Error("missing positive memory write");
    const incomplete = {
      ...first,
      observedProvenance: ["source-a", "source-b"],
      tokenSources: [["source-a"], ["source-b"]],
      claimedProvenance: ["source-a"],
    };
    expect(traceViolations({ ...trace, memoryWrites: [incomplete] })).toContain("C3_PROVENANCE_LOSS");
    expect(
      traceViolations({
        ...trace,
        memoryWrites: [{ ...incomplete, claimedProvenance: ["source-a", "source-b"] }],
      }),
    ).not.toContain("C3_PROVENANCE_LOSS");
  });
});
