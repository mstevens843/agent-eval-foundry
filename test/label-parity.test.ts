// Two labels, one consequence — pinned, because it currently holds by accident.
//
// `spec-underspecified` and `spec-contradiction` are deliberately separate labels: they carry
// different repairs. A contradiction means fix the sentence; underspecification means add one. But
// for every GATE in this repository they must mean the same thing — neither is capability, both
// block a difficulty claim, both route to spec repair.
//
// Today that parity holds for a good reason: every consumer routes through the exported sets
// (`FAILURE_ATTRIBUTING`, `DIFFICULTY_EVIDENCE_CAUSES`) rather than comparing label strings, so the
// two labels are literally indistinguishable downstream. Nothing enforced that. A future gate written
// with `if (label === "spec-underspecified")` would split them silently and no test would notice,
// which is how a taxonomy seam turns into a measurement error.
//
// The second half of this file covers a hole that WAS open. `parsePromotion` gated
// `difficulty-evidenced` on `countedAgentTrials > 0` — on a trial EXISTING, not on anybody having
// read it. Five counted outbox trials in this repository are root-caused `spec-underspecified`, and
// under that check alone they would have carried a difficulty claim. That is the precise claim the
// last two phases spent their time withdrawing, surviving in the one validator the root-cause layer
// never reached.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePromotion } from "../src/foundry/promotion.js";
import {
  DIFFICULTY_EVIDENCE_CAUSES,
  FAILURE_ATTRIBUTING,
  ROOT_CAUSES,
  type RootCause,
} from "../src/trials/root-cause.js";

const SPEC_DEFECTS: readonly RootCause[] = ["spec-underspecified", "spec-contradiction"];

describe("the two spec-defect labels are one class to every gate", () => {
  it("both exist as labels, because they carry different repairs", () => {
    for (const label of SPEC_DEFECTS) expect(ROOT_CAUSES).toContain(label);
  });

  it("neither is difficulty evidence", () => {
    for (const label of SPEC_DEFECTS) {
      expect(DIFFICULTY_EVIDENCE_CAUSES.has(label), label).toBe(false);
    }
    // And the set is exactly one label, so "not capability" and "not difficulty evidence" coincide.
    expect([...DIFFICULTY_EVIDENCE_CAUSES]).toEqual(["capability"]);
  });

  it("both attribute the failure, so both block a difficulty claim", () => {
    for (const label of SPEC_DEFECTS) {
      expect(FAILURE_ATTRIBUTING.has(label), label).toBe(true);
    }
  });

  it("every membership decision treats them identically", () => {
    // The property that actually matters: for any set the root-cause layer exports, the two labels
    // are on the same side of it. A gate cannot distinguish them without adding a new set, which is
    // a visible change rather than a silent one.
    const sets: readonly (readonly [string, ReadonlySet<RootCause>])[] = [
      ["FAILURE_ATTRIBUTING", FAILURE_ATTRIBUTING],
      ["DIFFICULTY_EVIDENCE_CAUSES", DIFFICULTY_EVIDENCE_CAUSES],
    ];
    for (const [name, set] of sets) {
      const [a, b] = SPEC_DEFECTS;
      expect(set.has(a as RootCause), `${name} splits the two spec-defect labels`).toBe(
        set.has(b as RootCause),
      );
    }
  });
});

// ---------------------------------------------------------------- the promotion hole

// Built from a real, valid promotion on disk rather than a hand-rolled literal, so the test exercises
// the whole schema and cannot pass because the parser rejected the fixture for an unrelated reason.
const BASE = JSON.parse(readFileSync(join(__dirname, "..", "data", "promotions.json"), "utf8"))[0] as Record<
  string,
  unknown
>;

const parseOrThrow = (evidence: Record<string, unknown>) =>
  parsePromotion(
    { ...BASE, evidence: { ...(BASE.evidence as Record<string, unknown>), ...evidence } },
    "promotion",
  );

describe("a counted trial is not difficulty evidence until somebody has read it", () => {
  it("still rejects a difficulty claim with no counted trial at all", () => {
    expect(() =>
      parseOrThrow({ claimedEvidenceLevel: "difficulty-evidenced", countedAgentTrials: 0 }),
    ).toThrow(/PROMOTION_CLAIMS_DIFFICULTY_PRETRIAL|difficulty/i);
  });

  it("REJECTS a difficulty claim backed by counted trials nobody attributed to the subject", () => {
    // The hole. Six counted trials, every one of them root-caused `spec-underspecified`, which is
    // exactly the shape of the outbox bank on disk. This used to pass.
    expect(() =>
      parseOrThrow({
        claimedEvidenceLevel: "difficulty-evidenced",
        countedAgentTrials: 6,
        capabilityLabelledTrials: 0,
      }),
    ).toThrow(/PROMOTION_DIFFICULTY_UNATTRIBUTED|capability/i);
  });

  it("accepts a difficulty claim backed by a trial root-caused capability", () => {
    const promotion = parseOrThrow({
      claimedEvidenceLevel: "difficulty-evidenced",
      countedAgentTrials: 6,
      capabilityLabelledTrials: 2,
    });
    expect(promotion.evidence.capabilityLabelledTrials).toBe(2);
  });

  it("defaults the new field to zero, so silence cannot claim difficulty", () => {
    // Promotions written before the field existed must still parse — and must not be able to claim
    // difficulty by omission. Absent is treated as zero, which blocks.
    const promotion = parseOrThrow({ claimedEvidenceLevel: "local-evidence", countedAgentTrials: 0 });
    expect(promotion.evidence.capabilityLabelledTrials).toBe(0);
    expect(() =>
      parseOrThrow({ claimedEvidenceLevel: "difficulty-evidenced", countedAgentTrials: 6 }),
    ).toThrow(/PROMOTION_DIFFICULTY_UNATTRIBUTED|capability/i);
  });

  it("leaves every weaker evidence level alone", () => {
    for (const level of ["planning", "local-evidence"] as const) {
      expect(() => parseOrThrow({ claimedEvidenceLevel: level, countedAgentTrials: 0 })).not.toThrow();
    }
  });
});
