// Real package/container integration; every author is the inert local fixture program.
// No provider executable, model endpoint, real campaign, or real approval is used.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
const exec = promisify(execFile);
const [native, browser, goImage, requestedOutput] = process.argv.slice(2);
if (!native || !browser || !/^sha256:[a-f0-9]{64}$/.test(goImage ?? "") || !requestedOutput)
  throw Error(
    "usage: node scripts/verify-authorized-execution.mjs NATIVE_EXPORT BROWSER_EXPORT PINNED_GO_IMAGE FRESH_OUTPUT",
  );
const output = resolve(requestedOutput);
mkdirSync(output, { recursive: false });
const cli = resolve("dist/packages/local-cli.js");
const run = async (...args) => {
  const r = await exec(process.execPath, [cli, "execution", ...args], {
    timeout: 1200000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, OPENAI_API_KEY: "INERT_PRIVATE_ENV_SENTINEL" },
  });
  // The compatibility CLI intentionally prints regrade's immutable directory as text.
  // Other execution subcommands expose structured JSON; do not conflate the contracts.
  return args[0] === "regrade" ? r.stdout.trim() : JSON.parse(r.stdout);
};
const runtime = await run("build-inert", join(output, "runtime"), goImage);
const jobs = join(output, "jobs");
const server = createServer((_request, response) => response.end("foundry-public-tool-ok"));
await new Promise((done) => server.listen(0, "0.0.0.0", done));
const cases = [];
try {
  for (const [pkg, receipt, id, mode, target, expected, network] of [
    [native, join(native, "assurance.json"), "native-correct", "correct", "codex", "semantic-pass", false],
    [
      native,
      join(native, "assurance.json"),
      "native-missing-file",
      "missing-file",
      "codex",
      "invalid-execution",
      false,
    ],
    [
      native,
      join(native, "assurance.json"),
      "native-incorrect",
      "incorrect",
      "claude",
      "semantic-fail",
      false,
    ],
    [
      browser,
      join(browser, "verification/assurance.json"),
      "browser-correct",
      "correct",
      "claude",
      "semantic-pass",
      false,
    ],
    [
      browser,
      join(browser, "verification/assurance.json"),
      "browser-incorrect",
      "incorrect",
      "codex",
      "semantic-fail",
      true,
    ],
    ...["timeout", "malformed", "large-output", "interrupted", "child-process"].map((mode) => [
      browser,
      join(browser, "verification/assurance.json"),
      `resource-${mode}`,
      mode,
      "codex",
      "invalid-execution",
      false,
    ]),
  ]) {
    const args = ["demo", pkg, receipt, jobs, id, mode, target, runtime.binary];
    if (network) args.push(`http://host.docker.internal:${server.address().port}/public-tool`);
    const result = await run(...args);
    const record = JSON.parse(readFileSync(join(result.directory, "result.json"), "utf8"));
    const capture = JSON.parse(readFileSync(join(result.directory, "capture.json"), "utf8"));
    assert.equal(record.outcome, expected);
    assert.equal(record.countsAsModelFailure, false);
    assert.equal(record.evidenceClass, "simulation");
    assert.equal(result.providerCallsMade, 0);
    assert.equal(capture.bytesRetained <= 33554432, true);
    const expectedCapture =
      {
        timeout: "timeout",
        malformed: "malformed-events",
        "large-output": "output-limit",
        interrupted: "process-error",
        "child-process": "timeout",
      }[mode] ?? "completed";
    assert.equal(capture.status, expectedCapture);
    if (expected !== "invalid-execution") {
      const events = readFileSync(join(result.directory, "capture/events.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map(JSON.parse);
      assert(
        events.some(
          (e) => e.type === "isolation" && e.privateDenied && e.uid === 1000 && e.publicToolAvailable,
        ),
      );
      if (network) assert(events.some((e) => e.type === "external-tool" && e.status === 200));
      if (pkg === native) assert(events.some((e) => e.type === "tool" && e.cwd === "/app/certd"));
      if (id === "browser-correct")
        assert(
          events.some((e) => e.type === "isolation" && e.selfCheckPassed === true),
          "current browser reference must pass its visible tests as well as protected grading",
        );
      assert(events.filter((e) => e.type === "artifact" && e.kind === "submission").length > 1);
      assert(events.some((e) => e.type === "artifact" && e.kind === "workspace"));
    }
    const manifest = await run("verify", result.directory);
    cases.push({
      id,
      mode,
      expected,
      observed: record.outcome,
      captureStatus: capture.status,
      bytesRetained: capture.bytesRetained,
      milliseconds: capture.milliseconds,
      directory: result.directory,
      files: manifest.files.length,
      packageDigest: record.packageDigest,
      profileDigest: record.profileDigest,
    });
    process.stdout.write(`${id}: ${record.outcome}, ${capture.status}\n`);
  }
  const original = cases.find((c) => c.id === "browser-incorrect").directory;
  const before = readFileSync(join(original, "completion.json"));
  const regrade = await run("regrade", original, browser, join(output, "regrades"), "browser-regrade");
  assert(readFileSync(join(original, "completion.json")).equals(before));
  assert.equal(JSON.parse(readFileSync(join(regrade, "result.json"), "utf8")).newAgentAttempts, 0);
  const db = readFileSync(join(jobs, "execution.sqlite"));
  assert.equal((await run("inspect", jobs)).length, cases.length);
  assert(readFileSync(join(jobs, "execution.sqlite")).equals(db));
  const completed = cases.find((c) => c.id === "native-correct");
  const replay = await run(
    "resume",
    native,
    join(native, "assurance.json"),
    jobs,
    completed.id,
    runtime.binary,
  );
  assert.equal(replay.directory, completed.directory);
  const result = {
    schemaVersion: 1,
    cases,
    regrade,
    readOnlyInspection: true,
    repeatedResumeNoDispatch: true,
    providerCallsMade: 0,
    realTrialEvidence: false,
  };
  writeFileSync(join(output, "result.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
} finally {
  await new Promise((done) => server.close(done));
}
