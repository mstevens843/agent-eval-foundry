import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { verifyAssembly } from "../packages/assembly.js";
import { hashFile, localProcess } from "../packages/local-process.js";
import { resolvePackage, safePackagePath, sha256 } from "../packages/record.js";
import { writeEvidence } from "./artifacts.js";
import { type CaptureResult, captureProcess } from "./capture.js";
import { type ExecutionProfile, profileDigest } from "./profiles.js";
import type { Job, JobStore } from "./store.js";

export type SimulationMode =
  | "correct"
  | "incorrect"
  | "missing-file"
  | "timeout"
  | "malformed"
  | "large-output"
  | "interrupted"
  | "child-process";
export const SIMULATION_MODES: readonly SimulationMode[] = [
  "correct",
  "incorrect",
  "missing-file",
  "timeout",
  "malformed",
  "large-output",
  "interrupted",
  "child-process",
];
export async function buildInertAuthor(root: string, output: string, goImage: string): Promise<string> {
  if (!/^sha256:[a-f0-9]{64}$/.test(goImage)) throw Error("AUTHORING_IMAGE_NOT_PINNED");
  const source = join(root, "scripts/execution/inert-author.go");
  const version = sha256(`${await hashFile(source)}:${goImage}`);
  const dir = join(output, version);
  const binary = join(dir, "inert-author");
  const receipt = join(dir, "build.json");
  if (existsSync(binary)) {
    if (!existsSync(receipt)) throw Error("INERT_BUILD_INCOMPLETE");
    const existing = JSON.parse(readFileSync(receipt, "utf8"));
    if (existing.version !== version || existing.binarySha256 !== (await hashFile(binary)))
      throw Error("INERT_BUILD_CHANGED");
    return binary;
  }
  mkdirSync(dir, { recursive: true });
  await localProcess(
    "docker",
    [
      "run",
      "--pull=never",
      "--rm",
      "--network=none",
      "--cpus=2",
      "--memory=2g",
      "--pids-limit=128",
      "--mount",
      `type=bind,src=${resolve(source)},dst=/src/main.go,readonly`,
      "--mount",
      `type=bind,src=${resolve(dir)},dst=/out`,
      "--env",
      "CGO_ENABLED=0",
      goImage,
      "go",
      "build",
      "-trimpath",
      "-o",
      "/out/inert-author",
      "/src/main.go",
    ],
    { timeoutMs: 120000 },
  );
  writeEvidence(receipt, { version, goImage, binarySha256: await hashFile(binary) });
  return binary;
}
/** The lower-level dispatch seam rechecks the durable fence and binding. No arbitrary shell
 * command, inherited credentials or foundry mount can be supplied as an adapter. */
export async function runInertAuthor(
  store: JobStore,
  job: Job,
  profile: ExecutionProfile,
  options: {
    publicDir: string;
    binary: string;
    directory: string;
    mode: SimulationMode;
    native: boolean;
    overlay: Record<string, string>;
    toolURL?: string;
    signal?: AbortSignal;
  },
): Promise<CaptureResult> {
  const current = store.get(job.id);
  if (
    current.realm !== "simulation" ||
    current.state !== "dispatching" ||
    current.fence !== job.fence ||
    Date.now() >= current.leaseUntil ||
    current.profileDigest !== profileDigest(profile) ||
    !SIMULATION_MODES.includes(options.mode)
  )
    throw Error("AUTHORING_DISPATCH_DENIED");
  const expectedStage = join(store.root, "simulation", ".incomplete", job.id);
  if (
    resolve(options.directory) !== expectedStage ||
    resolve(options.publicDir) !== join(expectedStage, "public") ||
    [options.publicDir, options.binary].some((p) => /[,\r\n]/.test(p))
  )
    throw Error("AUTHORING_WORKSPACE_BINDING");
  verifyAssembly(
    resolvePackage(join(expectedStage, "package-store"), job.packageDigest),
    options.publicDir,
    "subject",
  );
  const adapter = JSON.parse(readFileSync(join(expectedStage, "adapter.json"), "utf8"));
  if (adapter.mode !== options.mode || adapter.binarySha256 !== (await hashFile(options.binary)))
    throw Error("AUTHORING_ADAPTER_DRIFT");
  // A dispatch receipt is exclusive even if someone calls this lower-level API twice.
  const receipt = openSync(join(options.directory, "dispatch.started"), "wx", 0o600);
  fsyncSync(receipt);
  closeSync(receipt);
  if (profile.authoring.credentials !== "none") throw Error("SIMULATION_CREDENTIALS_FORBIDDEN");
  const name = `foundry-author-${job.id}-${job.fence.slice(0, 8)}`;
  const args = [
    "run",
    "--pull=never",
    "--name",
    name,
    "--init",
    "--read-only",
    `--network=${profile.authoring.network}`,
    `--cpus=${profile.limits.cpus}`,
    `--memory=${profile.limits.memoryMiB}m`,
    `--pids-limit=${profile.limits.pids}`,
    "--user=1000:1000",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--tmpfs",
    "/tmp:rw,exec,size=128m,mode=1777",
    "--tmpfs",
    "/work:rw,size=128m,mode=1777",
    ...(options.native ? ["--tmpfs", "/app/certd:rw,exec,size=128m,mode=1777"] : []),
    "--env",
    "HOME=/work/home",
    "--env",
    "GOCACHE=/tmp/go-cache",
    "--env",
    "GOTOOLCHAIN=local",
    "--mount",
    `type=bind,src=${resolve(options.publicDir)},dst=/public,readonly`,
    "--mount",
    `type=bind,src=${resolve(options.binary)},dst=/inert-author,readonly`,
    "-i",
    profile.authoring.image,
    "/inert-author",
  ];
  writeEvidence(join(options.directory, "authoring-environment.json"), {
    schemaVersion: 1,
    container: name,
    command: ["docker", ...args],
    requested: profile.authoring,
    limits: profile.limits,
    credentialValuesProvided: false,
  });
  const files = new Map<string, { fd: number; bytes: number; final: boolean }>();
  let total = 0;
  let completed = false;
  try {
    const capture = await captureProcess("docker", args, {
      directory: join(options.directory, "capture"),
      timeoutMs: profile.limits.wallMs,
      maxBytes: profile.limits.outputBytes,
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" },
      jsonEvents: true,
      ...(options.signal ? { signal: options.signal } : {}),
      input: JSON.stringify({
        Mode: options.mode,
        Overlay: options.overlay,
        Native: options.native,
        ToolURL: options.toolURL ?? "",
      }),
      cleanup: async () => {
        try {
          const inspected = await localProcess(
            "docker",
            ["inspect", "--format", '{"state":{{json .State}},"image":{{json .Image}}}', name],
            { timeoutMs: 15000, limitBytes: 65536 },
          );
          writeEvidence(join(options.directory, "authoring-runtime.json"), JSON.parse(inspected.stdout));
        } finally {
          await localProcess("docker", ["rm", "-f", name], { timeoutMs: 15000 });
        }
      },
      onEvent: (event) => {
        if (completed) throw Error("EVENT_AFTER_COMPLETION");
        if (event.type === "artifact") {
          if (
            !["submission", "workspace"].includes(String(event.kind)) ||
            typeof event.path !== "string" ||
            typeof event.data !== "string" ||
            typeof event.final !== "boolean"
          )
            throw Error("ARTIFACT_EVENT_SCHEMA");
          const relative = `${event.kind}/${safePackagePath(event.path)}`;
          let file = files.get(relative);
          if (!file) {
            if (files.size >= 128) throw Error("ARTIFACT_FILE_LIMIT");
            const path = join(options.directory, relative);
            mkdirSync(dirname(path), { recursive: true });
            file = { fd: openSync(path, "wx", 0o600), bytes: 0, final: false };
            files.set(relative, file);
          }
          if (
            file.final ||
            event.offset !== file.bytes ||
            !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.data)
          )
            throw Error("ARTIFACT_EVENT_ORDER");
          const data = Buffer.from(event.data, "base64");
          total += data.length;
          if (total > profile.limits.artifactBytes) throw Error("ARTIFACT_BYTE_LIMIT");
          writeSync(file.fd, data);
          file.bytes += data.length;
          file.final = event.final;
        } else if (event.type === "completed") {
          if (
            event.substantive !== true ||
            !files.size ||
            [...files.values()].some((f) => !f.final) ||
            event.files !== files.size ||
            event.bytes !== total
          )
            throw Error("ARTIFACT_INCOMPLETE");
          completed = true;
        }
      },
    });
    if (capture.status === "completed" && !completed)
      return { ...capture, status: "malformed-events", error: "missing adapter completion" };
    return capture;
  } finally {
    for (const f of files.values()) {
      fsyncSync(f.fd);
      closeSync(f.fd);
    }
  }
}
