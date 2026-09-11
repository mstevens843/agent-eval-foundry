import { describe, expect, it } from "vitest";
import { integrationExports } from "../scripts/integration-exports.mjs";

const native = { id: "caa-revalidation-repair", export: "/exports/native" };
const browser = { id: "browser-replay-repair", export: "/exports/browser" };
const build = { id: "incremental-build-repair", export: "/exports/build" };
const calendar = { id: "recurring-calendar-repair", export: "/exports/calendar" };

describe("integration export arguments", () => {
  it("selects the native and browser probes by ID while retaining every portfolio export", () => {
    for (const packages of [
      [native, build, calendar, browser],
      [build, browser, native, calendar],
    ]) {
      const before = structuredClone(packages);
      const exports = integrationExports(packages);
      expect(exports).toEqual([native.export, browser.export, build.export, calendar.export]);
      expect(exports.slice(1)).toHaveLength(packages.length - 1);
      expect(packages).toEqual(before);
    }
  });

  it("fails before execution when a required export is absent or ambiguous", () => {
    expect(() => integrationExports([native, build])).toThrow("missing integration package: browser");
    expect(() => integrationExports([browser, build])).toThrow("missing integration package: caa");
    expect(() => integrationExports([native, browser, { ...browser, export: "/other" }])).toThrow(
      "duplicate integration package ID",
    );
  });
});
