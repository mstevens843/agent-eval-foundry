import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PHASE14_PROVIDER_IMAGE,
  PHASE14_PROVIDER_LIMITS,
  phase14ProviderCommand,
  phase14ProviderContainerB6,
  phase14ProviderPlanFailures,
  stageCodexCredential,
} from "../src/phase-14/provider-runtime.js";

describe("Phase 14 provider container commands", () => {
  it("pins Claude and Codex to the registered models and effort", () => {
    const claude = phase14ProviderCommand("anthropic");
    expect(claude).toContain(PHASE14_PROVIDER_IMAGE);
    expect(claude).toContain("--network=bridge");
    expect(claude).toContain("--env=CLAUDE_CODE_OAUTH_TOKEN");
    expect(claude).toContain("--mount=type=bind,source={dir}/challenge,target=/work/challenge,readonly");
    expect(claude.slice(-12)).toContain("opus");
    expect(claude.slice(-12)).toContain("max");
    expect(claude).toContain(`--memory=${PHASE14_PROVIDER_LIMITS.memory}`);

    const codex = phase14ProviderCommand("openai", "/tmp/codex-credential");
    expect(codex).toContain(PHASE14_PROVIDER_IMAGE);
    expect(codex).toContain(
      "--mount=type=bind,source=/tmp/codex-credential,target=/run/foundry-credential,readonly",
    );
    expect(codex).toContain("codex-with-credential");
    expect(codex).toContain("--json");
    expect(codex).not.toContain("CLAUDE_CODE_OAUTH_TOKEN");
  });

  it("refuses Codex without a staged credential", () => {
    expect(() => phase14ProviderCommand("openai")).toThrow(/staged credential/);
  });

  it("runs B6 against the provider-container plan", () => {
    expect(phase14ProviderContainerB6()).toEqual({
      usable: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
    });
    expect(phase14ProviderPlanFailures(["docker", "run"], "anthropic")).toContain(
      "challenge-not-overmounted-read-only",
    );
  });

  it("stages only auth plus a deterministic model configuration", () => {
    const source = process.env.CODEX_HOME ?? `${process.env.HOME}/.codex`;
    if (!existsSync(`${source}/auth.json`)) return;
    const dir = stageCodexCredential();
    expect(readFileSync(`${dir}/config.toml`, "utf8")).toBe(
      'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "xhigh"\n',
    );
  });
});
