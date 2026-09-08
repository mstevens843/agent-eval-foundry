export const checkIds = ["completion", "content", "attempt_identity", "error_semantics", "exact_rows"];
export function wire(records, seed = 0) {
  const channels = [[], [], []];
  records.forEach((r, i) => channels[(i + seed) % 3].push(r));
  const pieces = channels.map((rs, i) => {
    const text = rs.map((r) => JSON.stringify(r)).join(seed % 2 ? "\r\n" : "\n") + (seed % 3 ? "\n" : "");
    const bytes = Buffer.from(text),
      out = [];
    let pos = 0;
    while (pos < bytes.length) {
      const n = seed === 999 ? bytes.length : 1 + ((pos + i + seed) % 37);
      out.push({ channel: "ch" + i, bytes: bytes.subarray(pos, pos + n).toString("base64") });
      pos += n;
    }
    return out;
  });
  const out = [];
  while (pieces.some((p) => p.length)) for (const p of pieces) if (p.length) out.push(p.shift());
  return out;
}
export function scenarios() {
  const out = [];
  for (let seed = 0; seed < 24; seed++) {
    const a = "job-" + seed,
      b = "empty",
      c = "gap",
      d = "pending",
      z = "missing";
    const part = (request, attempt, seq, value) => ({ request, attempt, kind: "chunk", seq, value });
    const end = (request, attempt, next, status = "ok", code = null, retryable = false) => ({
      request,
      attempt,
      kind: "finish",
      next,
      status,
      code,
      retryable,
    });
    const records = [
      part(a, 1, 0, "obsolete"),
      end(a, 1, 1),
      part(a, 2, 1, " 🚲終"),
      part(a, 2, 0, "partial"),
      end(a, 2, 2, "error", "UPSTREAM_" + seed, seed % 2 === 0),
      end(b, 1, 0),
      part(c, 1, 0, "prefix"),
      part(c, 1, 2, "lost-gap"),
      end(c, 1, 3),
      part(d, 1, 0, "older"),
      end(d, 1, 1),
      { request: d, attempt: 2, kind: "start" },
      part(d, 2, 0, "new"),
      part("foreign", 1, 0, "ignore"),
      end("foreign", 1, 1),
    ];
    records.push(structuredClone(records[2]));
    if (seed % 2) records.reverse();
    out.push({
      id: "case-" + String(seed).padStart(3, "0"),
      requests: [a, b, c, d, z],
      records,
      chunks: wire(records, seed),
    });
  }
  const records = [
    { request: "a", attempt: 1, kind: "chunk", seq: 0, value: "hello" },
    { request: "a", attempt: 1, kind: "finish", next: 1, status: "ok", code: null, retryable: false },
  ];
  out.push({ id: "case-024", requests: ["a"], records, chunks: wire(records, 999) });
  out.push({ id: "case-025", requests: [], records: [], chunks: [] });
  // Deliberate (not incidental) multi-byte codepoint boundary splits. The seeded cases above
  // also split " 🚲終" across a wire fragment boundary in 8 of 24 seeds, but a duplicate copy of
  // that same (request,attempt,seq) is appended to every seeded case's record list, and
  // last-write-wins seq semantics in the decoder's chunk map mean whichever occurrence decodes
  // last silently overwrites a corrupted earlier occurrence in 6 of those 8 seeds -- incidental
  // coverage that depends on where the duplicate happens to land relative to the split. Here
  // there is no duplicate at all: the split value is the ONLY occurrence of its identity, on a
  // single channel, so a decoder that decodes each raw wire chunk to UTF-8 independently (byte
  // carry across next() calls forgotten, even if line-carry across calls is handled correctly)
  // is guaranteed to surface the corruption in the final published row.
  const splitBoundary = (id, value, splitBefore) => {
    const records = [
      { request: "boundary", attempt: 1, kind: "chunk", seq: 0, value },
      { request: "boundary", attempt: 1, kind: "finish", next: 1, status: "ok", code: null, retryable: false },
    ];
    const text = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const bytes = Buffer.from(text, "utf8");
    const marker = Buffer.from(splitBefore, "utf8");
    const at = bytes.indexOf(marker);
    if (at < 0) throw Error("PORTFOLIO_SCENARIO_MARKER_MISSING");
    const mid = at + 2; // land strictly inside the multi-byte sequence, not on a boundary
    const chunks = [
      { channel: "ch5", bytes: bytes.subarray(0, mid).toString("base64") },
      { channel: "ch5", bytes: bytes.subarray(mid).toString("base64") },
    ];
    return { id, requests: ["boundary"], records, chunks };
  };
  out.push(splitBoundary("case-026", " 🚲終", "🚲")); // split inside a 4-byte codepoint
  out.push(splitBoundary("case-027", " 終🚲", "終")); // split inside a 3-byte codepoint
  return out;
}
