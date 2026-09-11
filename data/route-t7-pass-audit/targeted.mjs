// Additional existing-contract checks, executed in an offline audit container.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { subject } from "/submitted/entry.mjs";
import { run as checker } from "/submitted/checker.mjs";
import { run as referenceChecker } from "/reference/checker.mjs";
import { plan } from "/reference/src/plan.mjs";
import { runScenario, evaluate } from "/authority/domain.mjs";
import { validateTarget } from "/authority/target.mjs";
import { vocabulary, equivalent } from "/authority/equivalence.mjs";
const summary = {
  serviceChecks: 0,
  checkerCases: 0,
  validCases: 0,
  invalidCases: 0,
  deterministic: true,
  inputUnchanged: true,
  failures: [],
  groups: {},
  classifications: [],
};
const clone = (x) => structuredClone(x),
  cases = [],
  wanted = [];
const executor = (run) => async (a) => {
  const spec = a.begin(0);
  const api = Object.fromEntries(
    spec.facades[0].methods.map((m) => [m, (args) => a.invoke("api." + m, [args])]),
  );
  await a.report(await run(spec.view, api));
};
async function cell(s, run) {
  return runScenario(s, executor(run), "/tmp");
}
function raw(c) {
  const { checks, status, failures, expected, truth, groundTruth, ...v } = c;
  return v;
}
function add(name, c, group) {
  const ok = c.failures.length === 0;
  cases.push({ token: name, cells: [raw(c)] });
  wanted.push(ok);
  summary[ok ? "validCases" : "invalidCases"]++;
  summary.groups[group] = (summary.groups[group] ?? 0) + 1;
}
const action = (decision, preference) => ({
  decision,
  add: [],
  remove: [],
  ...(preference === undefined ? {} : { preference }),
});
const rule = (a, all = [], none = []) => ({ when: { all, none }, action: a });
const root = (kind = "accept") => ({ terms: [], fallback: { kind } });
const simple = (id, policy = root(), match = {}, pref = 200) => ({
  id,
  config: { egresses: { east: "root", west: "root" }, policies: { root: policy } },
  request: { egresses: ["east"], match, preference: pref },
  routes: ["east", "west"].flatMap((egress) =>
    ["0.0.0.0/0", "0.0.0.0/32", "128.0.0.0/1", "255.255.255.255/32"].flatMap((prefix) =>
      [0, 17, 1000].map((preference) => ({
        egress,
        route: { prefix, preference, communities: ["outside"] },
      })),
    ),
  ),
});
const scenarios = [];
for (const kind of ["accept", "reject", "return", "continue"])
  for (const pref of [0, 1000]) {
    scenarios.push(
      simple(
        "fallback-" + kind + "-" + pref,
        { terms: [], fallback: { kind, preference: pref, remove: ["x"], add: ["x", "y"] } },
        { communities: ["x", "y"] },
        pref,
      ),
    );
  }
for (const key of ["__proto__", "constructor", "toString", "", "λ\u0000suffix"]) {
  const s = simple("opaque-" + JSON.stringify(key));
  s.config.policies = Object.fromEntries([[key, root()]]);
  s.config.egresses = Object.fromEntries([
    [key, key],
    ["other", key],
  ]);
  s.request.egresses = [key];
  s.routes = s.routes.map((r, i) => ({ ...r, egress: i % 2 ? key : "other" }));
  scenarios.push(s);
}
for (const len of [0, 1, 8, 31, 32]) {
  const prefix =
    len === 0
      ? "0.0.0.0/0"
      : len === 1
        ? "128.0.0.0/1"
        : len === 8
          ? "255.0.0.0/8"
          : len === 31
            ? "255.255.255.254/31"
            : "255.255.255.255/32";
  scenarios.push(
    simple(
      "prefix-boundary-" + len,
      {
        terms: [
          { match: { prefix, ge: len, le: len }, action: { kind: "continue", add: ["x"] } },
          { match: { communities: ["x"] }, action: { kind: "accept", remove: ["x"], add: ["y"] } },
        ],
        fallback: { kind: "reject", preference: 0 },
      },
      { prefix, communities: ["x"] },
      1000,
    ),
  );
}
const deep = simple("five-deep-fallback-call");
deep.config.policies = Object.fromEntries(
  Array.from({ length: 5 }, (_, i) => [
    "p" + i,
    {
      terms: [],
      fallback:
        i === 4
          ? { kind: "return", preference: 1000, add: ["x"] }
          : { kind: "call", policy: "p" + (i + 1), preference: 0, remove: ["x"] },
    },
  ]),
);
deep.config.egresses = { east: "p0", west: "p2" };
scenarios.push(deep);
const repeated = simple("eight-calls-return-then-accept");
repeated.config.policies = {
  root: {
    terms: Array.from({ length: 8 }, (_, i) => ({
      match: {},
      action: { kind: "call", policy: "p" + (i % 7), add: ["x"] },
    })),
    fallback: { kind: "accept" },
  },
  ...Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [
      "p" + i,
      { terms: [], fallback: { kind: "return", remove: ["x"], add: ["y"] } },
    ]),
  ),
};
scenarios.push(repeated);
const conjunction = simple("twelve-registered-tags");
const tags = Array.from({ length: 12 }, (_, i) => (i === 11 ? "λ".repeat(64) : "tag-" + i));
conjunction.config.policies.root = {
  terms: [{ match: { communities: tags }, action: { kind: "accept", preference: 0 } }],
  fallback: { kind: "reject" },
};
conjunction.request.match = { communities: tags };
conjunction.routes = tags.map((_, i) => ({
  egress: "east",
  route: { prefix: "0.0.0.0/0", preference: 17, communities: tags.filter((_, j) => i !== j) },
}));
scenarios.push(conjunction);
for (const s of scenarios) {
  const d = plan(s);
  validateTarget(d, vocabulary(s.config, s.request));
  assert(
    Buffer.byteLength(JSON.stringify({ config: s.config, request: s.request })) +
      Buffer.byteLength(JSON.stringify({ config: d })) <=
      48 * 1024,
  );
  assert(equivalent(s.config, s.request, d, evaluate));
  const service = await cell(s, subject.run);
  summary.serviceChecks++;
  if (service.failures.length)
    summary.failures.push({ name: s.id, kind: "service", scenario: s, cell: service });
  add(s.id, await cell(s, async (v, a) => a.publish({ config: d })), "boundary-scenarios");
}
const s = simple("alternative-layouts"),
  d = plan(s);
const deploy = async (name, target, group, pre = []) =>
  add(
    name,
    await cell(s, async (v, a) => {
      for (const t of pre) await a.publish({ config: t });
      return a.publish({ config: target });
    }),
    group,
  );
await deploy("reference-layout", d, "alternatives");
const rejected = simple("implicit-reject-table", root("reject"));
add(
  "implicit-reject-table",
  await cell(rejected, async (v, a) =>
    a.publish({ config: { format: "flat-v1", egresses: { east: [], west: [] } } }),
  ),
  "alternatives",
);
const split = clone(d);
for (const [k, rows] of Object.entries(split.egresses))
  split.egresses[k] = rows
    .flatMap((r) =>
      ["0.0.0.0/1", "128.0.0.0/1"].map((prefix) => ({
        ...clone(r),
        when: { all: [...r.when.all, { prefix }], none: r.when.none },
      })),
    )
    .concat(rows);
await deploy("prefix-partition-plus-parent-prefix", split, "alternatives");
const unreachable = clone(d);
for (const rows of Object.values(unreachable.egresses))
  rows.unshift(rule(action("reject", 999), [{ prefix: "0.0.0.0/1" }, { prefix: "128.0.0.0/1" }]));
await deploy("unreachable-contradictory-rule", unreachable, "alternatives");
const redundant = clone(d);
while (Object.values(redundant.egresses).flat().length < 512)
  redundant.egresses.west.push(clone(redundant.egresses.west[0]));
// Exact rule capacity with a valid, compact JSON deployment.
validateTarget(redundant, vocabulary(s.config, s.request));
await deploy("512-rules-valid", redundant, "capacity");
const over = clone(redundant);
over.egresses.west.push(clone(over.egresses.west[0]));
assert(Buffer.byteLength(JSON.stringify({ config: over })) <= 48 * 1024);
assert.throws(() => validateTarget(over, vocabulary(s.config, s.request)), /capacity/);
await deploy("513-rules-invalid-then-valid", d, "recovery", [over]);
await deploy("513-rules-without-correction", over, "capacity");
const atoms = clone(d);
atoms.egresses.east[0].when.all = Array.from({ length: 4096 }, () => ({}));
validateTarget(atoms, vocabulary(s.config, s.request));
await deploy("4096-predicate-atoms", atoms, "capacity");
const tooMany = clone(atoms);
tooMany.egresses.east[0].when.all.push({});
await deploy("4097-atoms-invalid-then-valid", d, "recovery", [tooMany]);
await deploy("4097-atoms-without-correction", tooMany, "capacity");
const invalids = [
  null,
  {},
  { ...clone(d), source: {} },
  { ...clone(d), egresses: { east: d.egresses.east } },
  { ...clone(d), egresses: { ...d.egresses, extra: [] } },
];
for (const prefix of ["10.1.0.0/8", "0.0.0.0/33", "256.0.0.0/8"]) {
  const x = clone(d);
  x.egresses.east[0].when.all = [{ prefix }];
  invalids.push(x);
}
for (const prop of ["preference", "add", "remove"]) {
  const x = clone(d);
  x.egresses.east[0].action[prop] = prop === "preference" ? 1001 : ["unregistered"];
  invalids.push(x);
}
for (let i = 0; i < invalids.length; i++) {
  await deploy("invalid-proposal-recovery-" + i, d, "recovery", [invalids[i]]);
  await deploy("invalid-proposal-unrepaired-" + i, invalids[i], "malformed-deployments");
}
add(
  "publish-after-success-invalid",
  await cell(s, async (v, a) => {
    await a.publish({ config: d });
    return a.publish({ config: {} });
  }),
  "ordering",
);
add(
  "publish-after-success-valid",
  await cell(s, async (v, a) => {
    await a.publish({ config: d });
    return a.publish({ config: d });
  }),
  "ordering",
);
// Mutations outside the supplied route samples must still fail universal equivalence.
for (let i = 0; i < 16; i++) {
  const x = clone(d),
    egress = i % 2 ? "east" : "west";
  x.egresses[egress].unshift(
    rule(action(i % 3 ? "accept" : "reject", i + 1), [{ prefix: "192.0.2." + i + "/32" }]),
  );
  await deploy("unsampled-host-" + i, x, "unsampled-behavior");
}
// Verdict identifiers are arbitrary strings, and candidates must be independent.
const base = JSON.parse(readFileSync("/base/cases.json", "utf8")).cases;
const baseline = await referenceChecker({ cases: base });
for (let i = 0; i < base.length; i++) {
  const token =
    ["__proto__", "constructor", "toString", "hasOwnProperty", "0", "", "a\u0000b", "λ"][i % 8] +
    (i < 8 ? "" : i);
  cases.push({ token, cells: clone(base[i].cells) });
  wanted.push(baseline.verdicts[base[i].token].ok);
  summary.groups["opaque-tokens"] = (summary.groups["opaque-tokens"] ?? 0) + 1;
  summary[wanted.at(-1) ? "validCases" : "invalidCases"]++;
}
const input = { cases };
function freeze(x) {
  if (x && typeof x === "object") {
    for (const v of Object.values(x)) freeze(v);
    Object.freeze(x);
  }
  return x;
}
freeze(input);
const before = JSON.stringify(input);
const first = await checker(input),
  second = await checker(input),
  oracle = await referenceChecker(input);
summary.checkerCases = cases.length;
summary.inputUnchanged = before === JSON.stringify(input);
summary.deterministic = JSON.stringify(first) === JSON.stringify(second);
for (let i = 0; i < cases.length; i++) {
  const token = cases[i].token;
  const good = Object.hasOwn(first.verdicts, token) && first.verdicts[token]?.ok === wanted[i];
  summary.classifications.push({
    token,
    expectedAccept: wanted[i],
    accepted: first.verdicts[token]?.ok,
    correct: good,
  });
  if (!good)
    summary.failures.push({
      kind: "checker",
      name: token,
      expected: wanted[i],
      actual: first.verdicts[token],
      case: cases[i],
    });
  if (oracle.verdicts[token]?.ok !== wanted[i])
    summary.failures.push({
      kind: "reference-checker",
      name: token,
      expected: wanted[i],
      actual: oracle.verdicts[token],
    });
}
assert.equal(Object.keys(first.verdicts).length, cases.length);
console.log(JSON.stringify({ ...summary, fixtures: { scenarios, cases, wanted } }));
