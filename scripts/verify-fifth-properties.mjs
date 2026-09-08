// Trusted author property checks only. Not protected-route or model evidence.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
const output = resolve(process.argv[2]);
mkdirSync(output, { recursive: false });
const ids = [
  "incremental-build-repair",
  "event-window-repair",
  "staged-allocation-repair",
  "diagnostic-transport-repair",
  "issued-report-repair",
];
const fixtures = {},
  results = [];
let executions = 0;
const wire = { maxPayloadBytes: 0, maxApiCalls: 0 };
function measure(value) {
  const bytes = Buffer.byteLength(JSON.stringify(value));
  wire.maxPayloadBytes = Math.max(wire.maxPayloadBytes, bytes);
  assert(bytes <= 48 * 1024, "published compact-payload guarantee");
}
// staged-allocation-repair's runScenario() no longer returns a precomputed `expected` field --
// `winningPolicyExists` was a real answer-key leak (the same winning() oracle used to grade
// future_promise, exposed under a different key) and was removed once checker-required grading
// meant a submitted checker could otherwise just read the verdict instead of deriving it. Recover
// the same fact honestly by calling domain.mjs's own exported winning() oracle directly, exactly
// the way runScenario() itself does, rather than reading it off a leaked field.
function winningPolicyExists(domain, s) {
  const remaining = Object.fromEntries(s.view.resources.map((r) => [r.id, r.capacity - r.used]));
  return domain.winning(s.view.tree, s.view.resources, remaining);
}
for (const id of ids) {
  const root = join(output, id),
    authority = join(root, "authority");
  mkdirSync(authority, { recursive: true });
  for (const p of readdirSync("tasks/" + id + "/private").filter((p) => p.endsWith(".mjs")))
    copyFileSync("tasks/" + id + "/private/" + p, join(authority, p));
  copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(authority, "adapter.mjs"));
  const domain = await import(pathToFileURL(join(authority, "domain.mjs"))),
    generator = await import(pathToFileURL(join(authority, "scenarios.mjs")));
  const variants = {};
  for (const name of ["starter", "reference", "alternative"]) {
    const destination = join(root, name);
    cpSync("tasks/" + id + "/public", destination, { recursive: true });
    if (name !== "starter") cpSync("tasks/" + id + "/private/" + name, destination, { recursive: true });
    variants[name] = {
      subject: (await import(pathToFileURL(join(destination, "entry.mjs")))).subject,
      destination,
    };
  }
  fixtures[id] = { domain, generator, variants, root };
}
async function run(id, scenario, variant = "reference", adjust = (api) => api) {
  const f = fixtures[id];
  executions++;
  return f.domain.runScenario(
    structuredClone(scenario),
    async (adapter) => {
      const frame = adapter.begin(0);
      measure(frame);
      let calls = 0;
      const api = Object.fromEntries(
        frame.facades[0].methods.map((m) => [
          m,
          async (x) => {
            measure(x);
            calls++;
            assert(calls <= 3997, "protocol operation budget");
            const value = await adapter.invoke("api." + m, [structuredClone(x)]);
            measure(value);
            return structuredClone(value);
          },
        ]),
      );
      const subject = typeof variant === "string" ? f.variants[variant].subject : variant;
      const report = await subject.run(structuredClone(frame.view), adjust(api));
      measure(report);
      adapter.report(report);
      wire.maxApiCalls = Math.max(wire.maxApiCalls, calls);
    },
    f.root,
  );
}
async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, milliseconds: Date.now() - start });
  } catch (e) {
    results.push({ name, passed: false, error: String(e.stack ?? e), milliseconds: Date.now() - start });
  }
  console.log(JSON.stringify(results.at(-1)));
}
const clean = (r) => assert.deepEqual(r.failures, []);
let randomState = 0x193ab58;
function random(n) {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) % n;
}
for (const id of ids)
  await test(id + " complete reference and alternate population", async () => {
    for (const s of fixtures[id].generator.scenarios())
      for (const v of ["reference", "alternative"]) clean(await run(id, s, v));
  });
for (const id of ids)
  await test(id + " public tests accept all three workspace variants", async () => {
    for (const v of Object.values(fixtures[id].variants)) {
      const files = readdirSync(join(v.destination, "test")).filter((p) => p.endsWith(".test.mjs"));
      const result = spawnSync(
        process.execPath,
        ["--test", ...files.map((p) => join(v.destination, "test", p))],
        { encoding: "utf8", timeout: 30000 },
      );
      assert.equal(result.status, 0, result.stdout + "\n" + result.stderr);
    }
  });

await test("64 generated build DAGs vary closure depth current sources and tool versions", async () => {
  for (let i = 0; i < 64; i++) {
    const n = 1 + random(4),
      files = { shared: "value-" + random(1000) },
      actions = [];
    for (let j = 0; j < n; j++) {
      files["f" + j] = "unit " + j + " @include(shared)";
      actions.push({
        id: "a" + j,
        entry: "f" + j,
        tool: "compiler-" + random(3),
        flags: random(2) ? "upper" : "identity",
        deps: j ? [{ alias: "input", action: "a" + (j - 1) }] : [],
      });
    }
    const first = { id: "r0", files, actions, targets: ["a" + (n - 1)], callBudget: 0 };
    const second = structuredClone(first);
    second.id = "r1";
    second.files.shared += " changed";
    second.callBudget = n;
    const third = structuredClone(second);
    third.id = "r2";
    third.actions.at(-1).tool += " next";
    third.callBudget = 1;
    const s = { id: "generated-" + i, seedBuilds: [first], rounds: [first, second, third] };
    for (const v of ["reference", "alternative"]) clean(await run(ids[0], s, v));
  }
});
await test("64 generated event traces vary partitions lateness duplicate and idle boundaries", async () => {
  for (let i = 0; i < 64; i++) {
    const ps = Array.from({ length: 1 + random(4) }, (_, j) => "p" + j),
      events = [],
      marks = Object.fromEntries(ps.map((p) => [p, -1000]));
    for (let j = 0; j < 45; j++) {
      const partition = ps[random(ps.length)],
        kind = random(6);
      if (kind < 3) {
        const e = {
          kind: "data",
          partition,
          id: "e" + j,
          time: random(120) - 30,
          key: "k" + random(5),
          delta: random(21) - 10,
        };
        events.push(e);
        if (random(4) === 0) events.push(structuredClone(e));
      } else if (kind === 3) {
        marks[partition] = Math.max(0, marks[partition]) + random(12);
        events.push({ kind: "watermark", partition, value: marks[partition] });
      } else events.push({ kind: kind === 4 ? "idle" : "resume", partition });
    }
    ps.forEach((partition) => events.push({ kind: "end", partition }));
    const s = {
      id: "generated-" + i,
      view: { partitions: ps, width: 1 + random(20), lateness: random(21) },
      events,
    };
    for (const v of ["reference", "alternative"]) clean(await run(ids[1], s, v));
  }
});
await test("64 allocation permutations preserve a winning contingent policy", async () => {
  for (let i = 0; i < 64; i++) {
    const list = fixtures[ids[2]].generator.scenarios(),
      s = structuredClone(list[i % list.length]);
    const rotate = random(s.view.resources.length);
    s.view.resources.push(...s.view.resources.splice(0, rotate));
    if (i % 2) s.view.resources.reverse();
    function flip(n) {
      if (random(2)) n.children.reverse();
      n.children.forEach(flip);
    }
    flip(s.view.tree);
    for (const v of ["reference", "alternative"]) {
      const result = await run(ids[2], s, v);
      assert.equal(winningPolicyExists(fixtures[ids[2]].domain, s), true);
      clean(result);
    }
  }
});
await test("64 byte-fragmented diagnostic streams match their canonical record population", async () => {
  for (let i = 0; i < 64; i++) {
    const f = fixtures[ids[3]],
      s = structuredClone(f.generator.scenarios()[i % 24]);
    for (const r of s.records)
      if (r.kind === "chunk") r.value += "λ" + i;
      else if (r.status === "error") r.retryable = !r.retryable;
    // Reverse order while preserving duplicate identities and complete per-channel JSON.
    if (i % 2) s.records.reverse();
    s.chunks = f.generator.wire(s.records, i * 7);
    const byChannel = new Map();
    for (const c of s.chunks) {
      const b = byChannel.get(c.channel) ?? [];
      b.push(Buffer.from(c.bytes, "base64"));
      byChannel.set(c.channel, b);
    }
    const decoded = [...byChannel.values()].flatMap((bs) =>
      Buffer.concat(bs)
        .toString("utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((s) => JSON.parse(s)),
    );
    assert.deepEqual(
      decoded.map((x) => JSON.stringify(x)).sort(),
      s.records.map((x) => JSON.stringify(x)).sort(),
    );
    assert(s.chunks.length <= 400);
    for (const v of ["reference", "alternative"]) clean(await run(ids[3], s, v));
  }
});
await test("64 issued-report histories vary values recipients and independent definition ordering", async () => {
  for (let i = 0; i < 64; i++) {
    const s = structuredClone(fixtures[ids[4]].generator.scenarios()[i % 24]);
    const delta = random(41) - 20;
    s.readings.forEach((r) => {
      if (r.value !== null) r.value += delta;
    });
    for (const step of s.steps) for (const r of step.changes) if (r.value !== null) r.value += delta;
    if (i % 2) s.definitions.reverse();
    s.readings.reverse();
    s.initialAudience.push({ report: "sum", recipient: "additional-" + i });
    for (const v of ["reference", "alternative"]) clean(await run(ids[4], s, v));
  }
});
await test("publication order property and response member order are not hidden requirements", async () => {
  const reverseObjects = (x) =>
    Array.isArray(x)
      ? x.map(reverseObjects)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.entries(x)
              .reverse()
              .map(([k, v]) => [k, reverseObjects(v)]),
          )
        : x;
  for (const id of ids) {
    const s = fixtures[id].generator.scenarios()[0];
    clean(
      await run(id, s, "reference", (api) =>
        Object.fromEntries(
          Object.entries(api).map(([key, fn]) => [
            key,
            async (r) => reverseObjects(await fn(reverseObjects(r))),
          ]),
        ),
      ),
    );
  }
});
await test("forged reports cannot replace positive work and private evidence", async () => {
  for (const id of ids) {
    const r = await run(id, fixtures[id].generator.scenarios()[0], {
      run: () => ({ reward: 1, complete: true }),
    });
    assert.equal(r.checks.completion, false);
  }
});
await test("build cannot publish a handle before the compiler has issued it", async () => {
  const s = fixtures[ids[0]].generator.scenarios()[24];
  const r = await run(ids[0], s, {
    run: async (_, api) => {
      const round = await api.next({}),
        a = round.actions[0];
      await api.publish({ round: round.id, outputs: [{ target: a.id, handle: "built-1" }] });
      await api.compile({
        action: a.id,
        entry: a.entry,
        tool: a.tool,
        flags: a.flags,
        files: Object.entries(round.files).map(([path, text]) => ({ path, text })),
        dependencies: [],
      });
      await api.next({});
      return {};
    },
  });
  assert.equal(r.checks.current_artifacts, false);
});
await test("every emitted source fixture satisfies its declared winning path and diagnostic wire", async () => {
  for (const s of fixtures[ids[2]].generator.scenarios()) {
    await run(ids[2], s);
    assert.equal(winningPolicyExists(fixtures[ids[2]].domain, s), true);
  }
  for (const s of fixtures[ids[3]].generator.scenarios()) {
    const channels = new Map();
    for (const c of s.chunks) {
      const list = channels.get(c.channel) ?? [];
      list.push(Buffer.from(c.bytes, "base64"));
      channels.set(c.channel, list);
    }
    const records = [...channels.values()].flatMap((bs) =>
      Buffer.concat(bs).toString("utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse),
    );
    assert.deepEqual(
      records.map((x) => JSON.stringify(x)).sort(),
      s.records.map((x) => JSON.stringify(x)).sort(),
    );
  }
});
await test("malformed build publication returns a shape error without corrupting authority state", async () => {
  const f = fixtures[ids[0]];
  clean(
    await run(ids[0], f.generator.scenarios()[24], {
      run: async (v, api) => {
        assert.deepEqual(await api.publish({ round: "r", outputs: [null] }), { error: "shape" });
        return f.variants.reference.subject.run(v, api);
      },
    }),
  );
});
await test("all exercised views and correct operations fit the published execution envelope", async () => {
  assert(wire.maxPayloadBytes > 0 && wire.maxPayloadBytes <= 48 * 1024);
  assert(wire.maxApiCalls > 0 && wire.maxApiCalls <= 3997);
});
const summary = { schemaVersion: 1, results, executions, wire, protectedRoute: false, providerCallsMade: 0 };
writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
if (results.some((r) => !r.passed)) process.exitCode = 1;
