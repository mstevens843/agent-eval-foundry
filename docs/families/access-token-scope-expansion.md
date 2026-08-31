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
- no counted real-agent trial yet.

Status: validation-mode local evidence only. The next earned step is one OpenAI/Codex smoke trial
against the current package hash, followed by diagnosis. Full matrix spend is blocked until smoke
and transfer evidence exist.
