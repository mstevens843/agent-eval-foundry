// The row-5 shape and the self-check coverage metric.
//
// The block that matters is the last one: the metric is validated against a split `results/34`
// documented before the metric existed. It needed three corrections to get there and each was forced
// by the data rather than by taste, so each has a test pinning it. A metric tuned until it agreed
// with itself would pass none of them.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACKED_TERMINAL,
  coversGradedCase,
  detectsRecomputedKeyDoubleExecution,
  isCheckerPath,
  screenRowFive,
  selfCheckCoverage,
  simulateRecoverVsRecompute,
} from "../src/screens/index.js";
import type { RowFiveCandidate } from "../src/screens/row-five.js";

const base: RowFiveCandidate = {
  id: "t",
  domain: "d",
  value: "a key",
  committedEvidence: "an intent row committed before the call",
  boundary: "a crash",
  recomputation: "recomputing the key",
  movedInput: "epoch",
  localCheckOutcome: "green",
  gradedOn: "the external ledger",
  whyUnreadable: "another process",
  divergenceIsLocallyObservable: false,
  signalsEmitted: [],
};

describe("the row-5 shape", () => {
  it("accepts the shape when all six elements hold", () => {
    const r = screenRowFive(base);
    expect(r.verdict).toBe("row-five");
    expect(r.pBand).toEqual([0.35, 0.55]);
  });

  it("rejects a divergence the subject can see, because its own check would catch it", () => {
    expect(screenRowFive({ ...base, divergenceIsLocallyObservable: true }).verdict).toBe(
      "locally-observable",
    );
  });

  it("rejects a divergence that signals, because that is row 3 not row 5", () => {
    expect(screenRowFive({ ...base, signalsEmitted: ["TypeError"] }).verdict).toBe("signalled");
  });

  it("rejects an unrecoverable value as unfair rather than hard", () => {
    expect(screenRowFive({ ...base, committedEvidence: "none" }).verdict).toBe("unrecoverable");
  });

  it("rejects a divergence nothing grades", () => {
    expect(screenRowFive({ ...base, whyUnreadable: "" }).verdict).toBe("ungraded");
  });

  it("demonstrates the mechanism: recompute doubles the effect while the local check stays green", () => {
    const args = {
      stableId: "a1",
      valueBefore: "idem::a1::r1::0",
      valueAfter: "idem::a1::r1::1",
    } as const;
    const recovered = simulateRecoverVsRecompute({ ...args, strategy: "recover" });
    const recomputed = simulateRecoverVsRecompute({ ...args, strategy: "recompute" });

    expect(recovered.externalEffects).toBe(1);
    expect(recomputed.externalEffects).toBe(2);
    expect(recovered.gradedAsFailure).toBe(false);
    expect(recomputed.gradedAsFailure).toBe(true);
    // The whole of calibration row 5, in one assertion: the measurement the agent can make is green
    // in the failing case exactly as it is in the passing one.
    expect(recovered.localCheckPasses).toBe(true);
    expect(recomputed.localCheckPasses).toBe(true);
  });

  it("screens the generated instances: 5 of 10 have the shape", () => {
    const cands = JSON.parse(
      readFileSync(join(__dirname, "..", "data", "row-five-candidates.json"), "utf8"),
    ) as RowFiveCandidate[];
    const survivors = cands.filter((c) => screenRowFive(c).verdict === "row-five");
    expect(cands).toHaveLength(10);
    // Kill signal 4 fires below 5. Registered before the instances were written.
    expect(survivors.length).toBeGreaterThanOrEqual(5);
    // 6 until Phase 8. `stale-cache-recompute` was recorded by the AUTHOR with
    // divergenceIsLocallyObservable: false; an independent reader then designed the discriminating
    // narrowing fixture unprompted and showed the divergence IS locally observable, so the screen now
    // rejects it. The lesson is about the input, not the screen: these flags are author assertions
    // until a reader tests them, and the first one tested was wrong. The count now sits ON the kill
    // threshold rather than above it.
    expect(survivors.length).toBe(5);
  });
});

describe("self-check coverage: the three corrections the data forced", () => {
  it("1. a legality table that omits the graded pair covers the rule; one that lists it does not", () => {
    const omits = "LEGAL = { (READY, LEASED), (LEASED, EXECUTED), (EXECUTED, ACKED), (EXECUTED, REVOKED) }";
    const lists = `${omits.slice(0, -1)}, (ACKED, REVOKED) }`;
    expect(coversGradedCase([omits], ACKED_TERMINAL)).toBe(true);
    expect(coversGradedCase([lists], ACKED_TERMINAL)).toBe(false);
  });

  it("2. editing and running the graded artifact is the task, not self-verification", () => {
    const input = {
      runId: "r",
      agentWrittenSources: [],
      agentWrittenPaths: ["/app/engine/worker.py"],
      commands: ["python3 -m harness.driver --schedule x.json", "python3 engine/worker.py"],
      gradedArtifactPrefixes: ["engine/", "/app/engine"],
      verifierFailed: true,
    };
    expect(selfCheckCoverage(input, ACKED_TERMINAL).ranOwnTooling).toBe(false);
  });

  it("3. a scenario file is data, not a checker", () => {
    expect(isCheckerPath("/tmp/unknown-landed.json")).toBe(false);
    expect(isCheckerPath("/app/check.py")).toBe(true);
    const input = {
      runId: "r",
      agentWrittenSources: [],
      agentWrittenPaths: ["/tmp/unknown-landed.json"],
      commands: ["python3 -m harness.driver --schedule /tmp/unknown-landed.json"],
      gradedArtifactPrefixes: ["engine/"],
      verifierFailed: true,
    };
    // Generating inputs is exploration. Only something that decides can be green over a failure.
    expect(selfCheckCoverage(input, ACKED_TERMINAL).ranOwnTooling).toBe(false);
    expect(selfCheckCoverage(input, ACKED_TERMINAL).greenOverFailing).toBe(false);
  });

  it("an agent that never wrote an assertion cannot have a green self-check", () => {
    const input = {
      runId: "r",
      agentWrittenSources: [],
      agentWrittenPaths: [],
      commands: ["ls", "cat spec/SEMANTICS.md"],
      gradedArtifactPrefixes: [],
      verifierFailed: true,
    };
    expect(selfCheckCoverage(input, ACKED_TERMINAL).greenOverFailing).toBe(false);
  });

  it("the row-5 probe fires on tooling that counts effects per action, not per key", () => {
    expect(detectsRecomputedKeyDoubleExecution(["calls_by_action = Counter(); check exactly_once"])).toBe(
      true,
    );
    expect(detectsRecomputedKeyDoubleExecution(["assert state in LEGAL"])).toBe(false);
  });
});
