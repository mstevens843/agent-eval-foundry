export function select(records, request) {
  const own = records.filter((r) => r.request === request);
  if (!own.length) return null;
  const attempt = Math.max(...own.map((r) => r.attempt));
  const active = own.filter((r) => r.attempt === attempt),
    chunks = new Map();
  for (const r of active) if (r.kind === "chunk") chunks.set(r.seq, r.value);
  return { attempt, chunks, finish: active.find((r) => r.kind === "finish") ?? null };
}
