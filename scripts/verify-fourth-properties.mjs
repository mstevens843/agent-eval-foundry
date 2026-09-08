// Trusted author property checks only. Not protected-route or model evidence.
import assert from "node:assert/strict";
import { cpSync, copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
const output = resolve(process.argv[2]);
mkdirSync(output, { recursive: false });
const ids = [
  "document-export-repair",
  "analytical-reconciliation-repair",
  "recurring-calendar-repair",
  "variant-cache-repair",
  "workflow-authority-repair",
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
await test("48 generated nested document cases with policy and codec variation", async () => {
  for (let i = 0; i < 48; i++) {
    const literal = ["a+b", "[id]", "🚲", "x.y", "VALUE"][random(5)],
      encoding = ["utf8", "base64", "gzip-base64"][random(3)];
    const value = {
      value: literal + " kept",
      email: "not-enumerated",
      rows: [null, 17, ["safe", literal]],
      other: { email: ["safe", { email: "private" }] },
    };
    const bytes = Buffer.from(JSON.stringify(value)),
      data =
        encoding === "utf8"
          ? bytes.toString()
          : (encoding === "base64" ? bytes : gzipSync(bytes)).toString("base64");
    const s = {
      id: "generated-" + i,
      policy: { literals: [literal, literal + " kept"], fields: ["email", "value"] },
      tickets: [
        {
          id: "ticket-" + i,
          subject: "keep " + literal + " kept",
          headers: [{ name: "reply", value: literal }],
          tags: ["safe"],
          related: [],
          parts: [
            { id: "part", name: "name", media: "application/json", encoding, data, links: [] },
            {
              id: "binary",
              name: literal,
              media: "application/octet-stream",
              encoding: "base64",
              data: Buffer.from(literal).toString("base64"),
              links: [],
            },
          ],
        },
      ],
    };
    for (const v of ["reference", "alternative"]) clean(await run(ids[0], s, v));
  }
});
await test("export whitespace and object ordering are not hidden requirements", async () => {
  const s = fixtures[ids[0]].generator.scenarios()[0];
  clean(
    await run(ids[0], s, "reference", (api) => ({
      ...api,
      publish: (r) =>
        api.publish({
          ...r,
          data: Buffer.from(JSON.stringify(JSON.parse(Buffer.from(r.data, "base64")), null, 3)).toString(
            "base64",
          ),
        }),
    })),
  );
});
await test("64 generated reconciliation populations preserve exact units and rounding", async () => {
  for (let i = 0; i < 64; i++) {
    const s = fixtures[ids[1]].generator.scenarios()[i % 24];
    for (const a of s.tables.accounts) a.price = { n: String(random(19)), d: String(1 + random(37)) };
    for (const u of s.tables.usage) {
      u.quantity = String(1 + random(100000)) + "." + String(random(1000)).padStart(3, "0");
      u.unit = ["ms", "s", "min"][random(3)];
    }
    // Duplicates at identical revisions must remain byte-identical under the contract.
    s.tables.usage = s.tables.usage.filter(
      (u, n, all) =>
        all.findIndex((x) => x.tenant === u.tenant && x.id === u.id && x.revision === u.revision) === n,
    );
    s.tables.usage.push(structuredClone(s.tables.usage[0]));
    for (const v of ["reference", "alternative"]) clean(await run(ids[1], s, v));
  }
});
await test("48 generated recurrence plans vary week filters duration and request scope", async () => {
  for (let i = 0; i < 48; i++) {
    const s = fixtures[ids[2]].generator.scenarios()[i % 24];
    for (const series of s.view.series) {
      series.duration = 1 + random(1440);
      series.rule.interval = 1 + random(4);
      if (i % 2) {
        series.rule.frequency = "weekly";
        series.rule.weekdays = [random(7)];
      }
    }
    for (const c of s.view.changes) if (c.action === "move") c.delta = random(181) - 90;
    for (const v of ["reference", "alternative"]) clean(await run(ids[2], s, v));
  }
});
const reverseKeys = (v) =>
  Array.isArray(v)
    ? v.map(reverseKeys)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .reverse()
            .map(([k, x]) => [k, reverseKeys(x)]),
        )
      : v;
await test("calendar event booking and attendee ordering have no grading preference", async () => {
  clean(
    await run(ids[2], fixtures[ids[2]].generator.scenarios()[0], "alternative", (api) => ({
      ...api,
      commit: (r) => api.commit(reverseKeys(r)),
    })),
  );
});
await test("extra correct origin calls within the declared budget are accepted", async () => {
  const s = fixtures[ids[3]].generator.scenarios()[20];
  s.limits.maxOriginRequests = 2;
  clean(
    await run(ids[3], s, "reference", (api) => ({
      ...api,
      origin: async (r) => {
        await api.origin(r);
        return api.origin(r);
      },
    })),
  );
});
await test("wildcard entries may be stored but never reused", async () => {
  const s = fixtures[ids[3]].generator.scenarios()[22];
  let event = null,
    response = null;
  clean(
    await run(ids[3], s, "reference", (api) => ({
      ...api,
      next: async (r) => {
        const x = await api.next(r);
        event = x.event;
        return x;
      },
      origin: async (r) => {
        response = await api.origin(r);
        return response;
      },
      deliver: async (r) => {
        const { entries } = await api.read({ tier: event.tier });
        await api.write({
          tier: event.tier,
          entries: [
            ...entries,
            {
              path: event.path,
              headers: event.headers,
              vary: response.vary,
              etag: response.etag,
              body: response.body,
              maxAge: response.maxAge,
              age: response.age,
              storedAt: event.now,
              noStore: response.noStore,
            },
          ],
        });
        return api.deliver(r);
      },
    })),
  );
});
await test("48 generated workflow policies vary active independent routes and preserve history", async () => {
  for (let i = 0; i < 48; i++) {
    const s = fixtures[ids[4]].generator.scenarios()[i % 24];
    for (const p of s.policies) {
      for (const g of p.grants) g.active = random(3) !== 0;
      p.grants.reverse();
    }
    for (const v of ["reference", "alternative"]) clean(await run(ids[4], s, v));
  }
});
await test("forged completion reports cannot satisfy positive work on any package", async () => {
  for (const id of ids) {
    const result = await run(id, fixtures[id].generator.scenarios()[0], {
      run: () => ({ complete: true, reward: 1, checks: { completion: true } }),
    });
    assert.equal(result.checks.completion, false);
  }
});
await test("empty requests do not require invented work", async () => {
  for (const id of ids) {
    const list = fixtures[id].generator.scenarios(),
      s = id === ids[3] ? list[21] : list.at(-1);
    for (const v of ["reference", "alternative"]) clean(await run(id, s, v));
  }
});
await test("all exercised views and correct operations fit the published execution envelope", async () => {
  assert(wire.maxPayloadBytes > 0 && wire.maxPayloadBytes <= 48 * 1024);
  assert(wire.maxApiCalls > 0 && wire.maxApiCalls <= 3997);
});
const summary = { schemaVersion: 1, results, executions, wire, protectedRoute: false, providerCallsMade: 0 };
writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
if (results.some((r) => !r.passed)) process.exitCode = 1;
