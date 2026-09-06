// Deliberate current-view generation. Historical trial/campaign/bundle/phase inputs are untouched.
import { execFileSync } from "node:child_process";
import { BUILT_FAMILY_IDS } from "../dist/index.js";
const run = (...args) =>
  execFileSync(process.execPath, ["dist/cli.js", ...args], { stdio: "inherit", timeout: 1200000 });
for (const id of BUILT_FAMILY_IDS) {
  run("family", "run", "--family", id, "--out", `examples/families/${id}/matrix.json`);
  // The original containment shape is hand-authored registry input, not generated prose.
  if (id !== "prompt-injection-containment")
    run("family", "shape", "--family", id, "--out", `examples/shapes/${id}.json`);
  run("challenge", "build", "--family", id, "--out", `examples/families/${id}/challenge`);
}
run("family", "scenarios", "--out", "examples/families/prompt-injection-containment/scenarios.json");
run("report", "examples/durable-outbox/matrix.json", "--out", "reports/durable-outbox-axis-report.md");
run(
  "report",
  "--import",
  "swebench",
  "--null-trials",
  "3",
  "examples/public-swebench-verified/swebench-verified.raw.json",
  "--out",
  "reports/public-swebench-verified-axis-report.md",
);
run("all");
