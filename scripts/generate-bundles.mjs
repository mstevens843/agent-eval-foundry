#!/usr/bin/env node
// Regenerate every checked-in external/import-only provider bundle.
//
// These are evidence artifacts, not convenience zips. The pinned challenge hash inside each bundle
// is what makes later imported trials countable, so bundle generation is explicit and deterministic.
import { execFileSync } from "node:child_process";

const targets = [
  ["prompt-injection-containment", "external", "bundles/prompt-injection-containment-external"],
  ["prompt-injection-memory-poisoning", "external", "bundles/prompt-injection-memory-poisoning-external"],
  ["ui-action-record-replay", "external", "bundles/ui-action-record-replay-external"],
  ["ui-replay-live-dom", "external", "bundles/ui-replay-live-dom-external"],
  ["ui-replay-live-dom", "claude", "bundles/ui-replay-live-dom-claude"],
  ["ui-replay-live-dom", "claude-sonnet", "bundles/ui-replay-live-dom-claude-sonnet"],
  ["ui-replay-live-dom", "claude-haiku", "bundles/ui-replay-live-dom-claude-haiku"],
  ["ui-replay-live-dom", "gemini", "bundles/ui-replay-live-dom-gemini"],
  ["checker-required-memory-poisoning", "external", "bundles/checker-required-memory-poisoning-external"],
  ["checker-required-memory-poisoning", "claude", "bundles/checker-required-memory-poisoning-claude"],
  [
    "checker-required-memory-poisoning",
    "claude-sonnet",
    "bundles/checker-required-memory-poisoning-claude-sonnet",
  ],
  [
    "checker-required-memory-poisoning",
    "claude-haiku",
    "bundles/checker-required-memory-poisoning-claude-haiku",
  ],
  ["checker-required-memory-poisoning", "gemini", "bundles/checker-required-memory-poisoning-gemini"],
  [
    "delegated-wallet-scope-reconciliation",
    "external",
    "bundles/delegated-wallet-scope-reconciliation-external",
  ],
  [
    "deployment-model-alias-rollout-drift",
    "external",
    "bundles/deployment-model-alias-rollout-drift-external",
  ],
  [
    "deployment-model-alias-rollout-drift",
    "claude",
    "bundles/deployment-model-alias-rollout-drift-claude",
  ],
  [
    "deployment-model-alias-rollout-drift",
    "gemini",
    "bundles/deployment-model-alias-rollout-drift-gemini",
  ],
];

for (const [familyId, providerId, outDir] of targets) {
  execFileSync(
    "node",
    [
      "dist/cli.js",
      "trials",
      "campaign",
      "prepare",
      "--family",
      familyId,
      "--provider",
      providerId,
      "--out",
      outDir,
    ],
    { stdio: "inherit" },
  );
}

execFileSync("node", ["dist/cli.js", "adversarial", "all"], { stdio: "inherit" });
