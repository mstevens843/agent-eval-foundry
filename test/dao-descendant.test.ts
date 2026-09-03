import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkChallengePackage } from "../src/challenge/package-check.js";
import { runFamily } from "../src/families/dao-descendant/runner.js";
import {
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../src/families/dao-descendant/scenarios.js";
import { verify } from "../src/families/dao-descendant/verify.js";
import { builtFamily, scenarioSetIdFor } from "../src/families/registry.js";
import { parseHardnessOperatorLedger } from "../src/foundry/hardness-ledger.js";
import { RigInputError } from "../src/screens/rig-integrity.js";
import { routeFor } from "../src/trials/router.js";
import { challengeHash } from "../src/trials/run.js";

const ROOT = new URL("..", import.meta.url).pathname;

describe("dao recompute descendant", () => {
  it("keeps the Phase 9 activation stratum and adds explicit non-activation controls", () => {
    const space = enumerateSpace();
    const selected = selectMeasuredSet(space);
    const activated = selected.filter(
      (scenario) => scenario.crashPosition === "after_tool" && scenario.nWorkers > 1,
    );
    expect(space).toHaveLength(72);
    expect(selected).toHaveLength(24);
    expect(activated).toHaveLength(18);
    expect(selected).toEqual(selectMeasuredSet(enumerateSpace()));
  });

  it("isolates recomputation while the mutant's own confirmation stays green", () => {
    const run = runFamily();
    const targetIds = new Set(
      run.scenarios
        .filter((scenario) => scenario.params.crashPosition === "after_tool" && scenario.params.nWorkers > 1)
        .map((scenario) => scenario.id),
    );
    const reference = run.cells.filter((cell) => cell.subjectId === "reference");
    const mutant = run.cells.filter((cell) => cell.subjectId === "recompute-current-epoch");
    const target = mutant.filter((cell) => targetIds.has(cell.scenarioId));
    const controls = mutant.filter((cell) => !targetIds.has(cell.scenarioId));

    expect(reference.every((cell) => cell.failures.length === 0)).toBe(true);
    expect(target).toHaveLength(18);
    expect(target.every((cell) => cell.failures.some((f) => f.check === "exactly_once"))).toBe(true);
    expect(target.every((cell) => cell.localConfirmationsGreen)).toBe(true);
    expect(controls).toHaveLength(6);
    expect(controls.every((cell) => cell.failures.length === 0)).toBe(true);
    expect(run.rigUsable).toBe(true);
    expect(run.malformedInputRefused).toBe(true);
  });

  it("refuses empty evidence instead of grading it as a subject failure", () => {
    expect(() => verify({})).toThrow(RigInputError);
    const output = execFileSync(
      "node",
      [join(ROOT, "scripts", "dao-descendant-host.mjs"), join(ROOT, "missing-subject.mjs")],
      { input: "{}", encoding: "utf8" },
    );
    expect(JSON.parse(output).error).toMatch(/wrong-shaped/);
  });

  it("builds one deterministic, leak-checked public package", () => {
    const family = builtFamily("dao-descendant");
    const sweep = family.run();
    const setId = scenarioSetIdFor(family, sweep.matrix);
    const types = readFileSync(join(ROOT, family.typesPath), "utf8");
    const first = family.challenge(types, setId);
    const second = family.challenge(types, setId);
    const checked = checkChallengePackage(first.files, family.leakProfile);

    expect(challengeHash(first)).toBe(challengeHash(second));
    expect(checked.examples).toBe(3);
    expect(first.files.map((file) => file.path)).not.toEqual(
      expect.arrayContaining(["verify.ts", "truth.ts", "mutants.ts"]),
    );
    expect(first.files.find((file) => file.path === "SPEC.md")?.content).toContain(
      "There are no acknowledgement or revocation states",
    );
  });

  it("grades a clean implementation through the real subprocess host", () => {
    const dir = mkdtempSync(join(tmpdir(), "dao-descendant-reference-"));
    const modulePath = join(dir, "subject.mjs");
    writeFileSync(
      modulePath,
      `export const subject = {
  id: "host-reference",
  label: "host reference",
  run(view, tool) {
    const idempotencyKey = view.intent.idempotencyKey;
    const receipt = tool.execute(view.intent.actionId, { idempotencyKey, payload: view.intent.payload });
    return { actionId: view.intent.actionId, workerId: view.workerId, leaseEpoch: view.leaseEpoch,
      idempotencyKey, outcome: "executed", toolOk: receipt.ok };
  },
};\n`,
      "utf8",
    );
    const result = routeFor("dao-descendant").grade(modulePath);
    expect(result.hostErrors).toBe(0);
    expect(result.cells).toHaveLength(24);
    expect(result.cells.every((cell) => cell.failed.length === 0)).toBe(true);
  });

  it("validates the measured operator ledger and refuses a row with no provenance", () => {
    const raw = JSON.parse(readFileSync(join(ROOT, "data", "hardness-operators.json"), "utf8"));
    const ledger = parseHardnessOperatorLedger(raw);
    expect(ledger.operators).toHaveLength(8);
    expect(new Set(ledger.operators.map((row) => row.category))).toEqual(
      new Set(["validity-control", "difficulty", "scenario-selection"]),
    );
    const broken = structuredClone(raw);
    broken.operators[0].provenance = [];
    expect(() => parseHardnessOperatorLedger(broken)).toThrow(/provenance/);
  });
});
