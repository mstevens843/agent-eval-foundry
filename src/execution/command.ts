import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inspectNativeCaa } from "../packages/native-caa.js";
import type { PackagePolicyInput } from "../packages/policy.js";
import { verifyPortfolioReceipt } from "../packages/portfolio.js";
import { canonicalJson } from "../packages/record.js";
import { verifyEvidence } from "./artifacts.js";
import { SIMULATION_MODES, type SimulationMode, buildInertAuthor } from "./authoring.js";
import { executeSimulation } from "./execute.js";
import { executionPackage } from "./package-route.js";
import {
  type ExecutionProfile,
  QUALIFICATION_POLICY,
  type Target,
  profileDigest,
  profileFor,
} from "./profiles.js";
import { regradeExecution } from "./regrade.js";
import { type Authorization, JobStore, safeId } from "./store.js";

export async function executionCommand(root: string, args: readonly string[]): Promise<unknown> {
  const [command, a, b, c, d, e, f, g, h] = args;
  if (command === "profiles")
    return {
      policy: QUALIFICATION_POLICY,
      liveCallsMade: 0,
      note: "Pinned requests only; effective identity requires provider observations.",
    };
  if (command === "inspect" && a) {
    const store = new JobStore(a, {}, true);
    try {
      return b ? { job: store.get(b), events: store.events(b) } : store.list();
    } finally {
      store.close();
    }
  }
  if (command === "verify" && a) return verifyEvidence(a);
  if (command === "regrade" && a && b && c && d) return regradeExecution(a, b, c, d);
  if (command === "build-inert" && a && b)
    return { binary: await buildInertAuthor(root, a, b), providerCallsMade: 0 };
  if (command === "reconcile" && a && b && c) {
    const store = new JobStore(a);
    try {
      return store.reconcile(b, JSON.parse(readFileSync(c, "utf8")));
    } finally {
      store.close();
    }
  }
  if (command === "resume" && a && b && c && d && e) {
    const pkg = executionPackage(a);
    if (pkg.native) {
      const inspection = await inspectNativeCaa(a, b);
      if (!inspection.decision.stages["local-valid"].allowed)
        throw Error("SIMULATION_PACKAGE_NOT_LOCAL_VALID");
    } else await verifyPortfolioReceipt(a, b);
    const store = new JobStore(c);
    try {
      const original = store.get(d);
      if (original.realm !== "simulation") throw Error("REAL_PROVIDER_ADAPTER_NOT_ENROLLED");
      const plan = original.stages.plan as {
        profile: ExecutionProfile;
        mode: SimulationMode;
        toolURL: string | null;
      };
      if (!plan) throw Error("EXECUTION_PLAN_MISSING");
      const job = original.state === "completed" ? original : store.claim(d, `resume-${d}`);
      if (job.state === "dispatch-uncertain")
        return { job, requiresReconciliation: true, providerCallsMade: 0 };
      return await executeSimulation(
        {
          store,
          package: pkg,
          profile: plan.profile,
          policy: {
            snapshot: pkg.snapshot,
            checks: {
              reference: true,
              positiveWork: true,
              nearMissControls: true,
              contractReviewed: true,
              unresolvedAmbiguities: 0,
              unrepairedBypasses: 0,
            },
          },
          request: original,
          authorization: original.authorization,
          owner: job.owner,
          binary: e,
          mode: plan.mode,
          ...(plan.toolURL ? { toolURL: plan.toolURL } : {}),
        },
        job,
      );
    } finally {
      store.close();
    }
  }
  if (command === "demo" && a && b && c && d && e && f && g) {
    if (!SIMULATION_MODES.includes(e as SimulationMode) || !["codex", "claude"].includes(f))
      throw Error("SIMULATION_ARGUMENTS");
    safeId(d);
    const pkg = executionPackage(a);
    if (pkg.native) {
      const inspection = await inspectNativeCaa(a, b);
      if (!inspection.decision.stages["local-valid"].allowed)
        throw Error("SIMULATION_PACKAGE_NOT_LOCAL_VALID");
    } else await verifyPortfolioReceipt(a, b);
    const profile = profileFor(f as Target, pkg.image, pkg.route);
    profile.limits.wallMs = ["timeout", "child-process"].includes(e) ? 4000 : 300000;
    profile.authoring.tools = pkg.native ? ["go", "shell"] : ["node", "shell"];
    if (h) {
      if (!/^http:\/\/host\.docker\.internal:\d+\/[a-zA-Z0-9_-]*$/.test(h))
        throw Error("SIMULATION_LOCAL_TOOL_URL");
      profile.authoring.network = "bridge";
      profile.authoring.tools = [...profile.authoring.tools, h];
    }
    // This key authorizes ONLY this inert demonstration. It is not stored as real spend authority.
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const store = new JobStore(c, {
      "simulation-demo": publicKey.export({ type: "spki", format: "pem" }).toString(),
    });
    const now = Date.now();
    const authorization: Authorization = {
      schemaVersion: 1,
      id: `demo-${d}`,
      realm: "simulation",
      packageDigest: pkg.snapshot.record.digest,
      profileDigest: profileDigest(profile),
      operations: ["standard"],
      notBefore: now - 1000,
      expires: now + 1800000,
      maxAttempts: 1,
      maxConcurrent: 1,
      maxMicroUsd: 1,
      perAttemptMicroUsd: 1,
      maxMemoryMiB: profile.limits.memoryMiB,
      maxCpuUnits: profile.limits.cpus,
      maxOutputBytes: profile.limits.outputBytes,
      retryInfrastructure: false,
    };
    try {
      store.install({
        authority: "simulation-demo",
        payload: authorization,
        signature: sign(null, Buffer.from(canonicalJson(authorization)), privateKey).toString("base64"),
      });
      const policy: PackagePolicyInput = {
        snapshot: pkg.snapshot,
        checks: {
          reference: true,
          positiveWork: true,
          nearMissControls: true,
          contractReviewed: true,
          unresolvedAmbiguities: 0,
          unrepairedBypasses: 0,
        },
      };
      const result = await executeSimulation({
        store,
        package: pkg,
        profile,
        policy,
        authorization: authorization.id,
        owner: `demo-${d}`,
        binary: g,
        mode: e as SimulationMode,
        ...(h ? { toolURL: h } : {}),
        request: {
          id: d,
          packageDigest: pkg.snapshot.record.digest,
          profileDigest: profileDigest(profile),
          operation: "standard",
          slot: d,
          attempt: 1,
          retryOf: null,
          realm: "simulation",
          memoryMiB: profile.limits.memoryMiB,
          cpus: profile.limits.cpus,
          outputBytes: profile.limits.outputBytes,
          estimatedMicroUsd: 0,
        },
      });
      return { ...result, providerCallsMade: 0, realTrialEvidence: false };
    } finally {
      store.close();
    }
  }
  throw Error(
    "execution profiles | build-inert OUTPUT PINNED_GO_IMAGE | demo PACKAGE RECEIPT STORE RUN_ID MODE TARGET INERT_BINARY [LOCAL_TOOL_URL] | resume PACKAGE RECEIPT STORE RUN_ID INERT_BINARY | inspect STORE [ID] | verify RECORD | reconcile STORE ID EVIDENCE_JSON | regrade ORIGINAL PACKAGE OUTPUT_STORE NEW_ID. No live provider CLI or campaign is enabled by this command.",
  );
}
