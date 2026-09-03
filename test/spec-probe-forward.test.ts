// The forward build, pinned at the gate that killed it.
//
// `payment-unknown-capture-receipt` is the first family in this repository ever taken through the
// spec-only probe BEFORE an implementation existed. It did not survive: four independent readers,
// given the SPEC alone, found 11 defect clusters, and a full repair pass moved that to 10 while
// introducing two new ones. Pre-registered kill signal 2 fires above two, so the family was retired
// at gate 1 — no reference, no verifier, no mutants, no starter, no paid trial.
//
// These assertions exist so the numbers in `reports/PHASE-5-FORWARD.md` cannot drift from the
// artifact that produced them. Phase 3 reported probe figures from a scratch directory that a
// machine restart erased, and one of those figures later turned out to be wrong. A number in a
// report with nothing pinning it is a claim.
//
// The assertion that matters is not the raw ambiguity count — that is a function of how verbose four
// readers felt. It is that the repair pass did NOT get the family under the threshold, which is what
// makes the kill honest rather than a decision taken and then justified.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Reader {
  readonly answers: readonly { question: string; answer: string; confident?: boolean }[];
  readonly ambiguities: readonly { what: string; whyItMatters?: string }[];
}
interface Pass {
  readonly specVersion: string;
  readonly readers: Record<string, Reader>;
}

const DATA = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "spec-probe-payment-unknown-capture.json"), "utf8"),
) as {
  familyId: string;
  verdict: string;
  specV1: string;
  specV2: string;
  passes: readonly Pass[];
};

const pass = (v: string): Pass => {
  const p = DATA.passes.find((x) => x.specVersion === v);
  if (p === undefined) throw new Error(`no pass ${v}`);
  return p;
};

const ambiguities = (v: string): number =>
  Object.values(pass(v).readers).reduce((n, r) => n + r.ambiguities.length, 0);

const unconfidentQuestions = (v: string): string[] => {
  const out = new Set<string>();
  for (const r of Object.values(pass(v).readers)) {
    for (const a of r.answers) if (a.confident === false) out.add(a.question);
  }
  return [...out].sort();
};

describe("the probe ran before any implementation existed", () => {
  it("four readers, both passes, all of them answering", () => {
    for (const v of ["v1", "v2"]) {
      const readers = Object.keys(pass(v).readers);
      expect(readers.length, v).toBe(4);
      for (const r of readers) {
        expect(pass(v).readers[r]?.answers.length, `${v}/${r}`).toBeGreaterThan(10);
      }
    }
  });

  it("one of the readers was a different provider family", () => {
    // Without this the whole exercise measures one model talking to itself, which is the limitation
    // Phase 4's calibration was criticised for and Lane A then caught in the act at 0/5 agreement.
    expect(Object.keys(pass("v1").readers)).toContain("reader-4-cross-family");
    expect(Object.keys(pass("v2").readers)).toContain("reader-4-cross-family");
  });

  it("both SPEC versions are preserved verbatim", () => {
    // The findings are unreadable without the document they are about.
    expect(DATA.specV1).toContain("Payment Unknown Capture Receipt SPEC");
    expect(DATA.specV2).toContain("Payment Unknown Capture Receipt SPEC");
    expect(DATA.specV1).not.toBe(DATA.specV2);
    // v2's repairs, spot-checked: the transition table is completed and the two final states named.
    expect(DATA.specV2).toContain("always moves the capture `PENDING -> SUBMITTED` first");
    expect(DATA.specV2).toContain("PUC6_ACCEPTED_STAYS_SUBMITTED");
  });
});

describe("the repair pass did not clear the family", () => {
  it("v1 found substantially more than the kill threshold", () => {
    expect(ambiguities("v1")).toBe(94);
    expect(unconfidentQuestions("v1").length).toBeGreaterThanOrEqual(10);
  });

  it("v2 was better and still nowhere near clear", () => {
    expect(ambiguities("v2")).toBe(75);
    // The honest measure: a repair pass that fixed six questions outright still left four with a
    // reader who had to guess.
    expect(unconfidentQuestions("v2")).toEqual(["Q12", "Q14", "Q6", "Q7"]);
  });

  it("kill signal 2 fires: more than two findings survive the repair", () => {
    // The threshold was written down before the SPEC was, in the phase brief. Two.
    const KILL_THRESHOLD = 2;
    expect(unconfidentQuestions("v2").length).toBeGreaterThan(KILL_THRESHOLD);
    expect(DATA.verdict).toBe("retired-at-spec-probe");
  });

  it("nothing was built past the gate", () => {
    // The economic claim depends on this being true, so it is asserted rather than said: no family
    // directory, no challenge package, no trials for this id anywhere in the repository.
    const ROOT = join(__dirname, "..");
    for (const path of [
      join(ROOT, "src", "families", DATA.familyId),
      join(ROOT, "examples", "families", DATA.familyId),
      join(ROOT, "trials", DATA.familyId),
    ]) {
      expect(() => readFileSync(path), `${path} should not exist`).toThrow();
    }
  });
});
