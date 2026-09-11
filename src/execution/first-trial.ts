import { generateKeyPairSync, sign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { localProcess } from "../packages/local-process.js";
import { verifyPortfolioReceipt } from "../packages/portfolio.js";
import { canonicalJson } from "../packages/record.js";
import { executionPackage } from "./package-route.js";
import { profileDigest, profileFor } from "./profiles.js";
import { cleanupCredentialStaging, executeRealProvider, stageCodexCredential } from "./real-provider.js";
import { type Authorization, JobStore, safeId } from "./store.js";

export interface FirstTrialConfig {
  schemaVersion: 1;
  target: "codex" | "claude";
  package: string;
  receipt: string;
  store: string;
  runId: string;
  authoringImage: string;
  wallSeconds: number;
  memoryMiB: number;
  contractReviewed: boolean;
}

export function parseFirstTrialConfig(value: unknown): FirstTrialConfig {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("TRIAL_CONFIG: expected an object");
  const c = value as Record<string, unknown>;
  if (
    c.schemaVersion !== 1 ||
    !["codex", "claude"].includes(String(c.target)) ||
    ["package", "receipt", "store", "runId"].some((k) => typeof c[k] !== "string" || !c[k]) ||
    typeof c.authoringImage !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(c.authoringImage) ||
    !Number.isSafeInteger(c.wallSeconds) ||
    Number(c.wallSeconds) < 30 ||
    Number(c.wallSeconds) > 18000 ||
    !Number.isSafeInteger(c.memoryMiB) ||
    Number(c.memoryMiB) < 512 ||
    Number(c.memoryMiB) > 16384 ||
    typeof c.contractReviewed !== "boolean" ||
    Object.keys(c).some(
      (k) =>
        ![
          "schemaVersion",
          "target",
          "package",
          "receipt",
          "store",
          "runId",
          "authoringImage",
          "wallSeconds",
          "memoryMiB",
          "contractReviewed",
        ].includes(k),
    )
  )
    throw Error("TRIAL_CONFIG: invalid fields; run trial init or read docs/first-model-trial.md");
  safeId(c.runId as string);
  return c as unknown as FirstTrialConfig;
}

export async function initFirstTrial(target: string, pkg: string, receipt: string, output: string) {
  if (!["codex", "claude"].includes(target)) throw Error("TRIAL_TARGET: choose codex or claude");
  if (existsSync(output)) throw Error(`OUTPUT_EXISTS: ${output}`);
  await verifyPortfolioReceipt(pkg, receipt);
  let image: string;
  try {
    image = (
      await localProcess(
        "docker",
        ["image", "inspect", "foundry-provider-agent:local", "--format", "{{.Id}}"],
        { timeoutMs: 10000 },
      )
    ).stdout.trim();
  } catch {
    throw Error(
      "TRIAL_AUTHOR_IMAGE_MISSING: docker build -t foundry-provider-agent:local containers/provider-agent",
    );
  }
  const base = dirname(resolve(output));
  const config = parseFirstTrialConfig({
    schemaVersion: 1,
    target,
    package: relative(base, resolve(pkg)),
    receipt: relative(base, resolve(receipt)),
    store: "first-trial-jobs",
    runId: "first-trial",
    authoringImage: image,
    wallSeconds: 900,
    memoryMiB: 2048,
    contractReviewed: false,
  });
  mkdirSync(base, { recursive: true });
  writeFileSync(output, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return {
    config: output,
    next: "Review the task contract and config, then set contractReviewed to true and run trial plan CONFIG.",
    providerCallsMade: 0,
  };
}

async function prepare(configFile: string) {
  const config = parseFirstTrialConfig(JSON.parse(readFileSync(configFile, "utf8")));
  const base = dirname(resolve(configFile));
  const directory = resolve(base, config.package);
  const receipt = resolve(base, config.receipt);
  await verifyPortfolioReceipt(directory, receipt);
  const pkg = executionPackage(directory);
  if (pkg.native)
    throw Error(
      "TRIAL_RECIPE_NODE_ONLY: this introductory recipe supports Node portfolio and template packages",
    );
  const profile = profileFor(config.target, config.authoringImage, pkg.route);
  profile.authoring.network = "bridge";
  profile.authoring.credentials = "broker";
  profile.limits.wallMs = config.wallSeconds * 1000;
  profile.limits.memoryMiB = config.memoryMiB;
  const storePath = resolve(base, config.store);
  const plan = {
    schemaVersion: 1,
    target: config.target,
    requested: profile.requested,
    packageDigest: pkg.snapshot.record.digest,
    profileDigest: profileDigest(profile),
    authoringImage: config.authoringImage,
    limits: profile.limits,
    runId: config.runId,
    store: storePath,
    resultDirectory: join(storePath, "real-provider/records", config.runId),
    maxAttempts: 1,
    automaticRetries: false,
    billingMode: "subscription-only",
    paidApiFallback: false,
    contractReviewed: config.contractReviewed,
    providerCallsMade: 0,
  };
  return { config, pkg, profile, storePath, plan };
}

export async function planFirstTrial(configFile: string) {
  const { plan } = await prepare(configFile);
  return plan;
}

/** Explicit single-run front end to the existing durable execution lifecycle. Never used by onboarding checks. */
export async function runFirstTrial(configFile: string, execute: boolean) {
  if (!execute)
    throw Error(
      "TRIAL_EXECUTION_REQUIRED: inspect trial plan CONFIG, then use trial run CONFIG --execute to authorize one subscription attempt",
    );
  const { config, pkg, profile, storePath, plan } = await prepare(configFile);
  if (!config.contractReviewed)
    throw Error(
      "TRIAL_CONTRACT_REVIEW: review public requirements and assurance, then set contractReviewed to true in the config",
    );
  // A fresh store makes a repeated command fail rather than create another billable attempt.
  if (existsSync(storePath))
    throw Error(`OUTPUT_EXISTS: ${storePath}; inspect the existing trial instead of rerunning it`);
  await localProcess("docker", ["image", "inspect", config.authoringImage], {
    timeoutMs: 10000,
    limitBytes: 65536,
  });
  let staged: string | undefined;
  let store: JobStore | undefined;
  const controller = new AbortController();
  const stop = () => controller.abort();
  try {
    const token = config.target === "claude" ? process.env.CLAUDE_CODE_OAUTH_TOKEN : undefined;
    if (config.target === "claude" && !token)
      throw Error(
        "TRIAL_CREDENTIAL: set CLAUDE_CODE_OAUTH_TOKEN for your Claude subscription; it is never written to the config",
      );
    if (config.target === "codex") staged = stageCodexCredential();
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    store = new JobStore(storePath, {
      "local-user": publicKey.export({ type: "spki", format: "pem" }).toString(),
    });
    const now = Date.now();
    const authorization: Authorization = {
      schemaVersion: 1,
      id: "single-subscription-attempt",
      realm: "real-provider",
      packageDigest: plan.packageDigest,
      profileDigest: plan.profileDigest,
      operations: ["standard"],
      notBefore: now - 1000,
      expires: now + profile.limits.wallMs + 600000,
      maxAttempts: 1,
      maxConcurrent: 1,
      maxMicroUsd: 0,
      perAttemptMicroUsd: 0,
      maxMemoryMiB: profile.limits.memoryMiB,
      maxCpuUnits: profile.limits.cpus,
      maxOutputBytes: profile.limits.outputBytes,
      retryInfrastructure: false,
      billingMode: "subscription-only",
    };
    store.install({
      authority: "local-user",
      payload: authorization,
      signature: sign(null, Buffer.from(canonicalJson(authorization)), privateKey).toString("base64"),
    });
    writeFileSync(
      join(storePath, "plan.json"),
      `${JSON.stringify({ ...plan, userCommand: "trial run CONFIG --execute" }, null, 2)}\n`,
      { flag: "wx" },
    );
    const instruction =
      "Work in /work/task. Read instruction.md and SEMANTICS.md, implement all required deliverables, and run the supplied public tests. Keep your solution files in /work/task. The independent grader runs after your submission.";
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const result = await executeRealProvider({
      store,
      package: pkg,
      profile,
      policy: {
        snapshot: pkg.snapshot,
        checks: {
          reference: true,
          positiveWork: true,
          nearMissControls: true,
          contractReviewed: config.contractReviewed,
          unresolvedAmbiguities: 0,
          unrepairedBypasses: 0,
        },
      },
      request: {
        id: config.runId,
        packageDigest: plan.packageDigest,
        profileDigest: plan.profileDigest,
        operation: "standard",
        slot: config.runId,
        attempt: 1,
        retryOf: null,
        realm: "real-provider",
        memoryMiB: profile.limits.memoryMiB,
        cpus: profile.limits.cpus,
        outputBytes: profile.limits.outputBytes,
        estimatedMicroUsd: null,
      },
      authorization: authorization.id,
      owner: `local-${config.runId}`,
      target: config.target,
      instruction,
      credential:
        config.target === "codex"
          ? { codex: { authJsonPath: join(staged as string, "auth.json") } }
          : { claude: { oauthTokenEnvValue: token as string } },
      signal: controller.signal,
    });
    return {
      job: result.job,
      directory: result.directory,
      note: "Inspect outcome, observation and grading evidence before attributing a failure. One run is not a six-trial qualification.",
    };
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    store?.close();
    if (staged) cleanupCredentialStaging(staged);
  }
}
