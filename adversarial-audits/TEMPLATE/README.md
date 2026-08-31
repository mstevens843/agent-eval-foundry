# Adversarial verifier-integrity audit template

Use this folder shape for an attempted verifier bypass audit.

The attacker may see only the prepared adversarial bundle: public challenge package, threat model,
attacker instruction, metadata template, empty exploit directory and transcript file.

The attacker must not see hidden verifier, reference, mutants, hidden scenarios, answer matrix,
source internals, private ledgers or author hints.

v2 separates attempted bypass, normal solution, theoretical issue, preserved exploit artifact,
mechanical exploit replay, forbidden access and verifier-confirmed no-bypass.

Counted no-bypass evidence requires:

- current challenge hash
- declared attack surface
- declared allowed and forbidden access boundary
- adequate isolation profile
- preserved transcript
- preserved verifier output
- preserved exploit replay output
- mechanical triage `no-bypass-confirmed`
- attacker actually attempted a bypass
- status `no-bypass-found`
- bypass classification `no-bypass`
- no provider refusal, infrastructure error, timeout, stale hash or contamination

Counted bypass evidence additionally requires a preserved exploit artifact that replays against the
current verifier, passes, violates the public contract, and does not depend on forbidden access.
