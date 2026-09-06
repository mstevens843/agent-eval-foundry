import { createPublicKey, randomUUID, verify } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { canonicalJson, sha256 } from "../packages/record.js";

export type Operation = "standard" | "adversarial";
export type JobState =
  | "reserved"
  | "dispatching"
  | "dispatch-uncertain"
  | "captured"
  | "graded"
  | "publishing"
  | "completed"
  | "cancelled";
export interface Authorization {
  schemaVersion: 1;
  id: string;
  realm: "simulation" | "real-provider";
  packageDigest: string;
  profileDigest: string;
  operations: Operation[];
  notBefore: number;
  expires: number;
  maxAttempts: number;
  maxConcurrent: number;
  maxMicroUsd: number;
  perAttemptMicroUsd: number;
  maxMemoryMiB: number;
  maxCpuUnits: number;
  maxOutputBytes: number;
  retryInfrastructure: boolean;
}
export interface SignedAuthorization {
  authority: string;
  payload: Authorization;
  signature: string;
}
export interface JobRequest {
  id: string;
  packageDigest: string;
  profileDigest: string;
  operation: Operation;
  slot: string;
  attempt: number;
  retryOf: string | null;
  retryReason?: string;
  realm: Authorization["realm"];
  memoryMiB: number;
  cpus: number;
  outputBytes: number;
  estimatedMicroUsd: number | null;
}
export interface Job extends JobRequest {
  authorization: string;
  state: JobState;
  owner: string;
  fence: string;
  leaseUntil: number;
  reservedMicroUsd: number;
  settledMicroUsd: number | null;
  usage: unknown;
  stages: Record<string, unknown>;
  created: number;
  updated: number;
}
export const safeId = (id: string): string => {
  if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(id))
    throw Error("EXECUTION_INVALID_ID");
  return id;
};
export const positive = (n: number): boolean => Number.isSafeInteger(n) && n > 0;
const hash = (s: string) => typeof s === "string" && /^[a-f0-9]{64}$/.test(s);
const terminal = (state: JobState) => state === "completed" || state === "cancelled";
const parse = <T>(row: unknown): T => JSON.parse((row as { body: string }).body) as T;
export interface ReservedAuthority {
  readonly id: string;
  readonly packageDigest: string;
  readonly profile: string;
  readonly operation: Operation;
  readonly realm: Authorization["realm"];
}
const reservations = new WeakMap<object, () => boolean>();
export const isActiveReservedAuthority = (
  value: ReservedAuthority | undefined,
): value is ReservedAuthority => {
  if (!value) return false;
  try {
    return reservations.get(value)?.() === true;
  } catch {
    return false;
  }
};

/** One host, SQLite transactions, FULL fsync, no auto-stealing an uncertain external dispatch.
 * Only the execution feature needs Node >=22.13. Pure/report APIs remain Node 20 compatible. */
export class JobStore {
  readonly root: string;
  private readonly db: DatabaseSync;
  constructor(
    root: string,
    private readonly authorities: Readonly<Record<string, string>> = {},
    readonly readOnly = false,
  ) {
    this.root = resolve(root);
    if (!readOnly) mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const file = join(this.root, "execution.sqlite");
    if (
      lstatSync(this.root).isSymbolicLink() ||
      !lstatSync(this.root).isDirectory() ||
      (existsSync(file) &&
        (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink() || lstatSync(file).nlink !== 1))
    )
      throw Error("EXECUTION_STORE_FILE_TYPE");
    if (readOnly && !existsSync(file)) throw Error("EXECUTION_STORE_MISSING");
    const require = createRequire(join(this.root, "package.json"));
    let Constructor: typeof DatabaseSync;
    try {
      Constructor = (require("node:sqlite") as typeof import("node:sqlite")).DatabaseSync;
    } catch {
      throw Error("EXECUTION_REQUIRES_NODE_22_13_OR_NEWER");
    }
    this.db = new Constructor(file, { readOnly });
    this.db.exec("PRAGMA busy_timeout=5000;");
    if (!readOnly) {
      chmodSync(file, 0o600);
      this.db.exec(
        "PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS authorities (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, slot_key TEXT UNIQUE NOT NULL, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY, job TEXT NOT NULL, body TEXT NOT NULL);",
      );
      // Expression indexes keep reservation work scoped to an authorization/slot, rather than
      // repeatedly parsing every historical job as the portfolio grows.
      this.db.exec(
        "CREATE INDEX IF NOT EXISTS jobs_authorization ON jobs(json_extract(body,'$.authorization')); CREATE INDEX IF NOT EXISTS jobs_slot ON jobs(json_extract(body,'$.packageDigest'),json_extract(body,'$.profileDigest'),json_extract(body,'$.operation'),json_extract(body,'$.slot'),json_extract(body,'$.realm')); CREATE INDEX IF NOT EXISTS events_job ON events(job,seq);",
      );
    }
  }
  close() {
    this.db.close();
  }
  reservation(id: string, fence: string): ReservedAuthority {
    const job = this.get(id);
    const receipt = Object.freeze({
      id: job.id,
      packageDigest: job.packageDigest,
      profile: job.profileDigest,
      operation: job.operation,
      realm: job.realm,
    });
    reservations.set(receipt, () => {
      const now = Date.now();
      const current = this.get(id);
      const authority = this.authority(current.authorization, now);
      return (
        current.fence === fence &&
        current.state === "reserved" &&
        now < current.leaseUntil &&
        authority.realm === current.realm &&
        authority.packageDigest === current.packageDigest &&
        authority.profileDigest === current.profileDigest &&
        authority.operations.includes(current.operation)
      );
    });
    if (!isActiveReservedAuthority(receipt)) throw Error("AUTHORIZATION_RESERVATION_INACTIVE");
    return receipt;
  }
  private transaction<T>(fn: () => T): T {
    if (this.readOnly) throw Error("EXECUTION_READ_ONLY");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private event(id: string, type: string, detail: unknown, now: number) {
    const body = canonicalJson({ type, detail, time: now });
    if (Buffer.byteLength(body) > 65536) throw Error("EXECUTION_EVENT_LIMIT");
    this.db.prepare("INSERT INTO events(job,body) VALUES (?,?)").run(id, body);
  }
  private save(job: Job) {
    this.db.prepare("UPDATE jobs SET body=? WHERE id=?").run(canonicalJson(job), job.id);
  }
  get(id: string): Job {
    safeId(id);
    const r = this.db.prepare("SELECT body FROM jobs WHERE id=?").get(id);
    if (!r) throw Error("EXECUTION_JOB_MISSING");
    return parse<Job>(r);
  }
  list(): Job[] {
    return this.db
      .prepare("SELECT body FROM jobs ORDER BY id")
      .all()
      .map((r) => parse<Job>(r));
  }
  events(id: string): unknown[] {
    safeId(id);
    return this.db
      .prepare("SELECT body FROM events WHERE job=? ORDER BY seq")
      .all(id)
      .map((r) => parse<unknown>(r));
  }
  install(envelope: SignedAuthorization): string {
    const a = envelope.payload;
    safeId(a.id);
    const key = this.authorities[envelope.authority];
    if (
      !key ||
      !verify(
        null,
        Buffer.from(canonicalJson(a)),
        createPublicKey(key),
        Buffer.from(envelope.signature, "base64"),
      )
    )
      throw Error("AUTHORIZATION_SIGNATURE");
    if (
      a.schemaVersion !== 1 ||
      !["real-provider", "simulation"].includes(a.realm) ||
      !hash(a.packageDigest) ||
      !hash(a.profileDigest) ||
      !a.operations.length ||
      a.operations.some((op) => !["standard", "adversarial"].includes(op)) ||
      a.expires <= a.notBefore ||
      !positive(a.notBefore) ||
      !positive(a.expires) ||
      ![
        a.maxAttempts,
        a.maxConcurrent,
        a.maxMicroUsd,
        a.perAttemptMicroUsd,
        a.maxMemoryMiB,
        a.maxCpuUnits,
        a.maxOutputBytes,
      ].every(positive) ||
      a.perAttemptMicroUsd > a.maxMicroUsd ||
      typeof a.retryInfrastructure !== "boolean"
    )
      throw Error("AUTHORIZATION_SCHEMA");
    return this.transaction(() => {
      const body = canonicalJson({
        ...envelope,
        verifiedPublicKey: createPublicKey(key).export({ type: "spki", format: "pem" }).toString(),
      });
      const existing = this.db.prepare("SELECT body FROM authorities WHERE id=?").get(a.id) as
        | { body: string }
        | undefined;
      if (existing && existing.body !== body) throw Error("AUTHORIZATION_IMMUTABLE");
      if (!existing) this.db.prepare("INSERT INTO authorities VALUES (?,?)").run(a.id, body);
      return a.id;
    });
  }
  private authority(id: string, now: number): Authorization {
    const row = this.db.prepare("SELECT body FROM authorities WHERE id=?").get(id);
    if (!row) throw Error("AUTHORIZATION_MISSING");
    const a = parse<SignedAuthorization>(row).payload;
    if (now < a.notBefore || now >= a.expires) throw Error("AUTHORIZATION_EXPIRED_OR_NOT_YET_VALID");
    return a;
  }
  authorizationEvidence(id: string): unknown {
    const row = this.db.prepare("SELECT body FROM authorities WHERE id=?").get(id);
    if (!row) throw Error("AUTHORIZATION_MISSING");
    return parse<unknown>(row);
  }
  reserve(request: JobRequest, authorization: string, owner: string, now = Date.now(), leaseMs = 30000): Job {
    for (const id of [request.id, request.slot, owner, authorization]) safeId(id);
    if (
      !hash(request.packageDigest) ||
      !hash(request.profileDigest) ||
      !positive(request.attempt) ||
      ![request.memoryMiB, request.cpus, request.outputBytes, leaseMs].every(positive) ||
      (request.estimatedMicroUsd !== null &&
        (!Number.isSafeInteger(request.estimatedMicroUsd) || request.estimatedMicroUsd < 0))
    )
      throw Error("EXECUTION_REQUEST_INVALID");
    return this.transaction(() => {
      const a = this.authority(authorization, now);
      if (
        a.realm !== request.realm ||
        a.packageDigest !== request.packageDigest ||
        a.profileDigest !== request.profileDigest ||
        !a.operations.includes(request.operation)
      )
        throw Error("AUTHORIZATION_BINDING_MISMATCH");
      if (this.db.prepare("SELECT id FROM jobs WHERE id=?").get(request.id))
        throw Error("EXECUTION_ID_EXISTS");
      const slot = this.db
        .prepare(
          "SELECT body FROM jobs WHERE json_extract(body,'$.packageDigest')=? AND json_extract(body,'$.profileDigest')=? AND json_extract(body,'$.operation')=? AND json_extract(body,'$.slot')=? AND json_extract(body,'$.realm')=?",
        )
        .all(request.packageDigest, request.profileDigest, request.operation, request.slot, request.realm)
        .map((r) => parse<Job>(r));
      if (request.attempt !== slot.length + 1) throw Error("EXECUTION_ATTEMPT_ORDER");
      if (slot.length) {
        const prior = slot.sort((a, b) => b.attempt - a.attempt)[0] as Job;
        if (
          !a.retryInfrastructure ||
          !request.retryReason?.trim() ||
          request.retryReason.length > 4096 ||
          request.retryOf !== prior.id ||
          !terminal(prior.state) ||
          prior.stages.outcome !== "invalid-execution"
        )
          throw Error("EXECUTION_RETRY_DENIED");
      } else if (request.retryOf !== null) throw Error("EXECUTION_RETRY_LINEAGE");
      const used = this.db
        .prepare(
          "SELECT count(*) AS attempts, coalesce(sum(coalesce(json_extract(body,'$.settledMicroUsd'),json_extract(body,'$.reservedMicroUsd'))),0) AS committed FROM jobs WHERE json_extract(body,'$.authorization')=?",
        )
        .get(authorization) as { attempts: number; committed: number };
      const active = this.db
        .prepare(
          "SELECT count(*) AS count,coalesce(sum(json_extract(body,'$.memoryMiB')),0) AS memory,coalesce(sum(json_extract(body,'$.cpus')),0) AS cpus,coalesce(sum(json_extract(body,'$.outputBytes')),0) AS output FROM jobs WHERE json_extract(body,'$.authorization')=? AND json_extract(body,'$.state') NOT IN ('completed','cancelled')",
        )
        .get(authorization) as { count: number; memory: number; cpus: number; output: number };
      if (
        used.attempts >= a.maxAttempts ||
        active.count >= a.maxConcurrent ||
        used.committed + a.perAttemptMicroUsd > a.maxMicroUsd ||
        active.memory + request.memoryMiB > a.maxMemoryMiB ||
        active.cpus + request.cpus > a.maxCpuUnits ||
        active.output + request.outputBytes > a.maxOutputBytes ||
        (request.estimatedMicroUsd ?? 0) > a.perAttemptMicroUsd
      )
        throw Error("AUTHORIZATION_BUDGET_EXHAUSTED");
      const job: Job = {
        ...request,
        authorization,
        state: "reserved",
        owner,
        fence: randomUUID(),
        leaseUntil: now + leaseMs,
        reservedMicroUsd: a.perAttemptMicroUsd,
        settledMicroUsd: null,
        usage: null,
        stages: {},
        created: now,
        updated: now,
      };
      const key = sha256(
        canonicalJson([
          request.realm,
          request.packageDigest,
          request.profileDigest,
          request.operation,
          request.slot,
          request.attempt,
        ]),
      );
      this.db.prepare("INSERT INTO jobs VALUES (?,?,?)").run(job.id, key, canonicalJson(job));
      this.event(
        job.id,
        "reserved",
        { authorization, estimate: request.estimatedMicroUsd, reservation: a.perAttemptMicroUsd },
        now,
      );
      return job;
    });
  }
  /** Reacquiring a lease never authorizes a second launch. Dispatching expires into uncertainty. */
  bindPlan(id: string, fence: string, plan: Record<string, unknown>) {
    return this.transaction(() => {
      const j = this.get(id);
      if (j.fence !== fence || (j.state !== "completed" && Date.now() >= j.leaseUntil))
        throw Error("EXECUTION_FENCE_OR_LEASE");
      if (j.stages.plan) {
        if (canonicalJson(j.stages.plan) !== canonicalJson(plan)) throw Error("EXECUTION_PLAN_DRIFT");
        return j;
      }
      if (j.state !== "reserved") throw Error("EXECUTION_PLAN_MISSING");
      j.stages.plan = plan;
      this.save(j);
      this.event(id, "plan-bound", plan, Date.now());
      return j;
    });
  }
  claim(id: string, owner: string, now = Date.now(), leaseMs = 30000): Job {
    safeId(owner);
    if (!positive(leaseMs)) throw Error("EXECUTION_LEASE_INVALID");
    return this.transaction(() => {
      const job = this.get(id);
      if (terminal(job.state) || job.state === "dispatch-uncertain") throw Error("EXECUTION_NOT_RESUMABLE");
      if (now < job.leaseUntil) throw Error("EXECUTION_LEASE_BUSY");
      if (job.state === "dispatching") {
        job.state = "dispatch-uncertain";
        job.updated = now;
        this.save(job);
        this.event(id, "dispatch-uncertain", null, now);
        return job;
      }
      job.owner = owner;
      job.fence = randomUUID();
      job.leaseUntil = now + leaseMs;
      job.updated = now;
      this.save(job);
      this.event(id, "lease-claimed", { owner }, now);
      return job;
    });
  }
  transition(
    id: string,
    fence: string,
    next: JobState,
    detail: Record<string, unknown> = {},
    now = Date.now(),
  ): Job {
    return this.transaction(() => {
      const job = this.get(id);
      if (job.fence !== fence || now >= job.leaseUntil) throw Error("EXECUTION_FENCE_OR_LEASE");
      const allowed: Partial<Record<JobState, JobState[]>> = {
        reserved: ["dispatching", "cancelled"],
        dispatching: ["captured", "dispatch-uncertain"],
        captured: ["graded"],
        graded: ["publishing"],
        publishing: ["completed"],
      };
      if (!allowed[job.state]?.includes(next)) throw Error(`EXECUTION_TRANSITION:${job.state}->${next}`);
      if (next === "dispatching") this.authority(job.authorization, now);
      job.state = next;
      job.updated = now;
      job.stages = { ...job.stages, ...detail };
      this.event(id, next, detail, now);
      this.save(job);
      return job;
    });
  }
  heartbeat(id: string, fence: string, now = Date.now(), leaseMs = 30000) {
    if (!positive(leaseMs)) throw Error("EXECUTION_LEASE_INVALID");
    return this.transaction(() => {
      const j = this.get(id);
      if (j.fence !== fence || now >= j.leaseUntil || terminal(j.state) || j.state === "dispatch-uncertain")
        throw Error("EXECUTION_FENCE_OR_LEASE");
      j.leaseUntil = now + leaseMs;
      this.save(j);
      return j;
    });
  }
  /** Manual evidence-backed resolution, never an automatic resend. Unknown billing retains the cap. */
  reconcile(
    id: string,
    evidence: { reason: string; receipt: string; dispatch: "not-dispatched" | "outcome-unavailable" },
    now = Date.now(),
  ) {
    if (
      !evidence.reason.trim() ||
      !hash(evidence.receipt) ||
      !["not-dispatched", "outcome-unavailable"].includes(evidence.dispatch)
    )
      throw Error("EXECUTION_RECONCILIATION_EVIDENCE");
    return this.transaction(() => {
      const j = this.get(id);
      if (j.state !== "dispatch-uncertain") throw Error("EXECUTION_NOT_UNCERTAIN");
      j.state = "cancelled";
      j.updated = now;
      j.stages = { ...j.stages, reconciliation: evidence, outcome: "invalid-execution" };
      if (evidence.dispatch === "not-dispatched") j.settledMicroUsd = 0;
      this.save(j);
      this.event(id, "reconciled-no-resend", evidence, now);
      return j;
    });
  }
  account(id: string, fence: string, usage: unknown, cost: number | null, source: string) {
    if (!source || (cost !== null && (!Number.isSafeInteger(cost) || cost < 0)))
      throw Error("EXECUTION_ACCOUNTING_INVALID");
    return this.transaction(() => {
      const j = this.get(id);
      if (j.fence !== fence || terminal(j.state)) throw Error("EXECUTION_ACCOUNTING_FENCE");
      if (cost !== null && cost > j.reservedMicroUsd)
        this.event(id, "reservation-overrun", { cost, reservation: j.reservedMicroUsd }, Date.now());
      j.usage = usage;
      j.settledMicroUsd = cost;
      this.save(j);
      this.event(id, "usage", { usage, cost, source }, Date.now());
    });
  }
}
