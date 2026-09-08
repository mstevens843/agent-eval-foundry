import { gzipSync } from "node:zlib";
export const checkIds = ["completion", "privacy", "preservation", "identity", "unique_publication"];
const part = (id, media, value, encoding = "base64") => {
  const raw = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
  return {
    id,
    name: "attachment ann@example.test",
    media,
    encoding,
    data:
      encoding === "utf8"
        ? raw.toString()
        : (encoding === "gzip-base64" ? gzipSync(raw) : raw).toString("base64"),
    links: [],
  };
};
export function scenarios() {
  const rows = [];
  for (let seed = 0; seed < 24; seed++) {
    const secret = "ann@example.test",
      policy = {
        literals: seed % 3 === 0 ? ["ann", secret, "a+b", "[REDACTED]"] : [secret, "a+b"],
        fields: ["email", "privateNote"],
      };
    const message = (id) => ({
      id,
      subject: "Context " + secret + " remains",
      headers: [{ name: "from", value: secret }],
      tags: ["retained"],
      related: ["sibling"],
      parts: [],
    });
    const nested = message("nested-" + seed);
    nested.parts = [
      part(
        "inner",
        "application/json",
        { people: [{ email: "not-in-literals", body: "a+b and " + secret }], empty: [], safe: "preserve 🚲" },
        seed % 2 ? "base64" : "gzip-base64",
      ),
    ];
    let child = nested;
    for (let d = 0; d < seed % 3; d++) {
      const parent = message("depth-" + d);
      parent.parts = [part("nest-" + d, "message/support+json", child)];
      child = parent;
    }
    const a = message("ticket-" + seed);
    a.parts = [
      part("text", "text/plain", "ann@example.test then ann and a+b / aab", "utf8"),
      part("message", "message/support+json", child, seed % 2 ? "gzip-base64" : "base64"),
      part("binary", "application/octet-stream", Buffer.from([0, 255, 1, seed, 2])),
      part(
        "json",
        "application/json",
        {
          email: "unlisted@example.test",
          allowed: 17,
          record: { privateNote: "sensitive", keep: "visible" },
        },
        seed % 2 ? "utf8" : "base64",
      ),
    ];
    a.parts[0].links = ["binary"];
    const b = message("other-" + seed);
    b.subject = "ordinary";
    b.parts = [];
    rows.push({ id: "case-" + String(seed).padStart(3, "0"), policy, tickets: seed % 4 ? [a] : [a, b] });
  }
  rows.push({
    id: "case-024",
    policy: { literals: ["secret"], fields: ["email"] },
    tickets: [{ id: "clean", subject: "ordinary", headers: [], tags: [], related: [], parts: [] }],
  });
  rows.push({ id: "case-025", policy: { literals: ["secret"], fields: [] }, tickets: [] });
  // case-026: SEMANTICS.md says non-string values under a fields key ("email"/"privateNote")
  // are "traversed normally," not blanked wholesale. Every fields-value in the main loop above
  // is a plain string, so that sentence is never exercised: a solver that unconditionally
  // blanks *anything* under a fields key (skipping the typeof-string guard) would pass
  // undetected. Here "email" holds a nested object and "privateNote" holds an array, and both
  // contain the policy literal "secret" in sub-values that are NOT themselves under a fields
  // key — those must still be recursed into and literal-filtered, not left alone and not
  // replaced wholesale with [REDACTED].
  rows.push({
    id: "case-026",
    policy: { literals: ["secret"], fields: ["email", "privateNote"] },
    tickets: [
      {
        id: "nested-fields",
        subject: "ordinary",
        headers: [],
        tags: [],
        related: [],
        parts: [
          part(
            "json",
            "application/json",
            {
              email: { primary: "user@example.test holds secret", verified: true, tags: ["secret", "ok"] },
              privateNote: ["first secret note", "second note"],
              keep: "visible secret text",
            },
            "utf8",
          ),
        ],
      },
    ],
  });
  // case-027: SEMANTICS.md asserts literal matching is case-sensitive but no existing scenario
  // ever falsifies that — no mixed-case near-miss of a literal exists anywhere else. A
  // case-insensitive matcher (an easy, plausible bug) would pass every other scenario
  // undetected. Literal "ann" (lowercase) sits beside "Ann"/"ANN" that must survive untouched.
  rows.push({
    id: "case-027",
    policy: { literals: ["ann"], fields: [] },
    tickets: [
      {
        id: "case-sensitive",
        subject: "Ann met ann and Ann again",
        headers: [{ name: "from", value: "Ann Smith <ann@example.test>" }],
        tags: [],
        related: [],
        parts: [part("text", "text/plain", "Ann is not ann; ANN is not ann either", "utf8")],
      },
    ],
  });
  // case-028: SEMANTICS.md says a fields-key string value "must be entirely replaced" with
  // [REDACTED] — the field rule wins outright, it is not a literal-scan-then-blank sequence.
  // No existing scenario puts a policy literal INSIDE a fields-value string, so an
  // implementation that only literal-scans (ignoring the field rule when a literal happens to
  // match) is indistinguishable from a correct one today. "email" here contains the literal
  // "secret" and must still come out as a single, whole [REDACTED] rather than a partial scan.
  rows.push({
    id: "case-028",
    policy: { literals: ["secret"], fields: ["email"] },
    tickets: [
      {
        id: "field-literal-overlap",
        subject: "ordinary",
        headers: [],
        tags: [],
        related: [],
        parts: [
          part("json", "application/json", { email: "contains secret text", keep: "also secret here" }, "utf8"),
        ],
      },
    ],
  });
  return rows;
}
