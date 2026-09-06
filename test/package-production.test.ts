import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { enumerateSpace } from "../src/families/delegated-wallet-scope-reconciliation/scenarios.js";
import {
  buildScenarioFromParts,
  expectedForParams,
} from "../src/families/delegated-wallet-scope-reconciliation/truth.js";
import { BUILT_FAMILY_IDS } from "../src/families/registry.js";
import { hash32, sampleSpace } from "../src/foundry/sample.js";
import {
  type AssemblyPlan,
  assemblePackage,
  copySnapshot,
  inspectAssembly,
  materializeAssembly,
  verifyAssembly,
} from "../src/packages/assembly.js";
import { assertAssuranceCoverage, assuranceVerdictDigest, runAssurance } from "../src/packages/assurance.js";
import { localProcess } from "../src/packages/local-process.js";
import { nativeAssuranceRequirements, readNativeReceipt } from "../src/packages/native-caa.js";
import { COMPONENTS, type Component, type PackageInput, sha256 } from "../src/packages/record.js";
import { jaccardGroups, representativeJaccardGroups } from "../src/similarity.js";
import { routeFor } from "../src/trials/router.js";

const owned: string[] = [];
const temporary = () => {
  const p = mkdtempSync(join(tmpdir(), "foundry-production-test-"));
  owned.push(p);
  return p;
};
afterAll(() => {
  for (const p of owned) rmSync(p, { recursive: true, force: true });
});

function fixture() {
  const files = Object.fromEntries(COMPONENTS.map((c) => [c, []])) as unknown as Record<
    Component,
    PackageInput["files"][Component][number][]
  >;
  const rows: [Component, string, string, boolean][] = [
    [
      "contract",
      "instruction.md",
      "Compute the sum of the integers in input.json and write the number to output.json.\n",
      false,
    ],
    ["workspace", "input.json", "[2,3,5]\n", false],
    [
      "reference",
      "oracle.mjs",
      "import{writeFileSync}from'node:fs';writeFileSync('output.json','10');\n",
      true,
    ],
    [
      "verifier",
      "verify.mjs",
      "import{readFileSync}from'node:fs';if(JSON.parse(readFileSync('output.json','utf8'))!==10)process.exit(1);\n",
      true,
    ],
    ["scenarios", "cases.json", "[2,3,5]\n", false],
    ["controls", "nop.mjs", "// deliberately does no work\n", true],
    ["policy", "policy.json", '{"rule":"sum"}', false],
  ];
  for (const [c, path, text, executable] of rows)
    files[c].push({ path, bytes: Buffer.from(text), executable });
  const input: PackageInput = {
    id: "integer-sum-fixture",
    version: "1",
    familyId: "numeric",
    kind: "calibration-kernel",
    files,
    dependencies: {
      strategy: "explicit-fixture",
      unresolved: ["Test-only Node runtime, not a professional qualification."],
    },
  };
  const plan: AssemblyPlan = {
    schemaVersion: 1,
    target: "numeric-fixture",
    entries: rows.map(([component, path]) => ({
      path,
      source: path,
      component,
      audience: ["contract", "workspace"].includes(component) ? "subject" : "recipient-only",
    })),
    required: [
      { path: "instruction.md" },
      { path: "oracle.mjs", executable: true },
      { path: "verify.mjs", executable: true },
    ],
  };
  return { input, plan };
}

describe("reusable package production", () => {
  it("assembles, executes assurance and exports a non CAA fixture without domain fields", async () => {
    const root = temporary();
    const { input, plan } = fixture();
    const snapshot = assemblePackage(join(root, "store"), input, plan);
    materializeAssembly(snapshot, join(root, "task"));
    materializeAssembly(snapshot, join(root, "public"), "subject");
    expect(inspectAssembly(snapshot).target).toBe("numeric-fixture");
    const result = await runAssurance(snapshot, [
      {
        id: "oracle",
        route: "numeric-cli",
        evidenceClass: "local-execution",
        artifactDigest: snapshot.record.components.reference.digest,
        run: async () => {
          await localProcess(process.execPath, ["oracle.mjs"], { cwd: join(root, "task") });
          await localProcess(process.execPath, ["verify.mjs"], { cwd: join(root, "task") });
          return { passed: true, detail: { expected: 10 } };
        },
      },
    ]);
    expect(result[0]?.status).toBe("pass");
    expect(result[0]?.packageDigest).toBe(snapshot.record.digest);
    const copied = copySnapshot(snapshot, join(root, "recipient-store"));
    expect(copied.record.digest).toBe(snapshot.record.digest);
    materializeAssembly(copied, join(root, "recipient"));
    verifyAssembly(copied, join(root, "recipient"));
    expect(assuranceVerdictDigest(result)).toBe(
      assuranceVerdictDigest(result.map((r) => ({ ...r, milliseconds: 999 }))),
    );
  });
  it("rejects private exposure, placeholders, missing executable and stale files", () => {
    const { input, plan } = fixture();
    expect(() =>
      assemblePackage(join(temporary(), "store"), input, {
        ...plan,
        entries: plan.entries.map((e) => ({ ...e, audience: "subject" })),
      }),
    ).toThrow(/VISIBILITY/);
    expect(() =>
      assemblePackage(join(temporary(), "store"), input, {
        ...plan,
        required: [{ path: "input.json", executable: true }],
      }),
    ).toThrow(/EXECUTABLE/);
    const broken = {
      ...input,
      files: {
        ...input.files,
        verifier: [{ path: "verify.mjs", bytes: Buffer.from("PLACEHOLDER REFERENCE"), executable: true }],
      },
    };
    expect(() => assemblePackage(join(temporary(), "store"), broken, plan)).toThrow(/PLACEHOLDER/);
    const root = temporary();
    const snapshot = assemblePackage(join(root, "store"), input, plan);
    materializeAssembly(snapshot, join(root, "task"));
    expect(() => materializeAssembly(snapshot, join(root, "task"))).toThrow(/EXISTS/);
    writeFileSync(join(root, "task/input.json"), "[99]");
    expect(() => verifyAssembly(snapshot, join(root, "task"))).toThrow(/BYTES/);
  });
  it("records execution errors instead of converting them into passed assurance", async () => {
    const { input, plan } = fixture();
    const snapshot = assemblePackage(join(temporary(), "store"), input, plan);
    const result = await runAssurance(snapshot, [
      {
        id: "broken",
        route: "numeric-cli",
        evidenceClass: "local-execution",
        artifactDigest: snapshot.record.digest,
        run: async () => {
          throw new Error("collector down");
        },
      },
    ]);
    expect(result[0]?.status).toBe("error");
    const required = [
      {
        id: "broken",
        route: "numeric-cli",
        evidenceClass: "local-execution" as const,
        artifactDigest: snapshot.record.digest,
      },
    ];
    expect(() => assertAssuranceCoverage(snapshot, [], required)).toThrow(/INCOMPLETE/);
    expect(() => assertAssuranceCoverage(snapshot, result, required)).toThrow(/BINDING/);
  });
  it("bounds noisy or hung trusted local tooling", async () => {
    await expect(
      localProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(100000))"], {
        limitBytes: 1024,
      }),
    ).rejects.toThrow(/output-limit/);
    await expect(
      localProcess(process.execPath, ["-e", "setInterval(()=>{},1000)"], { timeoutMs: 80 }),
    ).rejects.toThrow(/timeout/);
    const log = join(temporary(), "flushed.log");
    await localProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(100000))"], { log });
    expect(readFileSync(log, "utf8")).toHaveLength(100000);
    await expect(localProcess(process.execPath, ["-e", ""], { limitBytes: 0 })).rejects.toThrow(
      /INVALID_LIMIT/,
    );
  });
  it("binds local native receipts to exact controls and evidence, never a green flag alone", () => {
    const { input, plan } = fixture();
    const snapshot = assemblePackage(join(temporary(), "store"), input, plan);
    const dir = temporary();
    const receiptPath = join(dir, "assurance.json");
    const results = nativeAssuranceRequirements(snapshot).map((r) => ({
      ...r,
      packageDigest: snapshot.record.digest,
      status: "pass" as const,
      milliseconds: 1,
      detail: "synthetic receipt-schema fixture, not native execution",
    }));
    const log = Buffer.from("synthetic control evidence\n");
    writeFileSync(join(dir, "control.log"), log);
    const receipt = {
      schemaVersion: 1,
      packageDigest: snapshot.record.digest,
      allLocalControlsPassed: true,
      results,
      semanticVerdictDigest: assuranceVerdictDigest(results),
      evidenceFiles: [{ path: "control.log", sha256: sha256(log), size: log.length }],
    };
    const save = (value: unknown) => writeFileSync(receiptPath, JSON.stringify(value));
    save(receipt);
    expect(readNativeReceipt(snapshot, receiptPath).results).toHaveLength(results.length);
    save({ ...receipt, results: [] });
    expect(() => readNativeReceipt(snapshot, receiptPath)).toThrow(/MATCHING_LOCAL_RECEIPT/);
    const changed = results.map((r, i) => (i === 0 ? { ...r, artifactDigest: "0".repeat(64) } : r));
    save({ ...receipt, results: changed, semanticVerdictDigest: assuranceVerdictDigest(changed) });
    expect(() => readNativeReceipt(snapshot, receiptPath)).toThrow(/BINDING/);
    save(receipt);
    writeFileSync(join(dir, "control.log"), "changed bytes");
    expect(() => readNativeReceipt(snapshot, receiptPath)).toThrow(/EVIDENCE_BYTES/);
  });
});

describe("selection compatibility and explicit clustering semantics", () => {
  it("preserves every existing family parameter membership and order", () => {
    const baseline = JSON.parse(readFileSync("data/package-production-generation-baseline.json", "utf8"));
    for (const id of BUILT_FAMILY_IDS) {
      const points = [...routeFor(id).scenarioParams()];
      expect({ count: points.length, sha256: sha256(JSON.stringify(points)) }, id).toEqual(
        baseline.families[id],
      );
    }
  }, 30000);
  it("uses exactly the same wallet decision semantics on all 82944 points", () => {
    const points = enumerateSpace();
    expect(points).toHaveLength(82944);
    for (const p of points) expect(expectedForParams(p)).toEqual(buildScenarioFromParts(p).expected);
  }, 30000);
  it("rejects ambiguous sampler identities and invalid fractions", () => {
    for (const fraction of [0, -0.1, 1.01, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => sampleSpace([], { keyOf: String, fraction })).toThrow(/fraction/);
    expect(() => sampleSpace(["a", "a"], { keyOf: String, fraction: 0.5 })).toThrow(/unique/);
    expect(() => sampleSpace([""], { keyOf: String, fraction: 0.5 })).toThrow(/nonempty/);
    expect(sampleSpace([], { keyOf: String, fraction: 0.1 })).toEqual([]);
    let calls = 0;
    expect(
      sampleSpace(["c", "a", "b"], {
        keyOf: (x) => {
          calls++;
          return x;
        },
        groupOf: (x) => x,
        fraction: 0.01,
      }),
    ).toEqual(["a", "b", "c"]);
    expect(calls).toBe(3);
  });
  it("keeps the historical locale tie break for hash collisions", () => {
    expect(hash32("costarring")).toBe(hash32("liquid"));
    expect(sampleSpace(["liquid", "costarring"], { keyOf: String, fraction: 0.5 })).toEqual(["costarring"]);
  });
  it("documents and preserves representative clustering without claiming pairwise similarity", () => {
    const sets = [["a", "b"], ["a"], ["b"]];
    expect(representativeJaccardGroups(sets, 0.5)).toEqual([[0, 1, 2]]);
    expect(jaccardGroups(sets, 0.5)).toEqual([[0, 1, 2]]);
    expect(() => jaccardGroups(sets, Number.NaN)).toThrow();
  });
});
