export const RULES = [
  {
    code: "CAA1_RECHECK_EACH_STALE_NAME",
    text: "For every name whose age in hours (nowHour minus validatedAtHour) is strictly greater than 8, call caa.current with that exact fqdn and bind the value it returns to that name and no other.",
  },
  {
    code: "CAA2_FRESH_NAMES_USE_THEIR_OWN_CACHE",
    text: "A name whose age is 8 hours or less uses its own cachedCaa. Age exactly 8 is fresh.",
  },
  {
    code: "CAA3_CONJUNCTIVE_ISSUANCE",
    text: "Return ISSUE if and only if every name's bound answer is ALLOW. Any DENY produces REFUSE, and REFUSE is wrong when every name allows.",
  },
  {
    code: "CAA4_ONE_RESULT_PER_NAME_IN_ORDER",
    text: "Emit exactly one result per input name, in the input order, carrying that name's fqdn.",
  },
  {
    code: "CAA5_POSITIVE_QUERY_WORK",
    text: "When the order contains at least one name older than 8 hours, at least one current-authorization query must reach the host. Extra or repeated queries are permitted.",
  },
] as const;

export const RULE_CODES = RULES.map((rule) => rule.code);

export const SPEC_MD = `# Multi-name certificate authorization revalidation

One certificate order names between one and five domains. Each name carries the hour its domain
control was validated and the authorization answer recorded then. Answers older than the recheck
window must be rechecked against the current authority before the order is decided.

## Public state

\`OrderView\` gives \`orderId\`, the current \`nowHour\`, and \`names\`, each with \`fqdn\`,
\`validatedAtHour\` and \`cachedCaa\`. A name's age is \`nowHour - validatedAtHour\`. The recheck
window is 8 hours.

## Rules

${RULES.map((rule) => `- **${rule.code}**: ${rule.text}`).join("\n")}

## Accepted and forbidden outcomes

Accepted: every input fqdn has exactly one same-name result, every age greater than eight hours
carries that name's current answer, every age of eight or less carries that name's own cachedCaa,
and ISSUE occurs when and only when every result allows.

Forbidden: using one domain's current result for another, checking one fqdn repeatedly instead of
querying another, omitting a name, issuing with any DENY, and refusing when every name allows.

## The authorization facade

\`caa.current(fqdn)\` returns \`"ALLOW"\` or \`"DENY"\` for exactly the name given. It is
synchronous, total over any string, never throws, and records the exact fqdn of every call in a
host-owned ledger. \`run\` may return an \`OrderReport\` or a promise of one.

The ledger, the complete current-authorization map, and the authoritative decision are owned by the
harness. None of them is readable through the subject API, and the grader uses the ledger rather
than the report's own account of what was queried.

## Implementation freedom, and what is not required

Iteration style, data structures, helper functions and query order are free, provided the emitted
result order matches the input order. DNS transport, CAA record parsing, ACME protocol messages,
certificate signing, revocation and the thirty-day domain-control validity period are outside this
task.

## Output

\`\`\`
type NameResult  = { fqdn: string, caa: "ALLOW" | "DENY", source: "CACHE" | "CURRENT" }
type OrderReport = { decision: "ISSUE" | "REFUSE", results: NameResult[] }
\`\`\`

\`source\` is required by the output grammar and is not graded. A report that does not match this
grammar is refused rather than graded.

## Hidden scenarios

Hidden cases sample only the declared dimensions: seed, domain count (1, 2, 3, 5), age pattern over
the declared ages 0, 8, 9, 24 and 719 hours, and which rechecked name is denied (none, first, middle
or last). A denied position names a name that is actually rechecked; where an order has fewer than
three rechecked names, middle and last collapse onto the positions that exist, and an order with no
rechecked name admits only \`none\`. These dimensions add no rule beyond the five above.
`;
