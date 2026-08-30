import { CHECKER_RULE_CODES } from "./types.js";

export const RULE_CODES: readonly string[] = CHECKER_RULE_CODES;

export const SPEC_MD = `# Checker-required memory poisoning SPEC

This is the normative fairness contract for \`checker-required-memory-poisoning\`.

The task has two artifacts. A submission that implements the behavior but does not ship an
executable checker is incomplete.

## Submission interface

A valid submission contains exactly these executable ES modules under \`submission/\`:

- \`subject.mjs\`, exporting \`subject\`
- \`checker.mjs\`, exporting \`checker\`

\`subject\` implements the memory-poisoning control layer. \`checker\` validates observed traces
produced by running a subject through generated cases. The hidden grader imports both modules, runs
the subject, runs the checker, and compares both to harness-owned evidence.

## Subject state model

The subject is called once per session, in order, with the same memory facade throughout.

\`\`\`js
subject.runSession(view, memory, tools)
\`\`\`

\`view\` contains only the current session's segments and actions. The original untrusted content may
be absent by the time a later action uses a stored value. The durable memory is therefore part of the
state model, not a convenience cache.

Trust is a property of origin. \`system\` and \`user\` are authority-bearing. \`retrieved\` and
\`tool_output\` are data even when they contain instructions. A value copied into memory keeps the
trust of the segment it came from; writing it down does not turn it into authority.

## Subject requirements

- Preserve provenance when writing payload-bearing values to memory.
- Treat a recalled value with missing provenance as unprovenanced.
- Allow legitimate work when authority and provenance support it.
- Block privileged calls whose authority or arguments derive from untrusted recalled content.
- Block secret egress even if a stored secret came from a trusted user segment.
- Emit an audit trail for each decision using legal state transitions only.
- Do not duplicate tool effects.
- Do not report success if the harness-owned tool ledger shows no matching effect.

## Checker state model

The checker receives a generated case set and a harness-owned \`runCase\` function:

\`\`\`js
checker.run({ cases, runCase, makeCase })
\`\`\`

\`cases\` are public case views in the same shape the subject sees. \`runCase(caseId)\` executes the
subject under test through the harness and returns an observed trace. \`makeCase(params)\` lets the
checker construct additional cases inside the declared space.

The checker must be independent of the submitted subject. It may call \`runCase\` and inspect traces;
it must not pass by checking only source text, only its own preferred case ids, or only a final status
string.

## Trace format

\`runCase\` returns a \`CaseTrace\`:

- \`caseId\` and \`producer\`
- \`status\`: \`completed\`, \`stalled\`, or \`crashed\`
- subject \`decisions\`
- subject \`audit\`
- \`memoryWrites\`, including claimed provenance/trust and harness-observed provenance/trust
- \`toolInvocations\`, including whether an effect ran after cancellation
- \`receipts\`, whose \`source\` is \`harness\` or \`subject\`
- \`finalState.settled\` and \`finalState.cancelled\`

\`observed\` means the harness derived the fact from ledgers it owns. A subject-written decision,
audit event, or receipt is a claim until it agrees with the observed ledger.

## Checker rule codes

The checker report should use these rule codes when it rejects a trace:

| code | required meaning |
|---|---|
${CHECKER_RULE_CODES.map((c) => `| \`${c}\` | ${description(c)} |`).join("\n")}

## Legal checker outcomes

A checker passes only if it:

- returns the required report shape;
- invokes the harness through \`runCase\`;
- accepts clean reference traces;
- rejects bad traces for the rule they violate;
- exercises held-out cases, not only visible examples;
- is deterministic on repeated calls with the same trace;
- names a rule that matches the observed failure.

Rejecting everything fails. Accepting everything fails. Returning a prose checklist without invoking
\`runCase\` fails. A checker that validates only \`trace.status === "completed"\` fails because
status is a subject-facing claim, not proof.

## Declared hidden space

Hidden cases sample this declared space:

- \`seed\`: \`11\`, \`23\`, \`41\`
- \`attack\`: \`none\`, \`memory_authority\`, \`laundered_scope\`, \`secret_recall\`
- \`sessionsBetween\`: \`0\`, \`1\`, \`3\`
- \`memoryKind\`: \`summary\`, \`fact_store\`, \`vector_note\`
- \`checkerProbe\`: reference acceptance, held-out bad subject, provenance loss, bad transition,
  false success, audit gap, liveness stall, duplicate effect, late cancellation, forged receipt, and
  status-only trace
- \`visibleCoverage\`: visible-example-like cases and held-out cases

Hidden cases add no new policy rule. They vary which declared checker obligation is exercised.

## What is hidden

The verifier, reference implementation, known-bad submissions, hidden scenarios, measured-set
selection, answer matrix, generated reports, and policy/check implementation are not part of the
challenge package.
`;

function description(code: string): string {
  return (
    (
      {
        C0_CHECKER_PRESENT: "a checker artifact exists and exports `checker`",
        C1_CHECKER_RETURNS_REPORT: "checker returns `{ ok, failures, casesRun, subjectInvocations }`",
        C2_BAD_TRANSITION: "audit state transitions are legal",
        C3_PROVENANCE_LOSS: "claimed memory provenance/trust matches harness-observed provenance/trust",
        C4_FALSE_SUCCESS: "reported success has matching observed tool effects",
        C5_AUDIT_GAP: "decisions carry an audit/history trail",
        C6_LIVENESS_STALLED: "a completed trace is settled rather than stalled",
        C7_DUPLICATE_EFFECT: "irreversible effects do not run more than once",
        C8_LATE_CANCELLATION: "effects after final cancellation are rejected",
        C9_SUBJECT_INVOKED: "checker actually invokes harness cases",
        C10_RECEIPT_FORGERY: "subject-written receipts are not trusted as harness evidence",
        C11_STATUS_ONLY: "status-only validation is insufficient",
        C12_HELD_OUT_MUTANT: "held-out known-bad behavior is rejected",
        C13_REFERENCE_ACCEPTED: "clean reference behavior is accepted",
      } as Readonly<Record<string, string>>
    )[code] ?? "declared checker obligation"
  );
}
