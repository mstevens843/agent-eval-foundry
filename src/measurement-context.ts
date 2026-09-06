import { createHash } from "node:crypto";
import { type MeasureOptions, measure } from "./axis-meter.js";
import type { AxisReport, Matrix } from "./types.js";

/** Per-operation, size-bounded memoization of trusted matrix analysis, not trial outcomes.
 * Results and provenance are dependencies: IDs alone cannot identify a measurement.
 * No global cache or mtime shortcut; mutation, missingness, options and seeds change the key.
 */
export function measurementContext(maxBytes = 32 * 1024 * 1024) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw Error("invalid measurement cache budget");
  const cache = new Map<string, { result: AxisReport; bytes: number }>();
  let bytes = 0;
  return (matrix: Matrix, options: MeasureOptions = {}): AxisReport => {
    const key = createHash("sha256")
      .update(JSON.stringify(["axis-exact-v1", matrix, options]))
      .digest("hex");
    const existing = cache.get(key);
    if (existing) return existing.result;
    const result = measure(matrix, options);
    const size = Buffer.byteLength(JSON.stringify(result)) + key.length;
    if (size <= maxBytes) {
      while (bytes + size > maxBytes) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        bytes -= cache.get(oldest)?.bytes ?? 0;
        cache.delete(oldest);
      }
      cache.set(key, { result, bytes: size });
      bytes += size;
    }
    return result;
  };
}
