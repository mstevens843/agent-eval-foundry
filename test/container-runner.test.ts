// The container isolation boundary, proven rather than declared.
//
// `runners.ts` named a CONTAINER level for three phases and never built it, so every counted trial
// in this repository ran unsandboxed: the parent environment inherited, a shared /tmp in which one
// transcript records another trial overwriting its files, and an isolation field asserted by a
// constant. These tests exist to make that impossible to repeat quietly.
//
// The important one is `containerDryRun`. It builds the container, mounts a bundle, runs a trivial
// non-provider command inside it — `node` on a probe script, with no network and no credential, so
// there is nothing it could call and nothing to spend — and reports what the sandbox ACTUALLY did.
// Every claim in `isolationSummary("container")` is asserted against that observation, so a claim
// the container cannot deliver fails here instead of being believed downstream.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTAINER_IMAGE, containerRuntimeReadiness } from "../src/adversarial-audit/isolation.js";
import { decideCountability } from "../src/trials/orchestrator.js";
import {
  CONTAINER_LIMITS,
  containerAttempt,
  containerDryRun,
  containerIsolationDetail,
  containerRunner,
  containerTrialCommand,
  isolationSummary,
} from "../src/trials/runners.js";
import { NEVER_COUNTS } from "../src/trials/types.js";

const ROOT = join(__dirname, "..");

/**
 * Can a container actually START here?
 *
 * `containerRuntimeReadiness()` answers a weaker question — does a daemon respond — and that was the
 * wrong guard. GitHub's runners answer yes and then fail the actual `docker run`, so these tests went
 * red on CI while passing locally, which is the worst of both: the assertions were not being checked
 * and the build was red anyway.
 *
 * The guard now matches what the tests need. It runs the smallest possible container with the real
 * image and no isolation flags, so it separates "this machine cannot run containers" from "the
 * container ran and its isolation is wrong". The first is infrastructure and skips. The second is a
 * defect and MUST fail — it is the entire point of the file.
 */
function containerCanStart(): { ok: boolean; detail: string } {
  const readiness = containerRuntimeReadiness();
  if (!readiness.available) return { ok: false, detail: readiness.detail };
  const probe = spawnSync("docker", ["run", "--rm", CONTAINER_IMAGE, "true"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 300_000,
  });
  if (probe.error !== undefined || probe.status !== 0) {
    return {
      ok: false,
      detail: `cannot start ${CONTAINER_IMAGE}: ${(probe.error?.message ?? probe.stderr ?? "").trim().split("\n")[0]}`,
    };
  }
  return { ok: true, detail: `${CONTAINER_IMAGE} starts` };
}

const startable = containerCanStart();

/**
 * Set `FOUNDRY_REQUIRE_CONTAINER=1` to turn the skip into a failure.
 *
 * Without it a machine with no container runtime skips quietly, which is right for a laptop and
 * wrong for a pipeline that believes it is checking isolation. With it, "we could not run the
 * container" becomes the loud failure it should be. CI can set it once its runtime is known good;
 * until then the skip is announced rather than silent.
 */
const REQUIRE_CONTAINER = process.env.FOUNDRY_REQUIRE_CONTAINER === "1";
if (!startable.ok) {
  const line = `container tests SKIPPED — ${startable.detail}`;
  if (REQUIRE_CONTAINER) throw new Error(`${line} (FOUNDRY_REQUIRE_CONTAINER=1 makes this fatal)`);
  console.warn(`\n${line}\n  isolation assertions were NOT checked on this run.\n`);
}
const withDocker = startable.ok ? it : it.skip;

describe("container isolation, observed", () => {
  withDocker(
    "the dry run proves every property the container claims",
    () => {
      const dry = containerDryRun();
      // Printed so the orchestrator can read the achieved facts before authorising any spend.
      console.log(JSON.stringify({ facts: dry.facts, violations: dry.violations }, null, 2));
      expect(dry.ran).toBe(true);
      const facts = dry.facts;
      if (facts === null) throw new Error("dry run reported no facts");

      expect(facts.networkReachable).toBe(false);
      expect(facts.networkInterfaces).toEqual(["lo"]);
      expect(facts.rootWritable).toBe(false);
      expect(facts.workWritable).toBe(false);
      expect(facts.tmpWritable).toBe(true);
      // A private tmpfs, not the host's shared /tmp: the container sees only what it wrote itself.
      expect(facts.tmpEntries.filter((e) => e !== "foundry-probe")).toEqual([]);
      expect(facts.uid).not.toBe(0);
      expect(facts.hostPathsVisible).toEqual([]);
      expect(facts.envKeys).not.toContain("CLAUDE_CODE_OAUTH_TOKEN");
      expect(facts.envKeys.some((k) => /TOKEN|SECRET|API_?KEY|PASSWORD|AUTH/i.test(k))).toBe(false);
      expect(Number(facts.memoryMaxBytes)).toBe(512 * 1024 * 1024);
      expect(facts.pidsMax).toBe(String(CONTAINER_LIMITS.pids));
      expect(dry.violations).toEqual([]);
    },
    180_000,
  );

  withDocker(
    "a subject artifact runs inside the container and is graded outside it",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "container-subject-"));
      const modulePath = join(dir, "subject.mjs");
      writeFileSync(
        modulePath,
        `globalThis.__FOUNDRY_TAMPERED__ = true;
         export const subject = {
           id: "probe", label: "probe",
           run(scenario, tools) {
             tools.invoke("a-1", { tool: "search", args: {} });
             return { decisions: [], audit: [] };
           },
         };`,
        "utf8",
      );
      const runner = containerRunner({ modulePath, hostScript: join(ROOT, "scripts/subject-host.mjs") });
      expect(runner.isolation).toBe("container");
      const out = runner.run({ id: "s", tools: [] } as never);
      expect(out.error).toBeNull();
      expect(out.ledger).toHaveLength(1);
      // The ledger came back across a container boundary; the grading process was never in reach.
      expect(Reflect.get(globalThis, "__FOUNDRY_TAMPERED__")).toBeUndefined();
    },
    180_000,
  );
});

describe("a container that could not start is infrastructure, never a capability failure", () => {
  it("records subprocess, not container, when no container ran", () => {
    const failed = containerAttempt({
      ran: false,
      image: "nonexistent",
      limits: CONTAINER_LIMITS,
      argv: [],
      facts: null,
      violations: [],
      detail: "docker daemon unavailable",
    });
    expect(failed.isolation).not.toBe("container");
    expect(failed.classification).toBe("infrastructure_error");
    // The rule that matters: this can never reach a difficulty claim.
    expect(NEVER_COUNTS.has(failed.classification)).toBe(true);
    expect(decideCountability(failed.classification, failed.detail, 4).counts).toBe(false);
  });

  it("refuses the container label when the container ran but broke a claim", () => {
    const leaky = containerAttempt({
      ran: true,
      image: "x",
      limits: CONTAINER_LIMITS,
      argv: [],
      facts: null,
      violations: ["network was reachable from inside the container"],
      detail: "isolation claims not met",
    });
    expect(leaky.isolation).toBe("subprocess");
    expect(leaky.classification).toBe("infrastructure_error");
  });

  withDocker(
    "an image that does not exist is a runner error, not an empty subject report",
    () => {
      const dry = containerDryRun("foundry-no-such-image:absent");
      expect(dry.ran).toBe(false);
      expect(containerAttempt(dry).classification).toBe("infrastructure_error");
    },
    120_000,
  );
});

describe("the recorded isolation detail claims no parity it does not have", () => {
  it("says NOT containerized for a host subprocess command", () => {
    expect(containerIsolationDetail(["codex", "exec"])).toMatch(/NOT containerized/);
    expect(containerIsolationDetail(null)).toMatch(/NOT containerized/);
  });

  it("states the specific reason network stays on for a provider CLI, and the Harbor gap", () => {
    const cmd = containerTrialCommand({
      credentialDir: "/some/provider/home",
      credentialTarget: "/cred",
      agentCommand: ["codex", "exec", "{instruction}"],
    });
    expect(cmd[0]).toBe("docker");
    expect(cmd).toContain("--network=bridge");
    // The workspace is writable, the nested challenge and credential mounts are read-only, and
    // nothing else from the host filesystem crosses.
    expect(cmd.filter((a) => a.startsWith("--mount=")).length).toBe(3);
    expect(cmd).toContain("--mount=type=bind,source={dir}/challenge,target=/work/challenge,readonly");
    expect(cmd).toContain("--mount=type=bind,source=/some/provider/home,target=/cred,readonly");
    expect(cmd).toContain("--env-file=/dev/null");

    const detail = containerIsolationDetail(cmd);
    expect(detail).toMatch(/NETWORK IS ON/);
    expect(detail).toMatch(/WEAKER THAN HARBOR/);
    expect(detail).toMatch(/separate verifier IMAGE/);
    expect(detail).toMatch(/privilege three ways/);
    expect(detail).toMatch(new RegExp(CONTAINER_LIMITS.memory));
  });

  it("supports an environment-only provider credential and refuses half-specified mounts", () => {
    const cmd = containerTrialCommand({
      envPassthrough: ["CLAUDE_CODE_OAUTH_TOKEN"],
      agentCommand: ["claude", "-p", "{instruction}"],
    });
    expect(cmd.filter((a) => a.startsWith("--mount=")).length).toBe(2);
    expect(cmd).toContain("--env=CLAUDE_CODE_OAUTH_TOKEN");
    expect(() =>
      containerTrialCommand({
        credentialDir: "/credential",
        agentCommand: ["claude", "-p", "{instruction}"],
      }),
    ).toThrow(/supplied together/);
  });

  it("no longer describes the container level as unimplemented", () => {
    expect(isolationSummary("container")).not.toMatch(/not implemented/);
    expect(isolationSummary("container")).toMatch(/no network/);
  });
});
