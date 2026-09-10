// Offline cumulative regrade. No provider imports, solver calls, or credential access.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { hash } from "./grade-post-final-supplement.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const save = (p, v) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(v, null, 2) + "\n", { flag: "wx" });
};
export function gradeRemainingPassSupplement({ id, submission, output }) {
  const policyPath = join(root, "data/remaining-pass-grading-controls/policy.json");
  const policy = read(policyPath),
    controls = [];
  let current = policy;
  for (;;) {
    controls.unshift(...current.controls.filter((c) => c.id === id));
    if (!current.extends) break;
    const previous = join(root, current.extends.path);
    assert.equal(hash(previous), current.extends.sha256, "Grading policy drift");
    current = read(previous);
  }
  assert(controls.length, "No controls for task");
  const cases = [],
    expected = [];
  for (const c of controls) {
    const p = join(root, c.fixture);
    assert.equal(hash(p), c.sha256, "Fixture drift");
    cases.push(...read(p).cases);
    expected.push(...c.expected);
  }
  assert.equal(new Set(expected.map((x) => x.token)).size, expected.length);
  const stage = join(resolve(output), "submission"),
    inputs = join(resolve(output), "cases");
  cpSync(resolve(submission), stage, { recursive: true, dereference: false });
  save(join(inputs, "input.json"), { cases });
  const bootstrap = `import{readFileSync}from'node:fs';import{isDeepStrictEqual}from'node:util';const m=await import('/subject/checker.mjs');const x=JSON.parse(readFileSync('/cases/input.json'));const before=structuredClone(x);const first=JSON.parse(JSON.stringify(await m.run(x)));const second=JSON.parse(JSON.stringify(await m.run(x)));console.log(JSON.stringify({first,second,mutated:!isDeepStrictEqual(x,before)}));`;
  const raw = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=256m",
      "--cpus",
      "1",
      "--memory",
      "1g",
      "--pids-limit",
      "128",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--mount",
      `type=bind,src=${stage},dst=/subject,readonly`,
      "--mount",
      `type=bind,src=${inputs},dst=/cases,readonly`,
      policy.image,
      "node",
      "--input-type=module",
      "-e",
      bootstrap,
    ],
    { encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 },
  );
  const observed = JSON.parse(raw),
    actual = observed.first?.verdicts;
  const deterministic = !observed.mutated && isDeepStrictEqual(observed.first, observed.second);
  const exactTokens =
    actual !== null &&
    typeof actual === "object" &&
    !Array.isArray(actual) &&
    isDeepStrictEqual(Object.keys(actual).sort(), expected.map((x) => x.token).sort());
  const details = expected.map(({ token, ok }) => ({
    token,
    expectedOk: ok,
    actualOk: actual?.[token]?.ok ?? null,
    correct: actual?.[token]?.ok === ok,
  }));
  const result = {
    schemaVersion: 1,
    gradingRevision: policy.revision,
    policySha256: hash(policyPath),
    checkerSha256: hash(join(stage, "checker.mjs")),
    fixtureSha256s: controls.map((c) => c.sha256),
    reasonPolicy: "diagnostic-only",
    deterministic,
    exactTokens,
    correct: details.filter((x) => x.correct).length,
    total: details.length,
    pass: deterministic && exactTokens && details.every((x) => x.correct),
    details,
    observed,
  };
  save(join(output, "grade.json"), result);
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, submission, output] = process.argv.slice(2);
  assert(
    id && submission && output,
    "Usage: node scripts/grade-remaining-pass-supplement.mjs TASK SUBMISSION NEW_OUTPUT",
  );
  console.log(JSON.stringify(gradeRemainingPassSupplement({ id, submission, output })));
}
