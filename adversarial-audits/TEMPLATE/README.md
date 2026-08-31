# Adversarial verifier-integrity audit template

Use this folder shape for an attempted verifier bypass audit.

The attacker may see only the prepared adversarial bundle: public challenge package, threat model,
attacker instruction, metadata template, empty exploit directory and transcript file.

The attacker must not see hidden verifier, reference, mutants, hidden scenarios, answer matrix,
source internals, private ledgers or author hints.

Counted no-bypass evidence requires:

- current challenge hash
- declared attack surface
- declared allowed and forbidden access boundary
- preserved transcript
- preserved verifier output
- status `no-bypass-found`
- bypass classification `no-bypass`
- no provider refusal, infrastructure error, timeout, stale hash or contamination

Counted bypass evidence additionally requires a preserved exploit artifact or proof-of-concept.
