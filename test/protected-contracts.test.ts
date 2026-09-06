import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { BUILT_FAMILIES } from "../src/families/registry.js";
import { App as ParentApp } from "../src/families/ui-action-record-replay/app.js";
import {
  reference as parentReference,
  resetCompletionRecords as resetParent,
} from "../src/families/ui-action-record-replay/reference.js";
import {
  enumerateSpace,
  generateScenarios as parentScenarios,
} from "../src/families/ui-action-record-replay/scenarios.js";
import { verify as verifyParent } from "../src/families/ui-action-record-replay/verify.js";
import { BASELINE_ARM, TREATED_ARM } from "../src/phase-23/diagnosis-radius.js";
import { assertCurrentAuthorityBundle, authoritySourceDigest } from "../src/trials/authority-build.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { assertMigrationDeclared } from "../src/trials/migration.js";
import { challengeHash, hashChallengeDir } from "../src/trials/run.js";
import { stageSubmissionArtifact } from "../src/trials/secure-runner.js";

const scratch = mkdtempSync(join(tmpdir(), "foundry-protected-contracts-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
it("declares every retained public-contract migration without rewriting historical trials", () => {
  for (const family of BUILT_FAMILIES) {
    const current = challengeHash(family.challenge(readFileSync(family.typesPath, "utf8"), "private"));
    for (const trial of readFamilyTrials("trials", family.id)) {
      const previous = hashChallengeDir(join(trial.path, "challenge"));
      if (previous) expect(() => assertMigrationDeclared(family.id, previous, current)).not.toThrow();
    }
  }
});
it("preserves Phase 23's original no-dispute subspace when importing the public library", () => {
  for (const arm of [BASELINE_ARM, TREATED_ARM]) {
    expect(arm.params.length).toBe(96);
    expect(arm.params.every((p) => p.lateDispute === "none")).toBe(true);
  }
});
describe("artifact capture is bounded, regular and immutable", () => {
  it("rejects a stale or missing collector build identity", () => {
    const digest = authoritySourceDigest(process.cwd());
    expect(() =>
      assertCurrentAuthorityBundle(
        process.cwd(),
        `var AUTHORITY_SOURCE_DIGEST = false ? "unbuilt" : "${digest}";`,
      ),
    ).not.toThrow();
    expect(() =>
      assertCurrentAuthorityBundle(process.cwd(), `var AUTHORITY_SOURCE_DIGEST = "${digest}";`),
    ).not.toThrow();
    expect(() =>
      assertCurrentAuthorityBundle(process.cwd(), `var AUTHORITY_SOURCE_DIGEST = "${"0".repeat(64)}";`),
    ).toThrow(/AUTHORITY_BUILD_STALE/);
    expect(() => assertCurrentAuthorityBundle(process.cwd(), "unbound bundle")).toThrow(
      /AUTHORITY_BUILD_STALE/,
    );
  });
  it("copies self-contained module bytes and refuses symlinks, directories and oversized files", () => {
    const source = join(scratch, "source.mjs");
    const target = join(scratch, "captured.mjs");
    writeFileSync(source, "export const subject={};");
    stageSubmissionArtifact(source, target);
    expect(readFileSync(target, "utf8")).toBe(readFileSync(source, "utf8"));
    writeFileSync(source, "changed");
    expect(readFileSync(target, "utf8")).not.toBe("changed");
    const link = join(scratch, "link.mjs");
    symlinkSync(source, link);
    expect(() => stageSubmissionArtifact(link, join(scratch, "bad-link"))).toThrow();
    expect(() => stageSubmissionArtifact(scratch, join(scratch, "bad-directory"))).toThrow();
    const large = join(scratch, "large.mjs");
    writeFileSync(large, Buffer.alloc(8 * 1024 * 1024 + 1));
    expect(() => stageSubmissionArtifact(large, join(scratch, "bad-large"))).toThrow(/8 MiB/);
  });
});
describe("a claim must match the latest preceding observation", () => {
  it("rejects stale claimed values even when an earlier read matched, accepts redundant matching reads", () => {
    const scenario = parentScenarios(enumerateSpace()).find(
      (s) => s.expectedOutcome === "completed" && s.params.replayCount === 1,
    );
    if (!scenario) throw Error("missing witness");
    resetParent();
    const app = new ParentApp(scenario.liveTree, scenario.params.confirmation, scenario.params.asyncSettled);
    app.beginReplay(0);
    const report = parentReference.replay(scenario.trace, app.facade());
    const calls = app.sealedCalls();
    const read = calls.find((c) => c.method === "attr");
    if (!read) throw Error("missing observation");
    const extra = { ...read, seq: read.seq + 0.1 };
    const input = {
      scenario,
      reports: [report],
      effects: app.sealedEffects(),
      calls: [...calls, extra].sort((a, b) => a.seq - b.seq),
    };
    expect(verifyParent(input)).toEqual([]);
    expect(
      verifyParent({
        ...input,
        calls: input.calls.map((c) => (c === extra ? { ...c, observedValue: "contradictory" } : c)),
      }).some((f) => f.check === "precondition_observed"),
    ).toBe(true);
  });
});
