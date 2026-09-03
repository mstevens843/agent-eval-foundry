// The ported screens, and the calibration ladder that gives them a pass band.
//
// The last block in this file is the one that matters. A screen that has rejected five of five real
// artifacts -- including one written by an author who knew every failure mode and wrote against each
// -- is indistinguishable from a screen that always says no, and this repository has been in exactly
// that position for two phases. Lane C's job is to exhibit something the screen PASSES, built to the
// calibration table's row 5, so that its rejections start meaning something.
//
// Registered before these were written: row 5 passes. If it had not, that was the headline and the
// thresholds were not to be adjusted until something got through.

import { describe, expect, it } from "vitest";
import {
  activationAudit,
  cheapClassifierAccuracy,
  classify,
  entropy,
  identifiabilityCheck,
  leakAudit,
  mutualInformation,
  passRateBand,
  vise,
} from "../src/screens/index.js";
import type { CorpusRow } from "../src/screens/leak.js";
import type { EvidenceChain } from "../src/screens/types.js";
import type { Cell, Matrix } from "../src/types.js";

const VISIBLE = [
  "## 6. Revocation and supersession",
  "If revocation lands after the tool call has already happened, the side effect stands and the",
  "action is recorded as `EXECUTED` then `REVOKED`; it must not be executed a second time.",
  "## 9. Audit",
  "The audit must explain every transition that occurred, and contain no transition that did not.",
].join("\n");

const chain = (over: Partial<EvidenceChain>): EvidenceChain => ({
  id: "c",
  question: "q",
  answer: "a",
  citations: [{ section: "§9", quote: "contain no transition that did not" }],
  steps: ["one step"],
  negativeInference: false,
  assumptions: [],
  author: "test",
  ...over,
});

describe("screen 1 -- the vise test", () => {
  it("voids a chain whose citation is not in the package", () => {
    // The single most common way a plausible derivation fails: the reader quotes what the author
    // meant to write rather than what the author wrote.
    const v = vise(chain({ citations: [{ section: "§4", quote: "ACKED is a terminal state" }] }), VISIBLE);
    expect(v.band).toBe("unfair");
    expect(v.unverifiedCitations).toHaveLength(1);
    expect(v.reasons[0]).toContain("do not appear in the visible package");
  });

  it("survives a line wrap, because every markdown file has had one", () => {
    const v = vise(
      chain({
        citations: [
          {
            section: "§6",
            quote: "the side effect stands and the action is recorded as `EXECUTED` then `REVOKED`",
          },
        ],
      }),
      VISIBLE,
    );
    expect(v.unverifiedCitations).toHaveLength(0);
  });

  it("bands an assumption as underspecified however short the chain is", () => {
    const v = vise(chain({ assumptions: ["that the enumeration is closed"] }), VISIBLE);
    expect(v.band).toBe("underspecified");
  });

  it("bands one sentence, one section, depth 1 as explicit", () => {
    expect(vise(chain({}), VISIBLE).band).toBe("explicit");
  });

  it("bands a load-bearing negative inference as fragile, not as fair", () => {
    // This is the ACKED case and it is the whole reason the flag exists.
    const v = vise(
      chain({
        citations: [
          { section: "§6", quote: "action is recorded as `EXECUTED` then `REVOKED`" },
          { section: "§9", quote: "contain no transition that did not" },
        ],
        steps: ["a", "b"],
        negativeInference: true,
        negativeInferenceSite: "§4's enumeration read as exhaustive",
      }),
      VISIBLE,
    );
    expect(v.band).toBe("demanding-fragile");
    expect(v.reasons.join(" ")).toContain("not being stated");
  });

  it("bands two citations across two sections at depth 2 as the interior", () => {
    const v = vise(
      chain({
        citations: [
          { section: "§6", quote: "action is recorded as `EXECUTED` then `REVOKED`" },
          { section: "§9", quote: "contain no transition that did not" },
        ],
        steps: ["a", "b"],
      }),
      VISIBLE,
    );
    expect(v.band).toBe("demanding-fair");
    expect(v.profile).toMatchObject({ citationCount: 2, sectionSpan: 2, inferenceDepth: 2 });
  });

  it("bands four citations as tortuous even with nothing else wrong", () => {
    const v = vise(
      chain({
        citations: [
          { section: "§6", quote: "revocation lands after the tool call" },
          { section: "§9", quote: "contain no transition that did not" },
          { section: "§9", quote: "The audit must explain every transition that occurred" },
          { section: "§6", quote: "it must not be executed a second time" },
        ],
        steps: ["a", "b"],
      }),
      VISIBLE,
    );
    expect(v.band).toBe("demanding-fragile");
  });
});

// --- matrix helpers ---------------------------------------------------------------------------

const mkMatrix = (
  instances: readonly { id: string; schedule: string; keys: number | null }[],
  subjects: readonly string[],
  failed: (instanceId: string, subjectId: string) => readonly string[],
  checksDeclared: readonly string[],
): Matrix => {
  const results: Record<string, Record<string, Cell | null>> = {};
  for (const inst of instances) {
    results[inst.id] = {};
    for (const s of subjects)
      (results[inst.id] as Record<string, Cell | null>)[s] = { failed: failed(inst.id, s) };
  }
  return {
    schema: "t",
    suite: "t",
    provenance: {
      repo: null,
      artifact_commit: null,
      task_sha256: null,
      suite_shape: null,
      checks_total: null,
      checks_declared: checksDeclared,
      extracted_from: [],
      caveat: null,
    },
    reference_subject: null,
    subjects: subjects.map((id) => ({
      id,
      label: id,
      family: "f",
      model: null,
      effort: null,
      note: null,
    })),
    instances: instances.map((i) => ({
      id: i.id,
      schedule: i.schedule,
      seed: 1,
      keys: i.keys,
      family: "f",
      source: null,
      note: null,
    })),
    results,
  };
};

describe("screen 2 -- the activation audit", () => {
  it("kills a check nobody ever fails", () => {
    const m = mkMatrix(
      [
        { id: "i1", schedule: "a/x", keys: 1 },
        { id: "i2", schedule: "b/x", keys: 1 },
      ],
      ["s1", "s2"],
      (i, s) => (i === "i1" && s === "s1" ? ["live"] : []),
      ["live", "never_fires"],
    );
    const v = activationAudit(m);
    expect(v.passed).toBe(false);
    expect(v.dead.map((d) => d.name)).toContain("never_fires");
  });

  it("kills a check EVERYBODY fails, which is a constant wearing a check's name", () => {
    const m = mkMatrix(
      [
        { id: "i1", schedule: "a/x", keys: 1 },
        { id: "i2", schedule: "b/x", keys: 1 },
      ],
      ["s1", "s2"],
      () => ["always"],
      ["always"],
    );
    expect(activationAudit(m).dead.map((d) => d.name)).toContain("always");
  });

  it("does not credit a knob with variation another knob caused", () => {
    // `keys` never changes anything; `schedule` changes everything. The first version of this
    // function called both live, because it asked whether ANY two instances differed.
    const m = mkMatrix(
      [
        { id: "i1", schedule: "a", keys: 1 },
        { id: "i2", schedule: "a", keys: 2 },
        { id: "i3", schedule: "b", keys: 1 },
        { id: "i4", schedule: "b", keys: 2 },
      ],
      ["s1"],
      (i) => (i.startsWith("i3") || i.startsWith("i4") ? ["c"] : []),
      ["c"],
    );
    const knobs = activationAudit(m).records.filter((r) => r.kind === "knob");
    expect(knobs.find((k) => k.name === "keys")?.separated).toBe(false);
    expect(knobs.find((k) => k.name === "schedule")?.separated).toBe(true);
  });

  it("reports an undeclared check universe as unmeasurable rather than clean", () => {
    const m = mkMatrix([{ id: "i1", schedule: "a", keys: 1 }], ["s1"], () => ["c"], []);
    const v = activationAudit(m);
    expect(v.passed).toBe(false);
    expect(v.reasons.join(" ")).toContain("unmeasurable, not clean");
  });

  it("does not kill on a knob that simply never varied", () => {
    const m = mkMatrix(
      [
        { id: "i1", schedule: "a", keys: 1 },
        { id: "i2", schedule: "b", keys: 1 },
      ],
      ["s1", "s2"],
      (i, s) => (i === "i1" && s === "s1" ? ["c"] : []),
      ["c"],
    );
    const v = activationAudit(m);
    expect(v.passed).toBe(true);
    expect(v.reasons.join(" ")).toContain("never varied");
  });
});

describe("screens 3 and 4 -- leak and identifiability", () => {
  const rows = (
    n: number,
    label: (i: number) => string,
    vis: (i: number) => Record<string, string>,
  ): CorpusRow[] => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, visible: vis(i), label: label(i) }));

  it("mutual information is zero for an independent field and maximal for a copy", () => {
    const labels = ["a", "b", "a", "b"];
    expect(mutualInformation(["x", "x", "x", "x"], labels)).toBeCloseTo(0, 9);
    expect(mutualInformation(labels, labels)).toBeCloseTo(entropy(labels), 9);
  });

  it("catches a visible field that carries the label", () => {
    const v = leakAudit(
      "t",
      rows(
        40,
        (i) => (i % 2 === 0 ? "P" : "F"),
        (i) => ({ tell: i % 2 === 0 ? "P" : "F" }),
      ),
    );
    expect(v.passed).toBe(false);
    expect(v.worstField).toBe("tell");
  });

  it("does not fail an imbalanced corpus for its imbalance alone", () => {
    // 90% one label: a do-nothing classifier scores 90% and that must not read as a leak.
    const v = leakAudit(
      "t",
      rows(
        40,
        (i) => (i < 36 ? "P" : "F"),
        () => ({ noise: "same" }),
      ),
    );
    expect(v.majorityBaseline).toBeCloseTo(0.9, 6);
    expect(v.passed).toBe(true);
  });

  it("catches two rows a solver cannot tell apart carrying different labels", () => {
    const v = identifiabilityCheck("t", [
      { id: "a", visible: { k: "1" }, label: "X" },
      { id: "b", visible: { k: "1" }, label: "Y" },
    ]);
    expect(v.passed).toBe(false);
    expect(v.collisions[0]?.labels).toEqual(["X", "Y"]);
  });

  it("passes when identical visible content carries identical labels", () => {
    const v = identifiabilityCheck("t", [
      { id: "a", visible: { k: "1" }, label: "X" },
      { id: "b", visible: { k: "1" }, label: "X" },
      { id: "c", visible: { k: "2" }, label: "Y" },
    ]);
    expect(v.passed).toBe(true);
  });
});

describe("the calibration table and the p^N collapse", () => {
  it("only the two hard rows are worth building", () => {
    expect(
      classify({ id: "x", whyAgentsMightFail: "its own tests pass over a broken engine" }).worthBuilding,
    ).toBe(true);
    expect(
      classify({ id: "y", whyAgentsMightFail: "it can read the ledger in the container" }).worthBuilding,
    ).toBe(false);
  });

  it("defaults to the easiest row, which is the direction estimates have been wrong in", () => {
    expect(classify({ id: "z" }).shape).toBe("evidence-channel-present");
  });

  it("p^N punishes claimed axes: three discoveries at p=0.5 is not 0.5", () => {
    const one = passRateBand("choose-against-confirmed-green", 1);
    const three = passRateBand("choose-against-confirmed-green", 3);
    expect(one.high).toBeCloseTo(0.55, 6);
    expect(three.high).toBeCloseTo(0.55 ** 3, 6);
    expect(three.high).toBeLessThan(0.17);
  });
});

// ---------------------------------------------------------------------------------------------
// LANE C -- the calibration ladder. The pass band, demonstrated.
// ---------------------------------------------------------------------------------------------

describe("Lane C -- the screen has a pass band", () => {
  // Rung 5 of the calibration table: "requires choosing against a confirmed green measurement",
  // p 0.35-0.55, the only region worth building in.
  //
  // The construction has to satisfy two requirements that pull against each other, which is exactly
  // the vise made concrete:
  //   - identifiability demands the label BE a function of the visible fields;
  //   - the leak audit demands it not be a SHALLOW one.
  // Parity over three visible bits is the minimal object with both properties. It is fully
  // determined, and no depth-2 tree beats the base rate on it, because every single split and every
  // pair of splits leaves the two labels balanced.
  //
  // The padding column has to be INDEPENDENT of the parity bits and the first version of this
  // fixture got that wrong: with 64 rows, `pad = i % 5` and `abc = i % 8` share no period, so the
  // joint distribution came out uneven and a depth-2 tree read parity through the padding at 62.5%.
  // That was a defect in the calibration artifact, not in the screen, and the fix is to build the
  // artifact correctly rather than to lower the threshold until it passes.
  const parityRows: CorpusRow[] = Array.from({ length: 64 }, (_, i) => {
    const a = (i >> 0) & 1;
    const b = (i >> 1) & 1;
    const c = (i >> 2) & 1;
    const pad = Math.floor(i / 8) % 4; // independent of a, b, c by construction
    return {
      id: `p${i}`,
      visible: { a: String(a), b: String(b), c: String(c), pad: String(pad) },
      label: (a ^ b ^ c) === 1 ? "REVOKE" : "HOLD",
    };
  });

  it("rung 5 survives the leak audit: determined, but not in two questions", () => {
    const v = leakAudit("rung5", parityRows);
    expect(v.passed).toBe(true);
    // The tree gets no purchase at all: it cannot beat the base rate.
    expect(v.classifierAccuracy).toBeLessThanOrEqual(v.majorityBaseline + 1e-9);
  });

  it("rung 5 survives the identifiability check: the label IS determined by shipped facts", () => {
    expect(identifiabilityCheck("rung5", parityRows).passed).toBe(true);
  });

  it("rung 5 survives the activation audit", () => {
    // Two checks that each separate, two knobs that each move the outcome against a fixed
    // background: the minimal live mechanism.
    const m = mkMatrix(
      [
        { id: "i1", schedule: "a", keys: 1 },
        { id: "i2", schedule: "a", keys: 2 },
        { id: "i3", schedule: "b", keys: 1 },
        { id: "i4", schedule: "b", keys: 2 },
      ],
      ["eager", "cautious"],
      (i, s) => {
        // The eager subject resolves doubt it should have held; the cautious one strands work.
        if (s === "eager" && (i === "i2" || i === "i4")) return ["invented_transition"];
        if (s === "cautious" && (i === "i1" || i === "i2")) return ["stranded_action"];
        return [];
      },
      ["invented_transition", "stranded_action"],
    );
    const v = activationAudit(m);
    expect(v.passed).toBe(true);
    expect(v.dead).toHaveLength(0);
  });

  it("rung 1 is caught: a label stated outright in a visible field", () => {
    const rung1: CorpusRow[] = Array.from({ length: 40 }, (_, i) => ({
      id: `e${i}`,
      visible: { answer: i % 2 === 0 ? "REVOKE" : "HOLD", noise: String(i % 3) },
      label: i % 2 === 0 ? "REVOKE" : "HOLD",
    }));
    expect(leakAudit("rung1", rung1).passed).toBe(false);
  });

  it("rung 3 is caught: a structure that never fires", () => {
    const m = mkMatrix(
      [
        { id: "i1", schedule: "a", keys: 1 },
        { id: "i2", schedule: "b", keys: 1 },
      ],
      ["s1", "s2"],
      (i, s) => (i === "i1" && s === "s1" ? ["live"] : []),
      ["live", "the_mechanism"],
    );
    expect(activationAudit(m).passed).toBe(false);
  });

  it("rung 4 is caught: a label the shipped facts do not determine", () => {
    const rung4: CorpusRow[] = [
      { id: "w1", visible: { a: "1", b: "1" }, label: "REVOKE" },
      { id: "w2", visible: { a: "1", b: "1" }, label: "HOLD" },
      { id: "w3", visible: { a: "0", b: "1" }, label: "HOLD" },
    ];
    expect(identifiabilityCheck("rung4", rung4).passed).toBe(false);
  });

  it("the ladder crosses between rung 4 and rung 5, and only rung 5 passes", () => {
    // The summary assertion, and the one the phase report cites. Anything that makes this pass by
    // weakening a threshold has manufactured the result the phase was registered to test.
    const leak = leakAudit("rung5", parityRows);
    const ident = identifiabilityCheck("rung5", parityRows);
    expect(leak.passed && ident.passed).toBe(true);
    expect(cheapClassifierAccuracy(parityRows, ["a", "b", "c", "pad"])).toBeLessThanOrEqual(0.5 + 1e-9);
  });
});
