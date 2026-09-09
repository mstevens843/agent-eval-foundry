import { describe, expect, it } from "vitest";
import {
  completeVerdicts,
  namesCheck,
  namesObservedFailure,
  positiveVariantKeys,
} from "../src/packages/checker-contract.js";

describe("screening checker contracts", () => {
  it("requires a Boolean verdict for every token, independently of optional diagnostics", () => {
    const tokens = ["good", "bad"];
    expect(completeVerdicts({ verdicts: { good: { ok: true }, bad: { ok: false } } }, tokens)).toBe(true);
    expect(
      completeVerdicts(
        { verdicts: { good: { ok: true }, bad: { ok: false, reasons: ["free explanation"] } } },
        tokens,
      ),
    ).toBe(true);
    for (const bad of [
      { good: { ok: true } },
      { good: { ok: true }, bad: {} },
      { good: { ok: true }, bad: { ok: 0 } },
      { good: { ok: true }, bad: { ok: false }, extra: { ok: false } },
      { good: { ok: true }, bad: { ok: false, reasons: [3] } },
    ])
      expect(completeVerdicts({ verdicts: bad }, tokens)).toBe(false);
  });
  it("accepts another genuinely violated obligation instead of a private primary label", () => {
    expect(
      namesObservedFailure(["terminal_history: wrong decision"], ["completion", "terminal_history"]),
    ).toBe(true);
    expect(
      namesObservedFailure(
        ["population", "provenance"],
        ["completion", "population", "attribution", "exact_amounts", "provenance"],
      ),
    ).toBe(true);
    expect(
      namesObservedFailure(["exact_amounts", "provenance"], ["attribution", "exact_amounts", "provenance"]),
    ).toBe(true);
    expect(namesObservedFailure(["unrelated", "completion_extra"], ["completion"])).toBe(false);
    expect(namesObservedFailure(["completion"], [])).toBe(false);
    expect(namesObservedFailure(null, ["completion"])).toBe(false);
  });
  it.each([
    [["completion"], true],
    [["completion: missing publication"], true],
    [["completion_extended"], false],
    [["not completion"], false],
    [["completion-extra: bad"], false],
    [null, false],
    ["completion", false],
    [[null, 3, {}], false],
  ])(
    "handles reasons %j without interpreting malformed data as infrastructure failure",
    (reasons, expected) => {
      expect(namesCheck(reasons, "completion")).toBe(expected);
    },
  );
  it("discovers distinct positive candidates without confusing them with controls", () => {
    expect(
      positiveVariantKeys([
        "private/variants/z-last/entry.mjs",
        "private/variants/a-first/entry.mjs",
        "private/variants/a-first/helper.mjs",
        "private/controls/bad.mjs",
        "private/variants/../entry.mjs",
        "private/variants/empty/",
      ]),
    ).toEqual(["a-first", "z-last"]);
  });
});
