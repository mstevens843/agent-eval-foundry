import { equal, sorted, verdicts } from "./checker-utils.mjs";
function check(c) {
  const streams = new Map();
  for (const item of c.input.chunks) {
    if (!streams.has(item.channel)) streams.set(item.channel, []);
    streams.get(item.channel).push(Buffer.from(item.bytes, "base64"));
  }
  const records = [...streams.values()].flatMap((chunks) => Buffer.concat(chunks).toString("utf8")
    .split(/\r?\n/).filter((s) => s.trim()).map((s) => JSON.parse(s)));
  const wanted = c.requests.map((request) => {
    const own = records.filter((r) => r.request === request);
    if (!own.length) return { request, attempt: null, status: "incomplete", data: "", error: { code: "MISSING", retryable: true } };
    const attempt = Math.max(...own.map((r) => r.attempt));
    const active = own.filter((r) => r.attempt === attempt), parts = new Map();
    for (const r of active) if (r.kind === "chunk") parts.set(r.seq, r.value);
    let data = "", seq = 0;
    while (parts.has(seq)) data += parts.get(seq++);
    const finish = active.find((r) => r.kind === "finish");
    if (finish?.status === "error") return { request, attempt, status: "error", data, error: { code: finish.code, retryable: finish.retryable } };
    if (!finish || seq !== finish.next) return { request, attempt, status: "incomplete", data, error: { code: finish ? "GAP" : "TRUNCATED", retryable: true } };
    return { request, attempt, status: "ok", data, error: null };
  });
  const drained = c.observations.findIndex((o) => o.method === "next" && o.value === null);
  return drained >= 0 && c.observations.every((o, i) => o.method !== "record" || i > drained)
    && equal(sorted(c.actual), sorted(wanted));
}
export const run = ({ cases }) => verdicts(cases, check);
