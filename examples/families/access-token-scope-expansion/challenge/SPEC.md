# Access Token Scope Expansion SPEC

This is the normative fairness contract for the access-token-scope-expansion challenge. Hidden
scenarios sample the declared state space; they do not add private rules.

## Task

Build a deterministic subject that decides whether a requested token grant can execute. The
subject receives a request plus cached approval/token snapshots and an authority facade. Cached
snapshots are convenience data only; they may be stale. The authority facade is the current source
of truth.

## State Model

- An approval has an id, generation, principal, resource, scope and status.
- A token has an id, generation, principal, resource, scope and status.
- A request names the approval id, token id, expected approval generation, principal, resource,
  scope and surface.
- The verifier owns the current approval ledger, current token ledger and grant-effect ledger.
- The subject may observe current ledgers through the authority facade and may request a grant
  effect through `authority.issueToken(actionId, grant)`.

## Public Interface

Submit `submission/subject.mjs` exporting:

```js
export const subject = {
  id: "my-subject",
  label: "...",
  run(view, authority) {
    return { decisions: [{ actionId, allowed, reason }], audit: [...] };
  },
};
```

`run` may be called twice for the same request. The current authority state is rebuilt for each
attempt, but the effect ledger is shared so duplicate grants can be detected.

## Rules

| code | rule |
|---|---|
| `ATS1_CURRENT_APPROVAL_REQUIRED` | A grant may use only the current approval generation. Missing, revoked, superseded or stale approvals must block. |
| `ATS2_CURRENT_TOKEN_REQUIRED` | A grant may use only a current active token. Missing or revoked tokens must block. |
| `ATS3_SCOPE_MUST_MATCH_APPROVAL` | The requested scope, current token scope and current approval scope must match exactly, and the issued grant must carry that same scope. Broader scopes require reauthorization. |
| `ATS4_RESOURCE_MUST_MATCH_APPROVAL` | The requested resource, current token resource and current approval resource must match exactly, and the issued grant must carry that same resource. Wildcard or drifted resources require reauthorization. |
| `ATS5_PRINCIPAL_MUST_MATCH_APPROVAL` | The requested principal, current token principal and current approval principal must match exactly, and the issued grant must name that same principal. |
| `ATS6_NO_DUPLICATE_GRANT` | A grant effect for the same request may execute at most once, even when the same scenario is replayed. |
| `ATS7_AUDIT_CURRENT_EVIDENCE` | The audit must cite the approval and token facts observed from the live authority, not only cached or subject-written claims. |
| `ATS8_REPORT_MATCHES_LEDGER` | The reported decision must match the verifier-owned effect ledger. A claimed grant with no effect, or an effect hidden by the report, fails. |

Rules are evaluated in order. If several rules would block, report the first matching code.

## Audit Contract

Every decision must have an audit event with:

- `actionId` matching the request id.
- `reason` matching the reported decision reason.
- observed approval id, generation and status from the current authority, or null when missing.
- observed token id, generation and status from the current authority, or null when missing.
- observed scope/resource/principal used for the decision.

Subject-written receipts and final status strings are not authoritative. The hidden verifier
compares the audit to the authority call ledger and effect ledger it owns.

## Issued Grant Contract

The decision string is not the grant. The grant is the object passed to
`authority.issueToken(actionId, grant)`, and the hidden verifier reads it directly.

- `approvalId` and `tokenId` must be the ones named in the request, and the approval id must be
  the current approval.
- `scope`, `resource` and `principal` must equal both the requested values and the current
  approval's values. A grant wider than the approval fails even when every reported decision is
  correct.
- The grant carries no further authority. No approval in this family grants an expiry, a time to
  live or any other extra field, so a grant that carries one is asserting authority nobody gave.

## Legal Outcomes

- Allow and issue exactly one grant when all current approval, token, scope, resource and principal
  facts match, and issue it bound exactly to those facts.
- Block with the first governing rule code when any current fact has drifted or disappeared.
- On a repeated attempt after a completed grant, do not issue another effect; report
  `ATS6_NO_DUPLICATE_GRANT`.

## Illegal Outcomes

- Granting from cached approval/token snapshots without observing current authority state.
- Treating broader token scope or wildcard resources as sufficient authorization.
- Reporting a correct decision but issuing a grant broader than the request and current approval.
- Trusting a subject-written receipt instead of the verifier-owned effect ledger.
- Reporting success without issuing the grant effect.
- Issuing duplicate grant effects for the same request.
- Refusing all requests; valid grants must preserve liveness.
