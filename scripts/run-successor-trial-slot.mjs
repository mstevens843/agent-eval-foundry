import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [mode, configArg, approval] = process.argv.slice(2);
if (!mode || !configArg) {
  throw Error(
    "Use: run-successor-trial-slot.mjs prepare|verify|run SLOT_CONFIG [--user-authorized-successor-slot]",
  );
}
const configPath = resolve(root, configArg);
const config = JSON.parse(readFileSync(configPath, "utf8"));
const frozenRoot = resolve(root, config.frozenRoot);
const runRoot = resolve(root, config.runRoot);
const packageDirectory = resolve(root, config.packageDirectory);
const assurancePath = resolve(root, config.assurancePath);
const api = await import(pathToFileURL(join(frozenRoot, "dist/index.js")));
const {
  JobStore,
  assertPackageStage,
  authoritySourceDigest,
  canonicalJson,
  cleanupCredentialStaging,
  executeRealProvider,
  executionPackage,
  executionSourceIdentity,
  profileDigest,
  profileFor,
  readSnapshotFile,
  sha256,
  stageCodexCredential,
  verifyEvidence,
} = api;

const AUTHOR_IMAGE = "sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a";
const WALL_MS = 10_800_000;
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};
const emit = (value) => {
  const row = { at: new Date().toISOString(), ...value };
  mkdirSync(runRoot, { recursive: true });
  appendFileSync(join(runRoot, "controller-events.jsonl"), JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
};

function verifiedPackage() {
  const pkg = executionPackage(packageDirectory);
  assert.equal(pkg.snapshot.record.digest, config.packageDigest, "Package digest changed");
  assert.equal(pkg.checkerRequired, true, "Protected checker is required");
  const assurance = read(assurancePath);
  assert.equal(assurance.packageDigest, config.packageDigest, "Assurance is for another package");
  assert(
    assurance.results.length > 0 && assurance.results.every((result) => result.status === "pass"),
    "Package assurance contains a non-pass result",
  );
  return pkg;
}

function executionChecks() {
  return {
    reference: true,
    positiveWork: true,
    nearMissControls: true,
    contractReviewed: true,
    publicPackageComplete: true,
    protectedGrading: true,
    localIntegrityControls: true,
    unresolvedAmbiguities: 0,
    unrepairedBypasses: 0,
  };
}

async function prepare() {
  assert(!existsSync(join(runRoot, "READY.json")), "Never overwrite frozen readiness");
  const pkg = verifiedPackage();
  const profile = profileFor(config.target, AUTHOR_IMAGE, pkg.route);
  profile.adapter = {
    id: "foundry-subscription-cli",
    version: "2",
    scaffoldVersion: config.target === "codex" ? "0.153.2" : "2.1.263",
  };
  profile.authoring = {
    image: AUTHOR_IMAGE,
    network: "bridge",
    tools: ["node", "shell", config.target],
    credentials: "broker",
  };
  profile.limits.wallMs = WALL_MS;
  const checks = executionChecks();
  const decision = assertPackageStage({ snapshot: pkg.snapshot, checks }, "trial-eligible");
  const instruction = Buffer.from(
    readSnapshotFile(pkg.snapshot, "contract", "public/instruction.md"),
  ).toString();
  const ready = {
    schemaVersion: 1,
    owner: process.env.USER ?? "unknown",
    created: new Date().toISOString(),
    concurrency: 1,
    maxProviderCalls: 1,
    automaticRetries: false,
    billingMode: "subscription-only",
    noPaidApiFallback: true,
    wallMsPerTask: WALL_MS,
    sourceDigest: executionSourceIdentity(),
    sourceAuthorityDigest: authoritySourceDigest(frozenRoot),
    runnerDigest: hash(fileURLToPath(import.meta.url)),
    configDigest: hash(configPath),
    assuranceDigest: hash(assurancePath),
    package: {
      id: config.id,
      version: config.version,
      trial: config.trial,
      target: config.target,
      analysisDocument: config.analysisDocument,
      packageDigest: config.packageDigest,
      profile,
      profileDigest: profileDigest(profile),
      instructionSha256: sha256(instruction),
      checks,
      decisionBlockers: decision.stages["trial-eligible"].blockers,
    },
    userAuthority:
      `One fresh ${config.target} standard attempt for ${config.id} trial ${config.trial}. ` +
      "Launch only after every earlier trial for this package cleanly failed. Stop this package " +
      "on a pass. Never exceed six counted trials, three Claude and three Codex. " +
      "Subscription-only, no paid API fallback, no automatic retries.",
  };
  assert.equal(ready.sourceDigest, ready.sourceAuthorityDigest, "Frozen runtime build is stale");
  save(join(runRoot, "READY.json"), ready);
  emit({
    stage: "ready",
    id: config.id,
    trial: config.trial,
    target: config.target,
    providerCallsMade: 0,
  });
}

async function verify({ requireUnused = false } = {}) {
  const ready = read(join(runRoot, "READY.json"));
  assert.equal(ready.sourceDigest, executionSourceIdentity(), "Frozen runtime bundle changed");
  assert.equal(ready.sourceDigest, authoritySourceDigest(frozenRoot), "Frozen runtime source changed");
  assert.equal(ready.runnerDigest, hash(fileURLToPath(import.meta.url)), "Slot runner changed");
  assert.equal(ready.configDigest, hash(configPath), "Slot config changed");
  assert.equal(ready.assuranceDigest, hash(assurancePath), "Assurance changed");
  const pkg = verifiedPackage();
  assert.equal(profileDigest(ready.package.profile), ready.package.profileDigest);
  const instruction = Buffer.from(
    readSnapshotFile(pkg.snapshot, "contract", "public/instruction.md"),
  ).toString();
  assert.equal(sha256(instruction), ready.package.instructionSha256, "Instruction changed");
  if (requireUnused) {
    assert(!existsSync(join(runRoot, "DISPATCH-CLAIM")), "Slot was already dispatched");
  }
  return { ready, pkg, instruction };
}

async function run() {
  assert.equal(
    approval,
    "--user-authorized-successor-slot",
    "Missing exact successor-slot authorization",
  );
  const { ready, pkg, instruction } = await verify({ requireUnused: true });
  const disk = statfsSync(runRoot);
  assert(disk.bavail * disk.bsize > 2 * 1024 ** 3, "Two GiB dispatch reserve required");
  if (config.target === "claude") {
    assert(process.env.CLAUDE_CODE_OAUTH_TOKEN, "Claude OAuth unavailable in this process env");
  }
  closeSync(openSync(join(runRoot, "DISPATCH-CLAIM"), "wx", 0o600));
  const pair = generateKeyPairSync("ed25519");
  const authorityName = `successor-${config.id}-trial-${config.trial}`;
  const store = new JobStore(join(runRoot, "jobs"), {
    [authorityName]: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  });
  const plan = ready.package;
  const now = Date.now();
  const authority = {
    schemaVersion: 1,
    id: `${config.id}-trial-${config.trial}-approval`,
    realm: "real-provider",
    packageDigest: plan.packageDigest,
    profileDigest: plan.profileDigest,
    operations: ["standard"],
    notBefore: now - 1000,
    expires: now + 6 * 3_600_000,
    maxAttempts: 1,
    maxConcurrent: 1,
    maxMicroUsd: 0,
    perAttemptMicroUsd: 0,
    maxMemoryMiB: plan.profile.limits.memoryMiB,
    maxCpuUnits: plan.profile.limits.cpus,
    maxOutputBytes: plan.profile.limits.outputBytes,
    retryInfrastructure: false,
    billingMode: "subscription-only",
  };
  store.install({
    authority: authorityName,
    payload: authority,
    signature: sign(null, Buffer.from(canonicalJson(authority)), pair.privateKey).toString("base64"),
  });
  const request = {
    id: `${config.id}-attempt-1`,
    realm: "real-provider",
    packageDigest: plan.packageDigest,
    profileDigest: plan.profileDigest,
    operation: "standard",
    slot: `${config.id}-successor-trial-${config.trial}`,
    attempt: 1,
    retryOf: null,
    memoryMiB: plan.profile.limits.memoryMiB,
    cpus: plan.profile.limits.cpus,
    outputBytes: plan.profile.limits.outputBytes,
    estimatedMicroUsd: null,
  };
  const job = store.reserve(request, authority.id, authorityName, now, 120_000);
  let credentialDirectory;
  try {
    const credential =
      config.target === "codex"
        ? ((credentialDirectory = stageCodexCredential()),
          { codex: { authJsonPath: join(credentialDirectory, "auth.json") } })
        : { claude: { oauthTokenEnvValue: process.env.CLAUDE_CODE_OAUTH_TOKEN } };
    emit({ stage: "dispatching", id: config.id, trial: config.trial, target: config.target });
    const result = await executeRealProvider(
      {
        store,
        package: pkg,
        profile: plan.profile,
        policy: { snapshot: pkg.snapshot, checks: plan.checks },
        request,
        authorization: authority.id,
        owner: authorityName,
        target: config.target,
        instruction,
        credential,
      },
      job,
    );
    const record = join(runRoot, "jobs/real-provider/records", request.id);
    verifyEvidence(record);
    const outcome = {
      id: config.id,
      trial: config.trial,
      target: config.target,
      jobId: result.job.id,
      state: result.job.state,
      outcome: result.job.stages.outcome,
      directory: relative(root, result.directory),
      packageDigest: plan.packageDigest,
      profileDigest: plan.profileDigest,
      completedAt: new Date().toISOString(),
    };
    save(join(runRoot, "outcome.json"), outcome);
    save(join(runRoot, "CAMPAIGN-COMPLETE.json"), {
      at: new Date().toISOString(),
      automaticRetries: 0,
      providerCallsMade: 1,
      outcome,
    });
    emit({ stage: "completed", ...outcome });
  } catch (error) {
    save(join(runRoot, "dispatch-error.json"), {
      id: config.id,
      trial: config.trial,
      at: new Date().toISOString(),
      error: String(error),
      automaticRetries: 0,
      job: store.get(request.id),
    });
    emit({ stage: "dispatch-error", id: config.id, trial: config.trial, error: String(error) });
    throw error;
  } finally {
    if (credentialDirectory) cleanupCredentialStaging(credentialDirectory);
    store.close();
  }
}

if (mode === "prepare") await prepare();
else if (mode === "verify") {
  const { ready } = await verify({ requireUnused: !existsSync(join(runRoot, "DISPATCH-CLAIM")) });
  console.log(
    JSON.stringify({
      verified: true,
      id: config.id,
      trial: config.trial,
      target: config.target,
      sourceDigest: ready.sourceDigest,
      dispatched: existsSync(join(runRoot, "DISPATCH-CLAIM")),
      providerCallsMade: 0,
    }),
  );
} else if (mode === "run") await run();
else throw Error("Mode must be prepare, verify, or run");
