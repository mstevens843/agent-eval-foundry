# Access Token Scope Expansion

`access-token-scope-expansion` is the first full family promoted from the Discovery Workbench probe
queue.

Source candidate: `access-token-scope-expansion`.

Source probe: `access-token-scope-expansion-probe`.

The family preserves the probe mechanism: a grant is allowed only when current token and approval
state exactly match the approved principal, resource and scope. It expands the probe into a declared
state space covering approval drift, token drift, cache freshness, request surface, repeat attempts
and seed.

Current evidence:

- 384 measured scenarios from a 1,152-point declared space.
- reference passes every scenario.
- 8/8 carried-forward known-bad subjects and baselines fail intended named checks.
- 3 mutant-detection axes.
- leak-checked 8-file challenge package.
- one counted OpenAI/Codex smoke trial, `access-token-2026-08-o1`, passed all 384 scenarios.
- transfer declaration: `access-token-to-wallet-spending-limit`.

Status: validation-mode local evidence plus counted smoke pass. The smoke pass fires the
pre-registered already_solved_or_needs_evolution signal, so full matrix spend remains blocked. The
next useful step is now concrete: Access-Token Evolution v1 selects
`delegated-wallet-scope-reconciliation-probe`, which adds delegated wallet authority, durable state,
revocation/downgrade, authoritative reconciliation, audit truth and liveness pressure. The
descendant is probe-promoted only; it is not yet a built family and has no descendant agent trials.
The transfer is still declared, not proved.
