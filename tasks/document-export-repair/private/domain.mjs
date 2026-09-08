import { gunzipSync } from "node:zlib";
import { session, checks, equal } from "./adapter.mjs";
// Ground truth never imports any submitted/reference implementation.
function unpack(p) {
  let b = p.encoding === "utf8" ? Buffer.from(p.data) : Buffer.from(p.data, "base64");
  if (p.encoding === "gzip-base64") b = gunzipSync(b, { maxOutputLength: 512 * 1024 });
  return b;
}
function replace(value, policy) {
  const hits = [];
  for (const token of policy.literals) {
    let at = value.indexOf(token);
    while (at >= 0) {
      hits.push({ at, end: at + token.length });
      at = value.indexOf(token, at + 1);
    }
  }
  hits.sort((a, b) => a.at - b.at || b.end - a.end);
  let cursor = 0,
    out = "";
  for (const h of hits)
    if (h.at >= cursor) {
      out += value.slice(cursor, h.at) + "[REDACTED]";
      cursor = h.end;
    }
  return out + value.slice(cursor);
}
function value(v, p, redact, key = null) {
  if (typeof v === "string") return redact ? (p.fields.includes(key) ? "[REDACTED]" : replace(v, p)) : v;
  if (Array.isArray(v)) return v.map((x) => value(x, p, redact));
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x, p, redact, k)]));
  return v;
}
export function semantic(m, p, redact = false, depth = 0) {
  if (depth > 12 || !m || !Array.isArray(m.parts) || m.parts.length > 40) throw Error("message");
  const out = structuredClone(m);
  out.subject = redact ? replace(m.subject, p) : m.subject;
  out.headers = m.headers.map((h) => ({ ...h, value: redact ? replace(h.value, p) : h.value }));
  out.parts = m.parts.map((part) => {
    const b = unpack(part);
    const data =
      part.media === "application/octet-stream"
        ? b.toString("base64")
        : part.media === "message/support+json"
          ? semantic(JSON.parse(b), p, redact, depth + 1)
          : part.media === "application/json"
            ? value(JSON.parse(b), p, redact)
            : redact
              ? replace(b.toString("utf8"), p)
              : b.toString("utf8");
    return { ...part, name: redact ? replace(part.name, p) : part.name, data };
  });
  return out;
}
function shape(x) {
  if (!x || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map(shape);
  return Object.fromEntries(
    Object.entries(x)
      .filter(([k]) => !["subject", "value", "data", "name"].includes(k))
      .map(([k, v]) => [k, shape(v)]),
  );
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    published = [];
  const expected = s.tickets.map((t) => ({ id: t.id, document: semantic(t, s.policy, true) }));
  await execute(
    session(
      { ticketIds: s.tickets.map((t) => t.id), policy: s.policy, storage },
      {
        read: ({ id }) => {
          const ticket = s.tickets.find((t) => t.id === id);
          return ticket ? { ticket } : { error: "not-found" };
        },
        publish: ({ id, data }) => {
          if (typeof id !== "string" || typeof data !== "string" || data.length > 1024 * 1024)
            return { error: "payload" };
          published.push({ id, data });
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const actual = published.map((row) => {
    try {
      return { id: row.id, document: semantic(JSON.parse(Buffer.from(row.data, "base64")), s.policy) };
    } catch {
      return { id: row.id, malformed: true };
    }
  });
  const normalized = (rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const complete = s.tickets.every((t) => published.some((p) => p.id === t.id));
  const matches = equal(normalized(actual), normalized(expected));
  return {
    ...checks({
      completion: complete,
      privacy: matches,
      preservation: matches,
      identity: actual.every((a) =>
        expected.some((e) => e.id === a.id && equal(shape(a.document), shape(e.document))),
      ),
      unique_publication:
        published.length === s.tickets.length &&
        new Set(published.map((p) => p.id)).size === published.length,
    }),
    actual,
    expected,
    // Original source population, not another candidate's reads or a redacted answer.
    // Empty work must be distinguishable from abandoning a nonempty request.
    view: { ticketIds: s.tickets.map((ticket) => ticket.id), policy: s.policy },
    tickets: s.tickets,
    // The redaction policy in force for this scenario. This is the same object every
    // candidate already receives at runtime via view.policy — it is problem input, not an
    // answer. A checker-required submission's checker needs it to independently recompute
    // what should have been redacted; without it a checker could only compare shapes, never
    // judge whether the right substrings/fields were actually filtered.
    policy: s.policy,
    observations,
    reports,
  };
}
