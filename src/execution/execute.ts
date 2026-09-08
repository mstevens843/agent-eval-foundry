import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type PackagePolicyInput, assertPackageStage } from "../packages/policy.js";
import { canonicalJson, refreshSnapshot, sha256 } from "../packages/record.js";
import { publishEvidence, verifyEvidence, writeEvidence } from "./artifacts.js";
import { type SimulationMode, runInertAuthor } from "./authoring.js";
import type { CaptureResult } from "./capture.js";
import {
  type ExecutionPackage,
  gradeExecutionPackage,
  prepareExecutionPackage,
  simulationOverlay,
} from "./package-route.js";
import { type ExecutionProfile, profileDigest, unobservedProfile } from "./profiles.js";
import type { Job, JobRequest, JobStore } from "./store.js";

export type CrashPoint = "reservation" | "dispatch" | "capture" | "grading" | "publication";
export interface ExecutionContext {
  store: JobStore;
  package: ExecutionPackage;
  profile: ExecutionProfile;
  policy: PackagePolicyInput;
  request: JobRequest;
  authorization: string;
  owner: string;
  binary: string;
  mode: SimulationMode;
  signal?: AbortSignal;
  toolURL?: string;
  crashAfter?: CrashPoint;
}
/** Host-configured adapter boundary. No caller flag unlocks historical shell/provider runners.
 * Future real adapters must supply controlled capture through this same reservation lifecycle. */
export interface ReservedExecutionServices {
  dispatch: (job: Job, stage: string) => Promise<CaptureResult>;
  grade: (stage: string) => Promise<unknown>;
  prepare: (stage: string) => void;
}
function failpoint(point: CrashPoint, requested?: CrashPoint) {
  if (point === requested) throw Error(`SIMULATED_WORKER_CRASH:${point}`);
}
declare const __FOUNDRY_AUTHORITY_SOURCE_DIGEST__: string;
export const executionSourceIdentity = () =>
  typeof __FOUNDRY_AUTHORITY_SOURCE_DIGEST__ === "undefined"
    ? "unbundled-local-test"
    : __FOUNDRY_AUTHORITY_SOURCE_DIGEST__;
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

/** No launch is retried here. Resume consumes immutable completed stage receipts only. */
export async function driveReservedJob(
  store: JobStore,
  initial: Job,
  services: ReservedExecutionServices,
  policy: PackagePolicyInput,
  crashAfter?: CrashPoint,
) {
  let job = store.get(initial.id);
  const decision = assertPackageStage(policy, job.realm === "simulation" ? "local-valid" : "trial-eligible");
  if (decision.packageDigest !== job.packageDigest) throw Error("EXECUTION_ELIGIBILITY_BINDING");
  if (job.realm === "real-provider" && job.state === "reserved")
    assertPackageStage(
      {
        ...policy,
        authorization: {
          packageDigest: job.packageDigest,
          profile: job.profileDigest,
          operation: job.operation,
          approval: null,
          execution: "real-provider",
          reservation: store.reservation(job.id, job.fence),
        },
      },
      "trial-authorized",
    );
  if (job.stages.executorDigest && job.stages.executorDigest !== executionSourceIdentity())
    throw Error("EXECUTION_EXECUTOR_VERSION_DRIFT");
  if (job.fence !== initial.fence || job.state === "dispatch-uncertain" || job.state === "dispatching")
    throw Error("EXECUTION_RESUME_REQUIRES_RECONCILIATION");
  const root = join(store.root, job.realm);
  const stage = join(root, ".incomplete", job.id);
  const destination = join(root, "records", job.id);
  if (job.state === "completed") {
    verifyEvidence(destination);
    return { job, directory: destination };
  }
  const reservation = {
    id: job.id,
    packageDigest: job.packageDigest,
    profileDigest: job.profileDigest,
    realm: job.realm,
  };
  const identity = {
    ...reservation,
    evidenceClass: job.realm,
    modelEvidenceEligible: false,
    executionSourceDigest: executionSourceIdentity(),
  };
  if (job.state === "publishing" && existsSync(destination)) {
    /* finish the committed publication below */
  } else if (!existsSync(stage)) {
    mkdirSync(stage, { recursive: true, mode: 0o700 });
    writeEvidence(join(stage, "reservation.json"), reservation);
  } else if (canonicalJson(read(join(stage, "reservation.json"))) !== canonicalJson(reservation))
    throw Error("EXECUTION_STAGE_OWNER_MISMATCH");
  // A killed worker's stale continuation cannot advance a new owner's fenced lease.
  const heartbeat = setInterval(() => {
    try {
      store.heartbeat(job.id, job.fence);
    } catch {
      /* next transition fails closed */
    }
  }, 5000);
  try {
    if (job.state === "reserved") {
      if (!existsSync(join(stage, "prepared.json"))) {
        if (!existsSync(join(stage, "authorization.json")))
          writeEvidence(join(stage, "authorization.json"), store.authorizationEvidence(job.authorization));
        try {
          services.prepare(stage);
        } catch (error) {
          // Dispatch has not begun. Retain partial files and a terminal invalid job;
          // an explicitly authorized retry owns a new attempt, not this directory.
          store.account(job.id, job.fence, null, 0, "preparation-failed-before-dispatch");
          store.transition(job.id, job.fence, "cancelled", {
            outcome: "invalid-execution",
            preparationError: String(error),
            incompleteDirectory: stage,
          });
          throw error;
        }
        writeEvidence(join(stage, "prepared.json"), identity);
      }
      job = store.transition(job.id, job.fence, "dispatching", { executorDigest: executionSourceIdentity() });
      failpoint("dispatch", crashAfter);
      let captured: CaptureResult;
      try {
        captured = await services.dispatch(job, stage);
      } catch (error) {
        // After dispatch entry, absence of a result cannot prove absence of external spend.
        store.transition(job.id, job.fence, "dispatch-uncertain", { dispatchError: String(error) });
        throw error;
      }
      writeEvidence(join(stage, "capture.json"), captured);
      store.account(
        job.id,
        job.fence,
        captured.lastUsage,
        job.realm === "simulation" ? 0 : null,
        job.realm === "simulation" ? "inert-local-adapter" : "provider-capture-cost-unavailable",
      );
      job = store.transition(job.id, job.fence, "captured", { capture: "capture.json" });
      failpoint("capture", crashAfter);
    }
    if (job.state === "captured") {
      const capture = read<CaptureResult>(join(stage, "capture.json"));
      let grade: unknown = { error: "authoring did not complete", captureStatus: capture.status };
      if (existsSync(join(stage, "grade.json"))) grade = read(join(stage, "grade.json"));
      else {
        if (capture.status === "completed") {
          try {
            grade = await services.grade(stage);
          } catch (error) {
            grade = { error: String(error), stage: "grading", classification: "invalid-execution" };
          }
        }
        writeEvidence(join(stage, "grade.json"), grade);
      }
      const graded = grade as {
        evaluation?: { complete?: boolean; status?: string };
        checkerRequired?: boolean;
        checkerPassed?: boolean | null;
      };
      const evaluation = graded.evaluation;
      // A checker-required package demands both a correct repair AND a submitted checker that
      // genuinely discriminates the reference from its mutant bank. `evaluation.status` stays an
      // honest, unmutated fact about the entry.mjs alone; the trial's recorded outcome — the field
      // package-eligibility policy actually counts — must fail here too, or the checker
      // requirement is invisible to every downstream consumer that reads `outcome` instead of the
      // raw grade record.
      const checkerSatisfied = !graded.checkerRequired || graded.checkerPassed === true;
      const outcome =
        capture.status === "completed" &&
        evaluation?.complete === true &&
        ["semantic-pass", "semantic-fail"].includes(evaluation.status ?? "")
          ? evaluation.status === "semantic-pass" && !checkerSatisfied
            ? "semantic-fail"
            : evaluation.status
          : "invalid-execution";
      job = store.transition(job.id, job.fence, "graded", { grade: "grade.json", outcome });
      failpoint("grading", crashAfter);
    }
    if (job.state === "graded") {
      if (!existsSync(join(stage, "result.json")))
        writeEvidence(join(stage, "result.json"), {
          schemaVersion: 1,
          ...identity,
          slot: job.slot,
          attempt: job.attempt,
          retryOf: job.retryOf,
          retryReason: job.retryReason ?? null,
          operation: job.operation,
          outcome: job.stages.outcome,
          countsAsModelFailure: false,
          adjudication: "unlabelled",
          observation: unobservedProfile(job.realm),
          usage: job.usage,
          accounting: {
            estimatedMicroUsd: job.estimatedMicroUsd,
            reservedMicroUsd: job.reservedMicroUsd,
            settledMicroUsd: job.settledMicroUsd,
            kind: job.realm === "simulation" ? "simulated" : "provider",
            billingMode:
              (
                store.authorizationEvidence(job.authorization) as {
                  payload: { billingMode?: string };
                }
              ).payload.billingMode ?? "metered",
          },
        });
      job = store.transition(job.id, job.fence, "publishing");
    }
    if (job.state === "publishing") {
      if (existsSync(destination)) {
        const existing = verifyEvidence(destination);
        if (canonicalJson(existing.identity) !== canonicalJson(identity))
          throw Error("EXECUTION_PUBLISHED_IDENTITY_MISMATCH");
      } else {
        if (!existsSync(join(stage, "execution-events.json")))
          writeEvidence(join(stage, "execution-events.json"), store.events(job.id));
        publishEvidence(stage, destination, identity);
      }
      failpoint("publication", crashAfter);
      job = store.transition(job.id, job.fence, "completed", { directory: destination });
    }
    return { job, directory: destination };
  } finally {
    clearInterval(heartbeat);
  }
}

export async function executeSimulation(context: ExecutionContext, resume?: Job) {
  const { store, package: pkg, profile, request } = context;
  refreshSnapshot(pkg.snapshot);
  if (
    request.realm !== "simulation" ||
    request.packageDigest !== pkg.snapshot.record.digest ||
    request.profileDigest !== profileDigest(profile) ||
    profile.gradingRoute !== pkg.route ||
    profile.authoring.image !== pkg.image ||
    request.memoryMiB !== profile.limits.memoryMiB ||
    request.cpus !== profile.limits.cpus ||
    request.outputBytes !== profile.limits.outputBytes
  )
    throw Error("EXECUTION_PACKAGE_PROFILE_MISMATCH");
  // Local simulations may exercise locally valid packages without inventing a human solve.
  assertPackageStage(
    { ...context.policy, snapshot: pkg.snapshot, expectedFamilyId: pkg.snapshot.record.familyId },
    "local-valid",
  );
  let job = resume ?? store.reserve(request, context.authorization, context.owner);
  if (
    job.id !== request.id ||
    job.packageDigest !== request.packageDigest ||
    job.profileDigest !== request.profileDigest ||
    job.realm !== "simulation"
  )
    throw Error("EXECUTION_RESUME_BINDING");
  job = store.bindPlan(job.id, job.fence, {
    profile,
    mode: context.mode,
    binarySha256: sha256(readFileSync(context.binary)),
    toolURL: context.toolURL ?? null,
  });
  failpoint("reservation", context.crashAfter);
  return driveReservedJob(
    store,
    job,
    {
      prepare: (stage) => {
        prepareExecutionPackage(pkg, stage);
        writeEvidence(join(stage, "profile.json"), profile);
        writeEvidence(join(stage, "adapter.json"), {
          id: "inert-fixture-v1",
          mode: context.mode,
          binarySha256: sha256(readFileSync(context.binary)),
          observation: unobservedProfile("simulation"),
        });
      },
      dispatch: (current, stage) =>
        runInertAuthor(store, current, profile, {
          publicDir: join(stage, "public"),
          directory: stage,
          binary: context.binary,
          mode: context.mode,
          native: pkg.native,
          overlay:
            context.mode === "correct" ||
            context.mode === "missing-file" ||
            (pkg.native && context.mode === "incorrect")
              ? simulationOverlay(pkg, context.mode === "incorrect")
              : {},
          ...(context.signal ? { signal: context.signal } : {}),
          ...(context.toolURL ? { toolURL: context.toolURL } : {}),
        }),
      grade: (stage) => gradeExecutionPackage(pkg, join(stage, "submission"), join(stage, "grading")),
    },
    context.policy,
    context.crashAfter,
  );
}
