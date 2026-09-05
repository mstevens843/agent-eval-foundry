// The reported Probe V2 artifact: run, adjudicate against the frozen registration, and record both.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type ProbeV2Registration,
  type ProbeV2Run,
  type ProbeV2Verdict,
  adjudicateProbeV2,
  runProbeV2,
} from "./probe-v2.js";

export interface Phase17ProbeV2Artifact {
  readonly schema: "agent-eval-foundry/phase-17-probe-v2-results@1";
  readonly registrationId: string;
  readonly registrationSha256: string;
  readonly implementationSha256: string;
  readonly verdict: ProbeV2Verdict;
  readonly run: ProbeV2Run;
}

export function runPhase17ProbeV2(root: string): Phase17ProbeV2Artifact {
  const registrationPath = join(root, "data/phase-17-probe-v2-preregistration.json");
  const registrationBytes = readFileSync(registrationPath);
  const registration = JSON.parse(registrationBytes.toString("utf8")) as ProbeV2Registration;
  const implementationSha256 = createHash("sha256")
    .update(readFileSync(join(root, "src/phase-17/probe-v2.ts")))
    .digest("hex");
  const run = runProbeV2();
  return {
    schema: "agent-eval-foundry/phase-17-probe-v2-results@1",
    registrationId: registration.registrationId,
    registrationSha256: createHash("sha256").update(registrationBytes).digest("hex"),
    implementationSha256,
    verdict: adjudicateProbeV2(registration, run, implementationSha256),
    run,
  };
}

export const phase17ProbeV2Json = (artifact: Phase17ProbeV2Artifact): string =>
  `${JSON.stringify(artifact, null, 2)}\n`;
