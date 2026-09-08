import { createHash } from "node:crypto";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { afterAll, expect, it } from "vitest";
import { portfolioDirection } from "../src/learning/cases.js";
import { PORTFOLIO_PACKAGES } from "../src/packages/portfolio.js";

const ids = [
  "snapshot-recovery-repair",
  "verified-installation-repair",
  "capacity-maintenance-repair",
  "route-policy-repair",
  "rule-index-repair",
] as const;
const scratch = mkdtempSync(join(tmpdir(), "third-author-properties-"));
afterAll(() => rmSync(scratch, { recursive: true }));
async function fixture(id: string) {
  const root = join(scratch, id);
  mkdirSync(root, { recursive: true });
  const authority = join(root, "authority");
  mkdirSync(authority, { recursive: true });
  for (const p of readdirSync(`tasks/${id}/private`).filter((p) => p.endsWith(".mjs")))
    copyFileSync(`tasks/${id}/private/${p}`, join(authority, p));
  copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(authority, "adapter.mjs"));
  const domain = await import(pathToFileURL(join(authority, "domain.mjs")).href);
  const generator = await import(pathToFileURL(join(authority, "scenarios.mjs")).href);
  const variants = {};
  for (const name of ["reference", "alternative"]) {
    const target = join(root, name);
    cpSync(`tasks/${id}/public`, target, { recursive: true });
    cpSync(`tasks/${id}/private/${name}`, target, { recursive: true });
    const module = await import(pathToFileURL(join(target, "entry.mjs")).href);
    Object.assign(variants, { [name]: module.subject });
  }
  return {
    root,
    domain,
    generator,
    variants: variants as Record<string, { run: (view: unknown, api: unknown) => unknown }>,
  };
}
const fixtures = new Map<string, ReturnType<typeof fixture>>();
type Methods = Record<string, (x: unknown) => Promise<unknown>>;
function call(api: Methods, name: string, request: unknown) {
  const method = api[name];
  if (!method) throw Error(`Missing test facade method: ${name}`);
  return method(request);
}
const get = (id: string) => {
  let value = fixtures.get(id);
  if (!value) {
    value = fixture(id);
    fixtures.set(id, value);
  }
  return value;
};
async function run(
  id: string,
  scenario: unknown,
  variant = "reference",
  probe?: (api: Record<string, (x: unknown) => Promise<unknown>>) => Promise<void>,
) {
  const f = await get(id);
  return f.domain.runScenario(
    scenario,
    async (adapter: {
      begin: (n: number) => { view: unknown; facades: { methods: string[] }[] };
      invoke: (m: string, args: unknown[]) => Promise<unknown>;
      report: (x: unknown) => void;
    }) => {
      const frame = adapter.begin(0);
      const facade = frame.facades[0];
      const subject = f.variants[variant];
      if (!facade || !subject) throw Error("Missing trusted author variant or facade");
      const api = Object.fromEntries(
        facade.methods.map((m) => [m, (x: unknown) => adapter.invoke(`api.${m}`, [x])]),
      );
      if (probe) await probe(api);
      adapter.report(await subject.run(frame.view, api));
    },
    f.root,
  );
}
it("retains the third cohort alongside later professional packages and qualified transfer directions", () => {
  expect(Object.keys(PORTFOLIO_PACKAGES).length).toBeGreaterThanOrEqual(14);
  for (const id of ids)
    expect(portfolioDirection(id)?.family).toBe(PORTFOLIO_PACKAGES[id as keyof typeof PORTFOLIO_PACKAGES]);
});
it("provides checker stimulus data without leaking maintenance invariant verdicts", async () => {
  for (const id of ids) {
    const f = await get(id);
    const scenario = f.generator.scenarios()[0];
    const result = await run(id, scenario);
    expect(readFileSync(`tasks/${id}/public/instruction.md`, "utf8")).toContain("CHECKER-INPUT.md");
    expect(readFileSync(`tasks/${id}/public/CHECKER-INPUT.md`, "utf8")).toContain("60 seconds TOTAL");
    if (id === "capacity-maintenance-repair") {
      expect(result.history.length).toBeGreaterThan(0);
      for (const state of result.history) expect(Object.keys(state).sort()).toEqual(["done", "placement"]);
    }
    if (id === "verified-installation-repair") {
      expect(result.initial).toEqual(scenario.initial);
      expect(result.blobs).toEqual(scenario.blobs);
      expect(result.cache).toEqual(scenario.cache);
    }
    if (id === "route-policy-repair") expect(result.routes).toEqual(scenario.routes);
    if (id === "rule-index-repair") expect(result.documents).toEqual(scenario.documents);
  }
});
it("preserves generator hashes through post-selection validation", () => {
  const ledger = JSON.parse(readFileSync("data/third-portfolio-selection-ledger.json", "utf8"));
  for (const g of ledger.generators)
    expect(
      createHash("sha256")
        .update(readFileSync(`tasks/${g.id}/private/scenarios.mjs`))
        .digest("hex"),
    ).toBe(g.generatorSha256);
  expect(ledger.validationControls).toHaveLength(5);
});
for (const id of ids)
  it(`${id} accepts both correct strategies on the complete scenario population`, async () => {
    const f = await get(id);
    for (const scenario of f.generator.scenarios())
      for (const variant of ["reference", "alternative"])
        expect((await run(id, scenario, variant)).failures).toEqual([]);
  });
it("does not invent a mandatory change when requested routing behavior already holds", async () => {
  const f = await get(ids[3]);
  const s = f.generator.scenarios()[0];
  s.request.preference = 100;
  expect((await run(ids[3], s)).failures).toEqual([]);
});
it("allows documented failed-publication recovery rather than grading an unstated prohibition", async () => {
  for (const id of [ids[0], ids[1], ids[3], ids[4]]) {
    const f = await get(id);
    const s = f.generator.scenarios().at(-1);
    const result = await run(id, s, "reference", async (api) => {
      if (id === ids[0]) await call(api, "commit", {});
      if (id === ids[1])
        await call(api, "write", { path: "old-release/x", entry: { kind: "dir", mode: 493 } });
      if (id === ids[3]) await call(api, "publish", { config: {} });
      if (id === ids[4]) await call(api, "publish", { program: { entry: 9, code: [] } });
    });
    expect(result.failures).toEqual([]);
  }
});
it("rejects an unsafe maintenance transition even when the final state is restored", async () => {
  const f = await get(ids[2]);
  const s = f.generator.scenarios()[0];
  const result = await run(ids[2], s, "reference", async (api) => {
    const p = s.placement[0];
    await call(api, "remove", p);
    await call(api, "add", p);
  });
  expect(result.failures).toContain("availability");
});
it("accepts verified cache recovery when origin copies are absent or corrupt", async () => {
  const f = await get(ids[1]);
  for (const scenario of f.generator.scenarios().slice(33))
    for (const variant of ["reference", "alternative"])
      expect((await run(ids[1], scenario, variant)).failures).toEqual([]);
});
it("accepts correct all-negative rule populations without inventing a positive match", async () => {
  for (const rules of [[], [{ id: "literal", pattern: "zzz", tag: "unused", fold: false }]])
    for (const variant of ["reference", "alternative"])
      expect((await run(ids[4], { rules, documents: ["", "abc"] }, variant)).failures).toEqual([]);
});
let seed = 0x21930;
function random(n: number) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
}
function choose<T>(values: readonly T[]): T {
  const value = values[random(values.length)];
  if (value === undefined) throw Error("Empty fuzz dimension");
  return value;
}
it("fuzzes capture semantics against an independent DP and measures actual VM work", async () => {
  const f = await get(ids[4]);
  const compiler = await import(pathToFileURL(join(f.root, "reference/src/compiler.mjs")).href);
  const alphabet = ["a", "A", "b", "*", "?", " "];
  const atoms = ["a", "A", "b", "*", "?", "\\*", "\\?", " "];
  for (let sample = 0; sample < 96; sample++) {
    const rules = Array.from({ length: 1 + random(5) }, (_, i) => ({
      id: `r${i}`,
      tag: `tag${i}`,
      pattern: Array.from({ length: 1 + random(7) }, () => atoms[random(atoms.length)]).join(""),
      fold: !!random(2),
    }));
    const program = compiler.compile(rules);
    const t = rules.reduce((n, r) => n + f.domain.parse(r.pattern).length, 0);
    for (let input = 0; input < 64; input++) {
      const text = Array.from({ length: random(10) }, () => alphabet[random(alphabet.length)]).join("");
      const observed = f.domain.interpret(program, text, 8 * (text.length + 1) * (t + rules.length + 1) + 32);
      expect(observed.withinBudget).toBe(true);
      expect(observed.value).toEqual(f.domain.expected(rules, text));
    }
  }
});
it("fuzzes layer ordering and file-directory replacement against actual filesystem state", async () => {
  const f = await get(ids[1]);
  const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
  for (let sample = 0; sample < 64; sample++) {
    const descriptors = [];
    const blobs: Record<string, string> = {};
    const paths = ["a", "a/x", "a/y", "b", "b/z"];
    for (let layer = 0; layer < 3; layer++) {
      const entries = [];
      const regular = new Set<string>();
      for (let i = 0; i < 6; i++) {
        const path = choose(paths);
        const kind = choose(["file", "dir", "remove", "opaque"]);
        if ((kind === "file" || kind === "dir") && regular.has(path)) continue;
        if (kind === "file" || kind === "dir") regular.add(path);
        entries.push(
          kind === "file"
            ? {
                kind,
                path,
                mode: random(2) ? 420 : 448,
                data: Buffer.from(`value-${sample}-${i}`).toString("base64"),
              }
            : kind === "dir"
              ? { kind, path, mode: 493 }
              : { kind, path },
        );
      }
      const plain = Buffer.from(JSON.stringify({ entries }));
      const raw = gzipSync(plain);
      const d = { url: `fixture/${layer}`, digest: sha(raw), size: raw.length, plainDigest: sha(plain) };
      descriptors.push(d);
      blobs[d.digest] = raw.toString("base64");
    }
    const s = {
      id: `fuzz-${sample}`,
      release: "local",
      descriptors,
      blobs,
      cache: {},
      initial: { previous: { kind: "file", mode: 420, data: "b2xk" } },
    };
    for (const variant of ["reference", "alternative"])
      expect((await run(ids[1], s, variant)).failures).toEqual([]);
  }
});
it("fuzzes transaction order, deletions and retained allocation state in two fresh SQLite restores", async () => {
  const f = await get(ids[0]);
  for (let sample = 0; sample < 64; sample++) {
    const s = structuredClone(f.generator.scenarios().at(-1));
    s.cutoff = 10 + random(10);
    s.logs = [];
    for (let lsn = 1; lsn <= 20; lsn++) {
      const id = 1 + random(6);
      const op = random(3) ? "put" : "delete";
      s.logs.push({
        tenant: s.tenant,
        branch: s.branch,
        lsn,
        at: lsn,
        changes: [
          { table: "entries", op, row: op === "put" ? { id, account: 1, amount: random(17) - 8 } : { id } },
        ],
        nextId: lsn + 50,
      });
    }
    for (let i = s.logs.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [s.logs[i], s.logs[j]] = [s.logs[j], s.logs[i]];
    }
    for (const variant of ["reference", "alternative"])
      expect((await run(ids[0], s, variant)).failures).toEqual([]);
  }
});
