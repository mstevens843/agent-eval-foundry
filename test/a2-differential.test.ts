// The A2 spec-repair differential, pinned.
//
// Two arms of `durable-approval-outbox` differing by ONE SENTENCE of agent-visible specification:
//
//     `ACKED` and `REVOKED` are terminal: neither has an outgoing transition.
//
// Twelve paid runs, six per arm, three per lab per arm. This file exists so the numbers quoted in
// `reports/PHASE-4-SETTLED.md` and `FINDING.md` cannot drift from the evidence that produced them —
// Phase 3 reported figures from a control set that then evaporated with a machine restart, and one of
// them was wrong. A number in a report with nothing pinning it is a claim.
//
// The assertion that carries the result is NOT the reward. On reward the experiment is inconclusive
// and always would have been at this budget: 2 of 6 versus 3 of 6, Fisher p = 1.000, and identical
// 0.67 pass rates inside the one lab where both arms finished. It is the CHECK that fires:
// `audit_explains` fires 33 times across four of six control subjects and zero times across the whole
// treatment bank. That is the decomposition, and it is what these tests hold still.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Run {
  readonly run: string;
  readonly arm: "control" | "treatment";
  readonly lab: string;
  readonly reward: number | null;
  readonly cost: number | null;
}
interface ArmMatrix {
  readonly subjects: readonly string[];
  readonly instances: number;
  readonly checksDeclared: readonly string[];
  readonly results: Record<string, Record<string, { failed: string[] } | null>>;
}

const DATA = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "a2-spec-repair-differential.json"), "utf8"),
) as {
  runs: readonly Run[];
  excluded: readonly { run: string; state: string }[];
  perArmMatrix: Record<"control" | "treatment", ArmMatrix>;
};

const arm = (which: "control" | "treatment") => DATA.runs.filter((r) => r.arm === which);

/** Every (instance, subject) cell in which `check` failed. */
function cellsFiring(which: "control" | "treatment", check: string): number {
  const m = DATA.perArmMatrix[which];
  let n = 0;
  for (const row of Object.values(m.results)) {
    for (const cell of Object.values(row)) {
      if (cell?.failed.includes(check)) n += 1;
    }
  }
  return n;
}

function subjectsFiring(which: "control" | "treatment", check: string): number {
  const m = DATA.perArmMatrix[which];
  const hit = new Set<string>();
  for (const row of Object.values(m.results)) {
    for (const [subject, cell] of Object.entries(row)) {
      if (cell?.failed.includes(check)) hit.add(subject);
    }
  }
  return hit.size;
}

const checksThatFired = (which: "control" | "treatment"): string[] => {
  const m = DATA.perArmMatrix[which];
  const fired = new Set<string>();
  for (const row of Object.values(m.results)) {
    for (const cell of Object.values(row)) {
      if (cell !== null) for (const c of cell.failed) fired.add(c);
    }
  }
  return [...fired].sort();
};

describe("the experiment ran as designed", () => {
  it("six valid runs per arm, three per lab per arm", () => {
    expect(arm("control").length).toBe(6);
    expect(arm("treatment").length).toBe(6);
    for (const which of ["control", "treatment"] as const) {
      for (const lab of ["anthropic", "openai"]) {
        expect(arm(which).filter((r) => r.lab === lab).length, `${which}/${lab}`).toBe(3);
      }
    }
  });

  it("three runs are excluded, each with a marker file naming the reason", () => {
    // Two killed by a machine shutdown mid-flight, one by a network failure. Preserved, annotated,
    // and in no denominator. A vanished run silently changes a rate; a marked one cannot.
    expect(DATA.excluded.map((e) => `${e.run}:${e.state}`).sort()).toEqual([
      "a2-control-opus-1:crashed",
      "a2-control-opus-2:infra",
      "a2-treatment-opus-1:crashed",
    ]);
    const counted = new Set(DATA.runs.map((r) => r.run));
    for (const e of DATA.excluded) expect(counted.has(e.run), e.run).toBe(false);
  });

  it("every counted run produced a real verdict", () => {
    for (const r of DATA.runs) {
      expect(r.reward, r.run).not.toBeNull();
      expect([0, 1]).toContain(r.reward);
    }
  });
});

describe("on reward the experiment is inconclusive, and that is the point", () => {
  it("control 2 of 6, treatment 3 of 6", () => {
    const passed = (which: "control" | "treatment") => arm(which).filter((r) => r.reward === 1).length;
    expect(passed("control")).toBe(2);
    expect(passed("treatment")).toBe(3);
  });

  it("inside the lab where both arms finished, the pass rates are identical", () => {
    // 2 of 3 each. Any analysis that stopped here would report "no effect" from data that shows a
    // clean decomposition one level down.
    const openai = (which: "control" | "treatment") =>
      arm(which).filter((r) => r.lab === "openai" && r.reward === 1).length;
    expect(openai("control")).toBe(2);
    expect(openai("treatment")).toBe(2);
  });
});

describe("at the check level the arms separate cleanly", () => {
  it("the ACKED defect fires 33 times in control and NEVER in treatment", () => {
    // The result. One sentence, both labs, a complete 144-cell treatment bank, no residue.
    expect(cellsFiring("control", "audit_explains")).toBe(33);
    expect(subjectsFiring("control", "audit_explains")).toBe(4);
    expect(cellsFiring("treatment", "audit_explains")).toBe(0);
    expect(subjectsFiring("treatment", "audit_explains")).toBe(0);
  });

  it("89% of the control arm's failures are the specification defect", () => {
    const total = checksThatFired("control").reduce((n, c) => n + cellsFiring("control", c), 0);
    expect(total).toBe(37);
    expect(Math.round((100 * 33) / total)).toBe(89);
  });

  it("what survives the repair is one mechanism seen from both sides", () => {
    // `executed_iff_called` is resolving an uncertain action wrongly; `completion` is refusing to
    // resolve it at all. Two ways to fail one dual obligation, which is why it is one axis.
    expect(checksThatFired("treatment")).toEqual(["completion", "executed_iff_called"]);
    expect(cellsFiring("treatment", "executed_iff_called")).toBe(4);
    expect(cellsFiring("treatment", "completion")).toBe(1);
  });

  it("the treatment arm's suite goes nearly blind: 21 of 24 instances separate nothing", () => {
    const blind = (which: "control" | "treatment") => {
      const m = DATA.perArmMatrix[which];
      return Object.values(m.results).filter((row) =>
        Object.values(row).every((cell) => cell === null || cell.failed.length === 0),
      ).length;
    };
    expect(blind("control")).toBe(9);
    expect(blind("treatment")).toBe(21);
  });

  it("nine of eleven declared checks never fire in either arm", () => {
    for (const which of ["control", "treatment"] as const) {
      const declared = DATA.perArmMatrix[which].checksDeclared;
      expect(declared.length).toBe(11);
      expect(declared.length - checksThatFired(which).length, which).toBe(9);
    }
  });
});
