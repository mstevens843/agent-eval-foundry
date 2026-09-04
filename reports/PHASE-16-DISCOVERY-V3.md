# Phase 16 - Candidate Contract Gate And Prospective Discovery V3

## Verdict

**REPEAT-DISCOVERY.** Discovery V3 prospectively produced one candidate that survived 2-of-2
cross-provider reading and its registered B6 probe. That is the first prospective evidence-mined
reader-and-probe survivor, but it is below the preregistered BUILD threshold of two independent
incidents across two causal axes. Phase 17's multi-family build is not unlocked.

The completed funnel is **12 source units -> 12 canonical extractions -> 6 contract attempts -> 6
gate-complete drafts -> 6 semantic uniques found -> 4 admitted packets -> 8 blind reviews -> 1
reader survivor -> 1 B6 probe survivor**. This establishes prospective candidate discovery, not
task hardness: there were zero subject trials and zero new capability-attributed failures.

## Frozen Run And Continuation

Run `phase16-contract-complete-discovery-v3` was registered at `2026-09-04T14:32:36Z` against baseline commit `6e65d2bb32666c6ddec9e54adee116beaf3770ea`.
Preregistration SHA-256: `189018ba2072c6de2b2a841b919a5f78834b8585d15e7756ad11d1eb5f6ef302`; frozen calibration: `dc85b9a1b79407ee3f0336bc821828ec739add7034af343c513a553413c2087a`; source ledger: `9eab5ca22c0dab2ae6c35996b9116ea0fd04c78a0c9881ad74797740a3f4fb6c`.
Source corpus: `d1d00e1b751c6d1e22354924bc547b4a4072bae9919d0b523b253a9f2d07035a`; packet set: `3fa172dc319ade976bbcec651ac6b2a3a5e85cc6a18be91dfcb630829958ace3`.
The real UTC clock value above and this execution transcript establish local ordering only; neither is independent third-party timestamp proof.

The initial run stopped correctly when the Anthropic provider was unavailable. After the operator
restored authentication, a separately frozen continuation reviewed only the original packet hashes;
it did not reopen source selection, ranking, drafting, or the four-packet cap.
Continuation `phase16-frozen-packet-review-continuation-v1` was registered at `2026-09-04T15:19:11Z`; preregistration SHA-256: `8feea694bf5efa909dac60757191608641b6672eedec319648ee61ec9834b600`.
This real UTC clock value and the execution transcript establish local ordering only; neither is independent third-party timestamp proof.
Phase 15 remains unchanged at zero reader survivors. Its WAF candidate and the outbox remain
retrospective calibration fixtures and do not enter a Phase 16 prospective numerator.

Registered caps: 12 sources and extractions, 6 contract attempts, 4 admitted semantic uniques, 8
cross-provider reads, 4 probes, at most $100 priced reader spend, and zero paid subject trials. No
rejected or below-cap source was replaced, and no killed candidate was repaired inside the run.

| preregistered prediction | registered | observed | status |
|---|---:|---:|---|
| extracted patterns | 8 | 12 | scored; includes four validity-only patterns |
| contract-complete candidates | 4 | 6 | met |
| semantic uniques | 3 | 6 found / 4 admitted | cap preserved |
| reader survivors | 2 | 1 | missed |
| probe survivors | 2 | 1 | missed |

## Contract Gate Calibration

The frozen contract gate ran B6 in one invocation: usable **yes**, known-good pass **yes**, known-bad fail **yes**, malformed refusal **yes**, nondegenerate **yes**.

| fixture | purpose | expected | observed | key deficiencies | held |
|---|---|---|---|---|---|
| `phase15-waf-original-negative` | retrospective negative: the exact drafting omissions both readers found | rejected | rejected | `missing-grammar`, `missing-specific-text`, `missing-nonempty-list`, `missing-nonempty-list`, `missing-grammar`, `missing-specific-text`, `missing-nonempty-list`, `missing-nonempty-list`, `missing-specific-text`, `missing-nonempty-list`, `missing-transition-semantics`, `missing-specific-text`, `missing-deterministic-meter`, `missing-numeric-threshold`, `missing-specific-text`, `missing-specific-text`, `missing-threshold-derivation`, `missing-traceability`, `ungraded-public-rule`, `ungraded-public-rule`, `ungraded-public-rule`, `missing-specific-text`, `missing-hidden-envelope`, `missing-specific-text`, `missing-nonempty-list`, `missing-specific-text` | yes |
| `repaired-waf-positive` | retrospective positive only; excluded from prospective yield | accepted | accepted | none | yes |
| `a2-repaired-dao-positive` | retrospective fairness and traceability positive | accepted | accepted | none | yes |
| `checker-hidden-vocabulary-negative` | retrospective negative: checker references an unpublished reason code | rejected | rejected | `unknown-rule-reference` | yes |
| `locally-observable-negative` | retrospective negative: divergence lives in subject-readable state | rejected | rejected | `crossable-authority-boundary`, `locally-observable-witness` | yes |
| `wrong-shaped-input-negative` | B6 malformed-input control | refused | refused | `malformed-input-refused` | yes |

The original Phase 15 WAF packet fails the six registered omissions. A separately repaired WAF
contract and the A2-repaired DAO descendant pass only as retrospective controls. Checker-only reason
codes and a locally observable witness fail. The gate reports deficiencies and never invents content.

## Prospective Sources

| source unit | channel | locator | evidence class | extraction outcome | contract attempted | canonical axis | reason |
|---|---|---|---|---|---|---|---|
| `access-token-2026-08-o1` | benchmark-trajectory-solve-patch | `trials/access-token-scope-expansion/access-token-2026-08-o1` | countable-local-trial | validity-control-only | no | `complete-solution-starter-leak` | A package leak is a validity repair, not a hard-task candidate. |
| `delegated-wallet-2026-08-o1` | benchmark-trajectory-solve-patch | `trials/delegated-wallet-scope-reconciliation/delegated-wallet-2026-08-o1` | countable-local-trial | validity-control-only | no | `complete-solution-starter-leak` | This is a second instance of the same validity defect, not a prospective candidate. |
| `deployment-alias-2026-08-o1` | agent-self-check-failure | `trials/deployment-model-alias-rollout-drift/deployment-model-alias-rollout-drift-2026-08-o1` | countable-local-trial | validity-control-only | no | `unpublished-numeric-threshold-plus-solution-leak` | The isolated cause is precisely what the new contract gate prevents. |
| `memory-poisoning-codex-3` | agent-self-check-failure | `trials/prompt-injection-memory-poisoning/mp-codex-3` | countable-local-trial | validity-control-only | no | `published-object-identity-contract-violation` | Harness conformance is a validity control, not task difficulty. |
| `gitlab-2017-database-incident` | authoritative-incident-upstream-fix | [source](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/) | first-party-observed-incident | contract-drafted | yes | `artifact-existence-without-restorable-state-proof` | The incident supplies a causal failure, a natural recovery contract, and an isolated state witness. |
| `aws-s3-2017-service-disruption` | authoritative-incident-upstream-fix | [source](https://aws.amazon.com/message/41926/) | first-party-observed-incident | contract-drafted | yes | `unbounded-blast-radius-under-valid-command` | The postmortem names both the command defect and the exact bounded-removal remediation. |
| `cloudflare-2020-backbone-outage` | authoritative-incident-upstream-fix | [source](https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/) | first-party-observed-incident | contract-drafted | yes | `unbounded-blast-radius-under-valid-command` | The exact broadening edit and two concrete safeguards are first-party documented. |
| `letsencrypt-2020-caa-recheck-bug` | authoritative-incident-upstream-fix | [source](https://bugzilla.mozilla.org/show_bug.cgi?id=1619047) | first-party-observed-incident | contract-drafted | yes | `cardinality-preserved-identity-binding-collapse` | The incident isolates value-to-identity binding and documents why count-only tests missed it. |
| `oci-image-descriptor-digest-boundary` | boundary-first-system-inspection | [source](https://github.com/opencontainers/image-spec/blob/main/descriptor.md?plain=1) | authoritative-protocol-without-observed-incident | contract-drafted | yes | `mutable-location-substitution-against-committed-content` | Exact protocol semantics make contract completion cheap; weak incident support remains explicit. |
| `kafka-transactional-producer-boundary` | boundary-first-system-inspection | [source](https://cwiki.apache.org/confluence/spaces/KAFKA/pages/66854913/KIP-98%2B-%2BExactly%2BOnce%2BDelivery%2Band%2BTransactional%2BMessaging) | authoritative-protocol-without-observed-incident | below-contract-cap | no | `stale-producer-fencing-and-sequence-authority` | Protocol-only support ranked below six sources with incidents or a simpler exact protocol. |
| `kubernetes-finalizer-boundary` | boundary-first-system-inspection | [source](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/) | authoritative-protocol-without-observed-incident | below-contract-cap | no | `cleanup-proof-before-irrevocable-finalizer-release` | Protocol-only support and likely family overlap ranked below the six drafting attempts. |
| `terraform-state-lock-boundary` | boundary-first-system-inspection | [source](https://developer.hashicorp.com/terraform/language/state/locking) | authoritative-protocol-without-observed-incident | contract-drafted | yes | `stale-lock-ownership-confusion` | The protocol exposes an exact nonce rule and a structurally separate backend witness. |

Four local trial sources yielded validity lessons rather than hardness candidates. Four first-party
incidents and two protocol boundaries consumed the six contract attempts. Kafka and Kubernetes were
preserved as measured below-cap outcomes. Every source has one canonical extraction and pinned bytes
or a local directory-manifest digest.

## Contract-Complete Queue

| candidate | source | derivation | citations / sections / depth / negative | gate | score | queue | causal axis | unresolved risks |
|---|---|---|---|---|---:|---|---|---|
| `restore-proven-backup-orchestrator` | `gitlab-2017-database-incident` | A2 | 3 / 3 / 1 / no | accepted | 85 | reader-packet | `artifact existence versus independently restored state equivalence` | A reader must decide whether this isolates one natural engineering task rather than a synthetic combination of backup operations. |
| `cell-capacity-removal-planner` | `aws-s3-2017-service-disruption` | A2 | 3 / 3 / 1 / no | accepted | 85 | reader-packet | `blast-radius bounds across overlapping subsystem capacity floors` | The public arithmetic may be straightforward enough that the candidate is fair but not difficult. |
| `bgp-route-scope-patch-validator` | `cloudflare-2020-backbone-outage` | A2 | 3 / 3 / 1 / no | accepted | 85 | reader-packet | `policy-condition deletion silently broadens a transitive route match` | A reader must distinguish this route-policy contract from the AWS candidate's broader blast-radius safety axis. |
| `multi-name-caa-revalidation-reconciler` | `letsencrypt-2020-caa-recheck-bug` | A2 | 4 / 3 / 1 / no | accepted | 85 | reader-packet | `cardinality preserved while external authorization values bind to the wrong principal identities` | The eight-hour boundary is incident-specific and must stay explicit rather than becoming hidden certificate-policy knowledge. |
| `remote-state-lock-recovery` | `terraform-state-lock-boundary` | A2 | 3 / 2 / 1 / no | accepted | 60 | below-semantic-unique-cap | `opaque lock ownership fencing across a newer remote-state version` | The state-serial conjunction extends the lock-id page with backend documentation and may be too shallow to become a hard task. |
| `oci-descriptor-verified-fetcher` | `oci-image-descriptor-digest-boundary` | A3 | 3 / 2 / 0 / no | accepted | 55 | below-semantic-unique-cap | `time-of-check/time-of-use substitution across immutable content handles and mutable retrieval locations` | This source supplies protocol precedent but no observed agent or production failure, so source support is weaker than the incident-derived candidates. |

Ranking used source support, structural completeness, isolation evidence, derivation strength, and
validity-risk penalties. Measured operator uplift was zero for every candidate because Phase 14 found
no demonstrated positive agent effect. Machine gate passage was not treated as reader survival or
hardness evidence.

## Blind Reader Gate

The original preflight is retained as chronology rather than rewritten after authentication changed:

| provider family | preflight command | authenticated then | observation |
|---|---|---|---|
| openai | `codex login status` | yes | Logged in using ChatGPT |
| anthropic | `claude auth status` | no | loggedIn false; authMethod none |

Container runtime available then: **no**. Docker API socket denied in this environment; no reader or probe was started.
The continuation normalizer B6 was usable **yes** with known-good pass, stale known-bad failure, malformed refusal, and nondegenerate controls in one invocation.

| candidate | provider | verdict | earliest non-pass | runtime | priced cost |
|---|---|---|---|---:|---:|
| `restore-proven-backup-orchestrator` | openai | kill | contract fairness | 78s | unpriced |
| `restore-proven-backup-orchestrator` | anthropic | promote | none | 160s | $0.5671 |
| `cell-capacity-removal-planner` | openai | kill | contract fairness | 66s | unpriced |
| `cell-capacity-removal-planner` | anthropic | kill | natural task contract | 238s | $0.7919 |
| `bgp-route-scope-patch-validator` | openai | kill | contract fairness | 56s | unpriced |
| `bgp-route-scope-patch-validator` | anthropic | kill | contract fairness | 247s | $0.8006 |
| `multi-name-caa-revalidation-reconciler` | openai | promote | none | 64s | unpriced |
| `multi-name-caa-revalidation-reconciler` | anthropic | promote | none | 280s | $0.8282 |

| candidate | 2-of-2 outcome | reads | reason |
|---|---|---:|---|
| `restore-proven-backup-orchestrator` | killed | 2/2 | openai: contract fairness |
| `cell-capacity-removal-planner` | killed | 2/2 | openai: contract fairness; anthropic: natural task contract |
| `bgp-route-scope-patch-validator` | killed | 2/2 | openai: contract fairness; anthropic: contract fairness |
| `multi-name-caa-revalidation-reconciler` | survived | 2/2 | Both independent provider families promoted every required dimension. |

All 8 registered reads completed. Priced Anthropic spend was **$2.9878**; 4 OpenAI reads lack provider cost telemetry and are unpriced, not free.
The capacity candidate was independently killed for missing callable/index semantics and for a host
safety guard that made the headline safety metric non-discriminating. BGP was independently killed
because its hidden edit-target dimension was absent from public input; one reader also found an
always-refuse strategy that passed all declared checks. Backup split because one reader accepted
conventional facade semantics while the other refused to supply unstated return schemas.
Only multi-name CAA identity binding passed all six dimensions for both provider families.

## Probe Gate

| candidate | outcome | B6 usable | mechanism active | observed mutant failures | reason |
|---|---|---|---|---|---|
| `restore-proven-backup-orchestrator` | not-run-reader-killed | not run | not run | not run | At least one independent reader killed the candidate. |
| `cell-capacity-removal-planner` | not-run-reader-killed | not run | not run | not run | At least one independent reader killed the candidate. |
| `bgp-route-scope-patch-validator` | not-run-reader-killed | not run | not run | not run | At least one independent reader killed the candidate. |
| `multi-name-caa-revalidation-reconciler` | survived | yes | yes | `check-caa-per-name-binding`, `check-caa-safe-issuance` | All registered probe controls and the exact narrow-mutant profile held. |

Only the unanimous CAA candidate was eligible. In one invocation its reference passed, the narrow
first-name-reuse mutant failed exactly `check-caa-per-name-binding` and `check-caa-safe-issuance`,
malformed input was refused, replay was deterministic, the mechanism activated, the authority witness
remained inaccessible, and the challenge did not leak it. The other three probes were not run.

## Method Comparison

| method | systems/sources | drafts | reader survivors/reviewed | probe survivors/run | domains | axes | reads | priced cost | claim boundary |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| evidence-mined-v2 | 4 | 2 | 0/1 | 0/0 | 2 | 2 | 2 | $0.00 | Prospective source-to-probe yield only; no agent difficulty or shipped-family claim. |
| transfer-based | 3 | 3 | 0/0 | 3/3 | 3 | 1 | 8 | $1.99 | Three local mutant transfers survived, but 8/8 countable agents solved and strict axis novelty is zero. |
| boundary-first | 3 | 1 | 0/1 | 0/0 | 1 | 1 | 2 | $0.00 | Registered search: one draft, killed by both readers, zero survivors. |
| author-generation | 0 | 5 | 0/5 | 0/0 | 5 | 1 | 7 | $0.00 | Historical 0-for-5: every author-generated candidate lacked a structural witness boundary. |
| contract-complete-evidence-mining-v3 | 12 | 6 | 1/8 | 1/1 | 6 | 6 | 8 | $2.99 | One prospective candidate survived 2-of-2 cross-provider reading and its local B6 probe; no subject trial or capability difficulty is established. |

Discovery V3 improves the project's prospective result from zero reader survivors to one reader-and-
probe survivor. It does not establish repeatable discovery yield, family breadth, or difficulty. Search
labour was not timed, and four reads are unpriced. Transfer still has more local package survivors, but
Phase 14's subjects solved all eight transfer cells.

## Decision And Next Gate

The registered decision is **`REPEAT-DISCOVERY`**: Exactly one candidate survived independent reading and its B6 probe. Repeat prospective discovery before building a multi-family phase.
Do not run the planned multi-family Phase 17 build yet. The next phase should repeat Discovery V3 on
a fresh bounded corpus, treating CAA only as a retrospective calibration fixture and requiring the
same 2-of-2 reader and B6 probe gates. BUILD unlocks only when at least two candidates survive from
independent incidents and at least two causal axes.

## Corrections And Limits

- Two preregistered local benchmark solves were complete-solution starter leaks, so they contribute validity-control patterns rather than evidence that either mechanism was easy.
- The deployment-alias failure was caused by an unpublished numeric threshold present only in a passing starter; it is not a capability failure and now calibrates the threshold-derivation gate.
- The memory-poisoning failure was caused by the host violating its published same-facade lifetime contract; it is not a candidate source for difficulty.
- The initial run could not score reader or probe predictions because Anthropic authentication was unavailable. Its base artifacts preserve null rather than zero; the separately preregistered continuation owns the later measured outcomes.
- All six attempted contracts passed the machine completeness gate. This validates drafting structure only; it does not establish fairness, naturalness, novelty, probe survival, or agent difficulty without independent review.
- Six unique drafts were found, but only the top four were admitted under the preregistered semantic-unique and reader-packet caps; the other two remain measured below-cap outcomes.
- Boundary-first protocol sources without observed incidents receive no incident-support credit and no measured operator uplift. Phase 14 measured no positive agent effect.
- The original null reader/probe result was correct when recorded; it is preserved in the base artifacts
  and superseded, not rewritten, by the separately preregistered continuation.
- Six machine-complete contracts became four packets and only one reader survivor. The contract gate
  catches missing fields, not contradictions, null policies, or all forms of non-discriminating grading.
- A reader split is a kill under the frozen 2-of-2 rule. Backup cannot be repaired and counted inside
  this run even though its missing facade schemas appear repairable.
- The CAA result is candidate validity plus local mutant discrimination. It is not an agent solve-rate,
  capability attribution, task family, shipped task, or production-yield estimate.
- Local timestamps and transcript ordering establish local chronology only, not independent third-party
  proof. Review outputs, metadata, transcripts, and normalized records are preserved and hashed.

## Reproducibility Inputs

| input | SHA-256 |
|---|---|
| preregistration | `189018ba2072c6de2b2a841b919a5f78834b8585d15e7756ad11d1eb5f6ef302` |
| sourceCorpus | `d1d00e1b751c6d1e22354924bc547b4a4072bae9919d0b523b253a9f2d07035a` |
| calibration | `dc85b9a1b79407ee3f0336bc821828ec739add7034af343c513a553413c2087a` |
| sourceLedger | `9eab5ca22c0dab2ae6c35996b9116ea0fd04c78a0c9881ad74797740a3f4fb6c` |
| preflight | `b4768def2a6c6f6f554576bc759b69db5114b22389d689d9253c6944e1953a9c` |
| readerOutputSchema | `e6f076483364ecb51ab3e23e71cef264bc64667845af988346e2716c296aa293` |
| contractGateSource | `d005856c34c9d04378aea0e107220b13d3e3cd2549c65afe9203f8b0e64f9fc4` |
| contractSchema | `ae9d02567fdab71ca3495ceb5b1e70071d9e706ae6a4f920c83ca360edaa86f1` |
| contractSet | `0e0979524bf6cc7ca65715f353636f4d4f8c8da841551197657001810b6d7550` |
| packetSet | `3fa172dc319ade976bbcec651ac6b2a3a5e85cc6a18be91dfcb630829958ace3` |
| rawReviewSet | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| normalizedReviewSet | `2515cebbc76d77cf928960a4a6626dd52340cbf477c6872e4a26064fad482386` |
| snapshots | 8 source snapshot digests (see structured artifact) |
| continuationPreregistration | `8feea694bf5efa909dac60757191608641b6672eedec319648ee61ec9834b600` |
| readerInstructions | `1b7759b910d7f19d02c82bbda786eb347201fadbcec3dbd21931b747db2bb2ce` |
| probeImplementation | `bf98d8164c5fa2bdcbc07d122d4fee9b2fa758186d27505f6ccfb33f417f0023` |
| finalRawReviewSet | `dbf3197d0e556b15ac91d915bef8d80c322e46195da47054582c538c2100cb61` |
| finalNormalizedReviewSet | `959b6cb43a256527b1e3bd41501be24f8223318e110f190ca38d68c36d1db6d9` |

The dedicated verifier regenerates every Phase 16 result view and this report byte for byte. Focused
tests cover calibration, malformed refusal, evidence binding, caps, blinding, exact review closure,
2-of-2 promotion, reader-gated probe execution, exact mutant fatality, and the final decision. The long
repository-wide report walk remains deferred to the operator's periodic cadence.
