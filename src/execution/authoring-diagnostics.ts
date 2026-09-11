import { appendFileSync, writeFileSync } from "node:fs";
import { localProcess } from "../packages/local-process.js";

// Fixed, read-only paths: no task files, process arguments, environments or credentials.
const RESOURCE_PROBE = `for f in memory.current memory.peak memory.max memory.events pids.current pids.max pids.events; do
  if [ -r /sys/fs/cgroup/$f ]; then printf '%s\\n' "$f"; cat /sys/fs/cgroup/$f; fi
done
df -k /tmp /home/provider /dev/shm`;

export interface DiagnosticsSummary {
  samples: number;
  unavailable: number;
  capped: boolean;
  writeFailed: boolean;
}

/** Best-effort, bounded infrastructure evidence. Never changes the solver's result or limits. */
export function startAuthoringDiagnostics(
  container: string,
  output: string,
  options: { intervalMs?: number; maxSamples?: number; probe?: () => Promise<string> } = {},
): { stop: () => Promise<DiagnosticsSummary> } {
  const intervalMs = options.intervalMs ?? 15000;
  const maxSamples = options.maxSamples ?? 1440;
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 1 ||
    !Number.isSafeInteger(maxSamples) ||
    maxSamples < 1
  )
    throw Error("AUTHORING_DIAGNOSTICS_LIMITS");
  const summary: DiagnosticsSummary = { samples: 0, unavailable: 0, capped: false, writeFailed: false };
  let stopped = false;
  let pending: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const probe =
    options.probe ??
    (async () => {
      const result = await localProcess("docker", ["exec", container, "sh", "-c", RESOURCE_PROBE], {
        timeoutMs: 5000,
        limitBytes: 8192,
      });
      return result.stdout;
    });
  try {
    writeFileSync(output, "", { flag: "wx", mode: 0o600 });
  } catch {
    summary.writeFailed = true;
  }
  const sample = async () => {
    const at = new Date().toISOString();
    let resourceText: string | null = null;
    try {
      const value = await probe();
      if (Buffer.byteLength(value) > 8192) throw Error("DIAGNOSTICS_SAMPLE_LIMIT");
      resourceText = value;
    } catch {
      // A container can be absent during startup or already stopped. Never persist raw errors
      // (which may contain child output), retry the solver, or substitute a grading outcome.
      summary.unavailable++;
    }
    summary.samples++;
    try {
      appendFileSync(output, `${JSON.stringify({ at, resourceText, available: resourceText !== null })}\n`);
    } catch {
      summary.writeFailed = true;
    }
    summary.capped = summary.samples >= maxSamples;
    if (!stopped && !summary.capped && !summary.writeFailed) schedule();
  };
  const schedule = () => {
    timer = setTimeout(() => {
      pending = sample();
    }, intervalMs);
    timer.unref();
  };
  if (!summary.writeFailed) schedule();
  return {
    stop: async () => {
      stopped = true;
      clearTimeout(timer);
      await pending;
      return { ...summary };
    },
  };
}
