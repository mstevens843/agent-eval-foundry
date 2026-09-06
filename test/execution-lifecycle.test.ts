import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { describe, expect, it } from "vitest";
import {
  publishEvidence,
  reserveDirectory,
  verifyEvidence,
  writeEvidence,
} from "../src/execution/artifacts.js";
import { runInertAuthor } from "../src/execution/authoring.js";
import { type CaptureResult, captureProcess } from "../src/execution/capture.js";
import { executionCommand } from "../src/execution/command.js";
import { type CrashPoint, driveReservedJob } from "../src/execution/execute.js";
import {
  type QualificationEvidence,
  exactProfileProblems,
  profileDigest,
  profileFor,
  qualify,
  unobservedProfile,
} from "../src/execution/profiles.js";
import { type Authorization, type JobRequest, JobStore } from "../src/execution/store.js";
import { preserveExternalPacket } from "../src/external-intake/import.js";
import { type PackagePolicyInput, decidePackage } from "../src/packages/policy.js";
import {
  COMPONENTS,
  type PackageInput,
  buildPackageRecord,
  canonicalJson,
  publishPackage,
  sha256,
} from "../src/packages/record.js";
import { getProvider } from "../src/trials/providers.js";

const temporary = () => mkdtempSync(join(tmpdir(), "foundry-execution-test-"));
const image = `sha256:${"a".repeat(64)}`;
function fixture(overrides: Partial<Authorization> = {}) {
  const root = temporary();
  const snapshot = publishPackage(
    join(root, "packages"),
    buildPackageRecord({
      id: "fixture",
      version: "1",
      kind: "professional-package",
      familyId: "fixture",
      dependencies: { strategy: "explicit-fixture", unresolved: [] },
      files: Object.fromEntries(
        COMPONENTS.map((c) => [c, [{ path: `${c}.txt`, bytes: Buffer.from(c) }]]),
      ) as unknown as PackageInput["files"],
    }),
  );
  const policy: PackagePolicyInput = {
    snapshot,
    checks: {
      reference: true,
      positiveWork: true,
      nearMissControls: true,
      contractReviewed: true,
      unresolvedAmbiguities: 0,
      unrepairedBypasses: 0,
    },
  };
  const p = profileFor("codex", image, "test-only");
  const pair = generateKeyPairSync("ed25519");
  const publicKey = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  const store = new JobStore(join(root, "jobs"), { test: publicKey });
  const now = Date.now();
  const auth: Authorization = {
    schemaVersion: 1,
    id: "test-approval",
    realm: "simulation",
    packageDigest: snapshot.record.digest,
    profileDigest: profileDigest(p),
    operations: ["standard"],
    notBefore: now - 1000,
    expires: now + 100000,
    maxAttempts: 3,
    maxConcurrent: 1,
    maxMicroUsd: 300,
    perAttemptMicroUsd: 100,
    maxMemoryMiB: 4096,
    maxCpuUnits: 4,
    maxOutputBytes: 1000000,
    retryInfrastructure: true,
    ...overrides,
  };
  const envelope = {
    authority: "test",
    payload: auth,
    signature: sign(null, Buffer.from(canonicalJson(auth)), pair.privateKey).toString("base64"),
  };
  const req: JobRequest = {
    id: "run",
    realm: "simulation",
    packageDigest: snapshot.record.digest,
    profileDigest: profileDigest(p),
    operation: "standard",
    slot: "s1",
    attempt: 1,
    retryOf: null,
    memoryMiB: 1024,
    cpus: 1,
    outputBytes: 65536,
    estimatedMicroUsd: null,
  };
  return { root, store, auth, envelope, req, policy, p, publicKey };
}
const capture: CaptureResult = {
  status: "completed",
  exitCode: 0,
  signal: null,
  bytesSeen: 0,
  bytesRetained: 0,
  eventCount: 1,
  stdoutTail: "",
  stderrTail: "",
  milliseconds: 1,
  truncated: false,
  lastUsage: null,
  error: null,
};

describe("versioned target requests and uncertainty", () => {
  it("pins both exact requested efforts without fabricating observations", () => {
    const p = profileFor("codex", image, "fixture");
    expect(p.requested.effort).toBe("xhigh");
    expect(profileFor("claude", image, "fixture").requested.effort).toBe("max");
    expect(exactProfileProblems(p, unobservedProfile("historical-import"))).toContain(
      "unattested-or-mismatched-model",
    );
    expect(profileDigest(p)).not.toBe(
      profileDigest({ ...p, authoring: { ...p.authoring, network: "bridge" } }),
    );
    expect(() => profileDigest({ ...p, requested: { ...p.requested, effort: "max" } })).toThrow(/MISMATCH/);
  });
  it("separates five promising failures, six full failures, and substantive adversarial zeros", () => {
    const profiles = {
      codex: profileFor("codex", image, "fixture"),
      claude: profileFor("claude", image, "fixture"),
    };
    for (const p of Object.values(profiles)) p.adapter.scaffoldVersion = "pinned-fixture-version";
    const records: QualificationEvidence[] = [];
    for (const target of ["codex", "claude"] as const)
      for (let i = 0; i < 4; i++) {
        const p = profiles[target];
        const observed = (value: string) => ({
          value,
          source: "trusted provider receipt fixture",
          status: "observed" as const,
        });
        records.push({
          runId: `${target}-${i}`,
          slot: `${i}`,
          attempt: 1,
          packageDigest: "b".repeat(64),
          profileDigest: profileDigest(p),
          target,
          operation: i === 3 ? "adversarial" : "standard",
          outcome: "semantic-fail",
          adjudication: "capability",
          substantive: true,
          evidenceClass: "real-provider",
          observation: {
            model: observed(p.requested.model),
            effort: observed(p.requested.effort),
            scaffoldVersion: observed("pinned-fixture-version"),
            fallback: false,
            evidenceClass: "real-provider",
          },
        });
      }
    expect(qualify("b".repeat(64), profiles, records).complete).toBe(true);
    expect(
      qualify(
        "b".repeat(64),
        profiles,
        records.filter((r) => r.operation === "standard"),
      ),
    ).toMatchObject({ standardComplete: true, complete: false });
    const retried = structuredClone(records);
    const prior = structuredClone(retried[0] as QualificationEvidence);
    prior.outcome = "invalid-execution";
    const retry = retried[0] as QualificationEvidence;
    retry.runId = "infrastructure-retry";
    retry.attempt = 2;
    retry.retryOf = prior.runId;
    retry.retryReason = "retained transport failure";
    retry.retryAuthorized = true;
    retried.push(prior);
    expect(qualify("b".repeat(64), profiles, retried)).toMatchObject({
      complete: true,
      invalidPriorAttempts: 1,
    });
    prior.outcome = "semantic-pass";
    expect(qualify("b".repeat(64), profiles, retried).complete).toBe(false);
    const first = records[0] as QualificationEvidence;
    first.outcome = "semantic-pass";
    expect(qualify("b".repeat(64), profiles, records)).toMatchObject({
      promising: true,
      complete: false,
      genuineFailures: 5,
    });
    first.evidenceClass = "simulation";
    expect(qualify("b".repeat(64), profiles, records).complete).toBe(false);
    first.evidenceClass = "real-provider";
    first.observation.fallback = true;
    expect(qualify("b".repeat(64), profiles, records).promising).toBe(false);
  });
});
describe("signed reservations and durable ownership", () => {
  it("real authorization uses a signed reserved capability, never a deserialized approval", () => {
    // A throwaway test key is not enrolled by any production store/operator.
    const f = fixture({ realm: "real-provider" });
    try {
      f.store.install(f.envelope);
      const job = f.store.reserve({ ...f.req, realm: "real-provider" }, f.auth.id, "worker");
      const policy: PackagePolicyInput = {
        ...f.policy,
        checks: {
          ...f.policy.checks,
          publicPackageComplete: true,
          protectedGrading: true,
          localIntegrityControls: true,
          boundedSolveEvidence: true,
        },
        authorization: {
          packageDigest: job.packageDigest,
          profile: job.profileDigest,
          operation: "standard",
          execution: "real-provider",
          approval: null,
          reservation: f.store.reservation(job.id, job.fence),
        },
      };
      const authorization = policy.authorization;
      if (!authorization?.reservation) throw Error("fixture reservation missing");
      expect(decidePackage(policy).stages["trial-authorized"].allowed).toBe(true);
      expect(
        decidePackage({
          ...policy,
          authorization: { ...authorization, reservation: { ...authorization.reservation } },
        }).stages["trial-authorized"].allowed,
      ).toBe(false);
      f.store.transition(job.id, job.fence, "dispatching");
      expect(decidePackage(policy).stages["trial-authorized"].allowed).toBe(false);
      expect(f.store.get(job.id).state).toBe("dispatching");
    } finally {
      f.store.close();
    }
  });
  it("exhausted aggregate budget blocks even when concurrency is available", () => {
    const f = fixture({ maxConcurrent: 3, maxMicroUsd: 100 });
    try {
      f.store.install(f.envelope);
      f.store.reserve(f.req, f.auth.id, "one");
      expect(() => f.store.reserve({ ...f.req, id: "two", slot: "s2" }, f.auth.id, "two")).toThrow(
        /BUDGET_EXHAUSTED/,
      );
      expect(f.store.list()).toHaveLength(1);
    } finally {
      f.store.close();
    }
  });
  it("rejects high-level eligibility and package drift without calling dispatch", async () => {
    const f = fixture();
    let dispatches = 0;
    try {
      f.store.install(f.envelope);
      const j = f.store.reserve(f.req, f.auth.id, "w");
      const services = {
        prepare: () => {},
        dispatch: async () => {
          dispatches++;
          return capture;
        },
        grade: async () => ({}),
      };
      await expect(
        driveReservedJob(f.store, j, services, {
          ...f.policy,
          checks: { ...f.policy.checks, reference: false },
        }),
      ).rejects.toThrow(/POLICY_DENIED/);
      const file = f.policy.snapshot?.record.components.contract.files[0];
      if (!file) throw Error("fixture contract missing");
      // Invalidate retained bytes, not metadata: the existing package refresh must reject it.
      const blob = join(f.root, "packages", "blobs", file.sha256);
      chmodSync(blob, 0o600); // Simulated operator corruption of this disposable fixture only.
      writeFileSync(blob, "changed after authorization");
      await expect(driveReservedJob(f.store, j, services, f.policy)).rejects.toThrow(/POLICY_DENIED/);
      expect(dispatches).toBe(0);
      expect(f.store.get(j.id).state).toBe("reserved");
    } finally {
      f.store.close();
    }
  });
  it("two simultaneous independent workers reserve and dispatch a slot only once", async () => {
    const f = fixture();
    try {
      f.store.install(f.envelope);
      const build = join(f.root, "compiled");
      execFileSync(
        "pnpm",
        [
          "exec",
          "tsup",
          "src/execution/store.ts",
          "--out-dir",
          build,
          "--format",
          "esm",
          "--no-dts",
          "--no-sourcemap",
        ],
        { timeout: 30000, stdio: "pipe", maxBuffer: 65536 },
      );
      const gate = new SharedArrayBuffer(4);
      let ready = 0;
      const workers = ["a", "b"].map(
        (owner) =>
          new Promise<{ ok: boolean }>((done, reject) => {
            const worker = new Worker(
              `const {parentPort,workerData:w}=require('node:worker_threads'); (async()=>{const {JobStore}=await import(w.module);const s=new JobStore(w.root);parentPort.postMessage({ready:true});Atomics.wait(new Int32Array(w.gate),0,0);try{const j=s.reserve(w.req,w.auth,w.owner);s.transition(j.id,j.fence,'dispatching');require('node:fs').appendFileSync(w.log,w.owner+'\\n');parentPort.postMessage({ok:true});}catch(e){parentPort.postMessage({ok:false,error:String(e)});}finally{s.close();}})().catch(e=>{throw e});`,
              {
                eval: true,
                workerData: {
                  module: pathToFileURL(join(build, "store.js")).href,
                  root: f.store.root,
                  req: f.req,
                  auth: f.auth.id,
                  owner,
                  gate,
                  log: join(f.root, "dispatch.log"),
                },
              },
            );
            worker.on("error", reject);
            worker.on("message", (message) => {
              if (message.ready) {
                if (++ready === 2) {
                  Atomics.store(new Int32Array(gate), 0, 1);
                  Atomics.notify(new Int32Array(gate), 0, 2);
                }
              } else done(message);
            });
          }),
      );
      const results = await Promise.all(workers);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(readFileSync(join(f.root, "dispatch.log"), "utf8").trim().split("\n")).toHaveLength(1);
      expect(f.store.events("run")).toHaveLength(2);
    } finally {
      f.store.close();
    }
  }, 30000);
  it("resumes a pre-dispatch reservation and freezes its execution plan", () => {
    const f = fixture();
    try {
      f.store.install(f.envelope);
      const j = f.store.reserve(f.req, f.auth.id, "old", Date.now(), 30000);
      f.store.bindPlan(j.id, j.fence, { mode: "correct" });
      const resumed = f.store.claim(j.id, "new", j.leaseUntil + 1, 300000);
      expect(resumed.state).toBe("reserved");
      expect(() => f.store.bindPlan(j.id, resumed.fence, { mode: "incorrect" })).toThrow(/PLAN_DRIFT/);
    } finally {
      f.store.close();
    }
  });
  it.each(["missing", "expired", "wrong-package", "wrong-profile", "wrong-operation", "unknown-authority"])(
    "denies %s before dispatch",
    (kind) => {
      const f = fixture(kind === "expired" ? { expires: Date.now() - 1, notBefore: Date.now() - 2000 } : {});
      try {
        if (kind !== "missing" && kind !== "unknown-authority") f.store.install(f.envelope);
        if (kind === "wrong-package") f.req.packageDigest = "f".repeat(64);
        if (kind === "wrong-profile") f.req.profileDigest = "f".repeat(64);
        if (kind === "wrong-operation") f.req.operation = "adversarial";
        if (kind === "unknown-authority")
          expect(() => f.store.install({ ...f.envelope, authority: "unknown" })).toThrow(/SIGNATURE/);
        expect(() => f.store.reserve(f.req, f.auth.id, "worker")).toThrow(/AUTHORIZATION/);
        expect(f.store.list()).toHaveLength(0);
      } finally {
        f.store.close();
      }
    },
  );
  it("does not price missing usage at zero and refuses concurrency or spending overruns", () => {
    const f = fixture();
    try {
      f.store.install(f.envelope);
      const j = f.store.reserve(f.req, f.auth.id, "a");
      expect(j.estimatedMicroUsd).toBeNull();
      expect(j.settledMicroUsd).toBeNull();
      expect(j.reservedMicroUsd).toBe(100);
      expect(() => f.store.reserve({ ...f.req, id: "run2", slot: "s2" }, f.auth.id, "b")).toThrow(
        /EXHAUSTED/,
      );
      expect(() => f.store.reserve(f.req, f.auth.id, "a")).toThrow(/ID_EXISTS/);
      expect(() => f.store.claim(j.id, "b")).toThrow(/LEASE_BUSY/);
      const other = new JobStore(f.store.root);
      try {
        expect(() => other.reserve({ ...f.req, id: "run3", slot: "s3" }, f.auth.id, "b")).toThrow(
          /EXHAUSTED/,
        );
      } finally {
        other.close();
      }
    } finally {
      f.store.close();
    }
  });
  it("fences expired workers and never resends an uncertain dispatch", () => {
    const f = fixture();
    try {
      f.store.install(f.envelope);
      const j = f.store.reserve(f.req, f.auth.id, "a", Date.now(), 100);
      const next = f.store.claim(j.id, "b", j.leaseUntil + 1, 100);
      expect(() => f.store.transition(j.id, j.fence, "dispatching", {}, j.leaseUntil + 2)).toThrow(/FENCE/);
      f.store.transition(j.id, next.fence, "dispatching", {}, next.leaseUntil - 50);
      expect(f.store.claim(j.id, "c", next.leaseUntil + 1).state).toBe("dispatch-uncertain");
      expect(() => f.store.claim(j.id, "c", next.leaseUntil + 100)).toThrow(/NOT_RESUMABLE/);
      expect(f.store.get(j.id).settledMicroUsd).toBeNull();
      f.store.reconcile(j.id, {
        reason: "operator verified no outcome can be recovered",
        receipt: sha256("fixture receipt"),
        dispatch: "outcome-unavailable",
      });
      expect(f.store.get(j.id).reservedMicroUsd).toBe(100);
    } finally {
      f.store.close();
    }
  });
  it("lower-level dispatch cannot use a fabricated job or old provider adapter", async () => {
    const f = fixture();
    try {
      await expect(
        runInertAuthor(f.store, { ...f.req, id: "missing" } as never, f.p, {
          publicDir: f.root,
          binary: "never",
          directory: f.root,
          mode: "correct",
          native: false,
          overlay: {},
        }),
      ).rejects.toThrow(/MISSING/);
      expect(() =>
        getProvider("shell").run({
          challengeDir: f.root,
          submissionPath: "x",
          instruction: "never",
          timeoutMs: 1,
          env: {},
          command: ["never"],
        }),
      ).toThrow(/AUTHORIZATION_DENIED/);
    } finally {
      f.store.close();
    }
  });
});
describe("restart-safe stage journal", () => {
  it("retains partial preparation as invalid and permits only a new reasoned infrastructure attempt", async () => {
    const f = fixture();
    let dispatches = 0;
    try {
      f.store.install(f.envelope);
      const j = f.store.reserve(f.req, f.auth.id, "w");
      await expect(
        driveReservedJob(
          f.store,
          j,
          {
            prepare: (stage) => {
              writeEvidence(join(stage, "partial.json"), { partial: true });
              throw Error("fixture preparation interruption");
            },
            dispatch: async () => {
              dispatches++;
              return capture;
            },
            grade: async () => ({}),
          },
          f.policy,
        ),
      ).rejects.toThrow(/preparation interruption/);
      const invalid = f.store.get(j.id);
      expect(invalid).toMatchObject({
        state: "cancelled",
        settledMicroUsd: 0,
        stages: { outcome: "invalid-execution" },
      });
      expect(existsSync(join(String(invalid.stages.incompleteDirectory), "partial.json"))).toBe(true);
      expect(dispatches).toBe(0);
      expect(() =>
        f.store.reserve({ ...f.req, id: "retry", attempt: 2, retryOf: j.id }, f.auth.id, "w"),
      ).toThrow(/RETRY_DENIED/);
      const retry = f.store.reserve(
        { ...f.req, id: "retry", attempt: 2, retryOf: j.id, retryReason: "retained preparation error" },
        f.auth.id,
        "w",
      );
      expect(retry.retryOf).toBe(j.id);
    } finally {
      f.store.close();
    }
  });
  it.each(["dispatch", "capture", "grading", "publication"] as CrashPoint[])(
    "survives a worker interruption after %s",
    async (point) => {
      const f = fixture();
      let dispatched = 0;
      let graded = 0;
      try {
        f.store.install(f.envelope);
        const j = f.store.reserve(f.req, f.auth.id, "a");
        const services = {
          prepare: (s: string) => writeEvidence(join(s, "public.json"), { public: true }),
          dispatch: async () => {
            dispatched++;
            return capture;
          },
          grade: async () => {
            graded++;
            return { evaluation: { complete: true, status: "semantic-fail" } };
          },
        };
        await expect(driveReservedJob(f.store, j, services, f.policy, point)).rejects.toThrow(
          /SIMULATED_WORKER_CRASH/,
        );
        const current = f.store.get(j.id);
        const resumed = f.store.claim(j.id, "b", current.leaseUntil + 1, 300000);
        if (point === "dispatch") {
          expect(resumed.state).toBe("dispatch-uncertain");
          expect(dispatched).toBe(0);
          await expect(driveReservedJob(f.store, resumed, services, f.policy)).rejects.toThrow(
            /RECONCILIATION/,
          );
        } else {
          const out = await driveReservedJob(f.store, resumed, services, f.policy);
          expect(out.job.state).toBe("completed");
          expect(dispatched).toBe(1);
          expect(graded).toBe(1);
          const result = JSON.parse(readFileSync(join(out.directory, "result.json"), "utf8"));
          expect(result).toMatchObject({
            outcome: "semantic-fail",
            countsAsModelFailure: false,
            evidenceClass: "simulation",
          });
          const before = canonicalJson(verifyEvidence(out.directory));
          await driveReservedJob(f.store, out.job, services, f.policy);
          expect(canonicalJson(verifyEvidence(out.directory))).toBe(before);
          expect(dispatched).toBe(1);
        }
      } finally {
        f.store.close();
      }
    },
  );
  it("does not retry semantic failures to seek a preferred outcome", async () => {
    const f = fixture();
    try {
      f.store.install(f.envelope);
      const j = f.store.reserve(f.req, f.auth.id, "w");
      await driveReservedJob(
        f.store,
        j,
        {
          prepare: () => {},
          dispatch: async () => capture,
          grade: async () => ({ evaluation: { complete: true, status: "semantic-fail" } }),
        },
        f.policy,
      );
      expect(() =>
        f.store.reserve({ ...f.req, id: "again", attempt: 2, retryOf: j.id }, f.auth.id, "w"),
      ).toThrow(/RETRY_DENIED/);
    } finally {
      f.store.close();
    }
  });
});
describe("bounded captures and immutable files", () => {
  it("preserves external packets immutably without interpreting metadata paths", () => {
    const root = temporary();
    const packet = temporary();
    writeFileSync(join(packet, "transcript.txt"), "original");
    const validation = { packet: { metadata: { runId: "received" } }, countable: false } as never;
    const published = preserveExternalPacket(root, packet, validation);
    expect(verifyEvidence(published).complete).toBe(true);
    writeFileSync(join(packet, "transcript.txt"), "replacement");
    expect(() => preserveExternalPacket(root, packet, validation)).toThrow(/ALREADY_PUBLISHED/);
    expect(readFileSync(join(published, "packet/transcript.txt"), "utf8")).toBe("original");
    const invalid = preserveExternalPacket(root, packet, {
      packet: { metadata: { runId: "../../escape" } },
      countable: false,
    } as never);
    expect(invalid.startsWith(join(root, "external-intake/received/invalid-"))).toBe(true);
  });
  it.each(["stdout", "stderr"])(
    "bounds oversized %s without retaining a whole transcript",
    async (stream) => {
      const dir = temporary();
      const r = await captureProcess(
        process.execPath,
        ["-e", `process.${stream}.write('x'.repeat(2000000))`],
        { directory: dir, timeoutMs: 5000, maxBytes: 16384, env: {} },
      );
      expect(r.status).toBe("output-limit");
      expect(r.bytesRetained).toBeLessThanOrEqual(16384);
      expect(r.truncated).toBe(true);
      expect(r.stdoutTail.length).toBeLessThanOrEqual(4096);
    },
  );
  it("keeps usage even when a later event is malformed", async () => {
    const r = await captureProcess(
      process.execPath,
      ["-e", "console.log(JSON.stringify({type:'usage',usage:{tokens:7}})); console.log('broken')"],
      { directory: temporary(), timeoutMs: 5000, maxBytes: 16384, env: {}, jsonEvents: true },
    );
    expect(r.status).toBe("malformed-events");
    expect(r.lastUsage).toEqual({ tokens: 7 });
  });
  it("bounds hangs, explicitly cancels, and reaps a task-owned child", async () => {
    const r = await captureProcess(
      process.execPath,
      [
        "-e",
        "require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},100)'],{stdio:'inherit'});setInterval(()=>{},100)",
      ],
      { directory: temporary(), timeoutMs: 150, maxBytes: 16384, env: {} },
    );
    expect(r.status).toBe("timeout");
    expect(r.milliseconds).toBeLessThan(5000);
    const controller = new AbortController();
    controller.abort();
    const c = await captureProcess(process.execPath, ["-e", "setInterval(()=>{},100)"], {
      directory: temporary(),
      timeoutMs: 5000,
      maxBytes: 16384,
      env: {},
      signal: controller.signal,
    });
    expect(c.status).toBe("cancelled");
  });
  it("refuses duplicate IDs and traversal; detects edited published bytes", () => {
    const root = temporary();
    const r = reserveDirectory(root, "one");
    writeEvidence(join(r.stage, "result.json"), { ok: true });
    publishEvidence(r.stage, r.destination, { id: "one" });
    expect(verifyEvidence(r.destination).complete).toBe(true);
    expect(() => reserveDirectory(root, "one")).toThrow();
    expect(() => reserveDirectory(root, "../escape")).toThrow();
    writeFileSync(join(r.destination, "result.json"), "changed");
    expect(() => verifyEvidence(r.destination)).toThrow(/CONTENT_MISMATCH/);
  });
  it("read-only CLI inspection does not dispatch or modify the database", async () => {
    const f = fixture();
    f.store.install(f.envelope);
    f.store.reserve(f.req, f.auth.id, "w");
    f.store.close();
    const path = join(f.root, "jobs/execution.sqlite");
    const before = readFileSync(path);
    expect(await executionCommand(f.root, ["inspect", join(f.root, "jobs")])).toHaveLength(1);
    expect(readFileSync(path).equals(before)).toBe(true);
    expect(readdirSync(join(f.root, "jobs"))).toEqual(["execution.sqlite"]);
  });
});
