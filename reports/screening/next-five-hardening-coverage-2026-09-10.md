# Five-successor obligation and coverage map

This is the coverage map for the September 10 hardening of Route, Browser,
Calendar, Workflow and Budget 3.0.0. It describes engineering tests, not model
trial outcomes. Read it with the [hardening report](next-five-hardening-2026-09-10.md)
and [evidence manifest](evidence/2026-09-10-next-five-hardening.json).

The public contracts define correctness. A hidden test may exercise a consequence
of those contracts without supplying the solution in the prompt. Tests must also
accept permitted implementations and recovery paths. This follows the TB3
`test_instruction_alignment`, `outcome_verified`, `anti_cheat_robustness` and
`instruction_concision` criteria in the
[implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml).
No exact rejection labels, prescribed journal format or preferred algorithm were
added. The benchmark asks for a highly reliable verifier, not proof of perfection.

The service grader executes the submitted service against a trusted authority.
The submitted checker is a second required deliverable: it classifies raw traces
of other implementations. Its private candidate bank contains both incorrect
programs and complete correct alternatives. Host-enforced invariants below are
mechanically enforced at the API boundary; the checker is not expected to detect
fabricated authority records that the harness cannot produce.

## 14 — Route policy

Contract: [SEMANTICS.md](../../tasks/route-policy-repair/public/SEMANTICS.md).
Implementation: [service grader](../../tasks/route-policy-repair/private/domain.mjs),
[checker](../../tasks/route-policy-repair/private/reference/checker.mjs),
[candidate manifest](../../tasks/route-policy-repair/private/control-manifest.json).

| Existing obligation | Service enforcement and checker evidence | Discriminating cases / permitted alternative |
|---|---|---|
| Preserve nested calls, returns, defaults and ordered mutations when translating to flat rules | `translation`; independent stack interpreter, target evaluator and equivalence partition | `lost-return`, `drop-mutation`, `original-preference`; migration cases |
| Match source rules against current attributes, and requested changes against original input | `translation`, `scoped_behavior`, `positive_change` | `mutated-scope`; source/target evaluation differs on intermediate mutations |
| Change only accepted, requested routes; retain all other egresses, decisions and attributes, including rejected-route attributes | `translation`, `preservation`; compare egress sets and full evaluation | `changed-unrequested-egress`, `changed-rejected-attributes` |
| Preserve behavior for the complete admitted route space, not only supplied sample routes | Full equivalence calculation over prefix/community classes | `unsampled-route`; a wrong /32 outside the sample list defeats the weakened sample-only checker |
| Obey target grammar, vocabulary and capacity; publish one accepted result and stop publishing afterward | `legal_config`, `completion`; target validator and publication history | `publish-after-success`, `no-work`; six-egress and twelve-community boundary cases |
| Failed publication attempts may be corrected; equivalent flat encodings and legal redundant rules are allowed | Failed calls leave the authority unchanged; checker evaluates semantics | Complete `alternative` and `redundant-flat-rules` variant, including unreachable rules, reordered edits and rejected-then-corrected publication |

The removed public translation-hazard tutorial was redundant with the formal
language contract. No required syntax or source/target semantics were removed.

## 03 — Browser replay

Contract: [SEMANTICS.md](../../tasks/browser-replay-repair/public/SEMANTICS.md).
Implementation: [service grader](../../tasks/browser-replay-repair/private/domain.mjs),
[checker](../../tasks/browser-replay-repair/private/reference/checker.mjs),
[candidate manifest](../../tasks/browser-replay-repair/private/control-manifest.json).

| Existing obligation | Service enforcement and checker evidence | Discriminating cases / permitted alternative |
|---|---|---|
| Operation identity is `(traceId,step)`, even for identical payloads; complete every operation | `completion`, `exact_effects`; ordered expected operation tuples | `tuple-identity`, `skip-later-steps`, `no-work`; Unicode trace ID, noncontiguous steps and empty value |
| Effects occur once, in recorded order, across independent deliveries and process restart | Exact ordered effects and per-attempt effect snapshots | `out-of-order-effects`; restart schedules and complete repeated-operation variant |
| Only intended operation/entity/field/value combinations may be submitted, even if later repair would hide a wrong action | `current_preconditions`; inspect all accepted application actions | `wrong-action-after-effects`; weakened action-blind checker accepts it |
| DOM mount, readiness, generation and session must be current at submission | Conditional bridge enforces the UI precondition atomically; no required observe-after-fill sequence | Remount/session schedules; reference, alternative and returned-fill-state strategies remain legal |
| Confirmation must belong to the intended operation, not a competing or stale dialog | Application's conditional confirmation plus `preservation` and effect confirmation identity | `competing-dialog`; confirmation/decoy schedules |
| Pending work and hidden receipts are not completed work; reports must match effects at each completed attempt | `completion`, `reports`, per-attempt snapshots | `pending-complete`, `incorrect-completion-report`; polling, settling and lost-response recovery |
| Same-operation retries are idempotent; failed UI/API attempts may be corrected | Host deduplication and positive candidate classification | `repeat-committed-operation` variant defeats the checker that forbids repeated submissions |
| Evaluation must use the authentic browser/application boundary | Private authority token on HTTP ingress; public/private application sources remain identical | Eight unauthenticated HTTP routes return 401 without effects; authenticated access succeeds. The normal bridge carries the token privately |

The HTTP token is verifier isolation, not an additional task requirement or a
credential the solver must discover. The public demo works without that private
evaluation token. Normal authoring internet access is unchanged.

## 18 — Recurring calendar

Contract: [SEMANTICS.md](../../tasks/recurring-calendar-repair/public/SEMANTICS.md).
Implementation: [service grader](../../tasks/recurring-calendar-repair/private/domain.mjs),
[checker](../../tasks/recurring-calendar-repair/private/reference/checker.mjs),
[candidate manifest](../../tasks/recurring-calendar-repair/private/control-manifest.json).

| Existing obligation | Service enforcement and checker evidence | Discriminating cases / permitted alternative |
|---|---|---|
| Apply daily/weekly recurrence, intervals, exclusions and realizable original recurrence IDs | `occurrence_identity`, independent materialization | Existing recurrence cases; `display-time-identity` |
| Convert supplied transition zones correctly, including gaps, earliest fold instant and elapsed duration | `civil_time`; independent interval-inversion checker versus grader's time search | `fixed-zone-offset`, transition and combined cases |
| Apply source exceptions and ordered single/future changes by original `(uid,rid)`; preserve cancellation history and attendees | `history`, `preservation`, `occurrence_identity` | `display-time-identity`, `repaired-event-corruption`; attendee-order variation remains valid |
| Highest revision wins; retain tombstones, ignore older duplicates and allow higher-revision resurrection | `source_revisions`; reconstruct source from ordered deliveries | `arrival-order`, `repaired-source-corruption`, `tombstone-resurrection` |
| Publication window selects original recurrence IDs; amendments replace stale task rows | `occurrence_identity`, materialize full current source before windowing | `display-window`, combined amendment cases |
| Every successful generation must contain mutually consistent records, events and bookings | Sticky service flags plus all successful publication snapshots, not final state alone | `repaired-source-corruption`, `repaired-event-corruption`, `repaired-booking-deletion` |
| Retain all external bookings, remove stale owned bookings, and book only active non-null-room rows | `bookings`; independent keys and expected booking reconstruction | `append-bookings`, `drop-foreign`, concurrent-booking cases |
| Publish is atomic and fenced; bounded malformed requests return errors without mutation | Host structural type/fence checks; successful outputs then undergo semantic checks | Stale-generation schedules; null-row and unknown-record-kind recovery in the positive variant |
| Every delivery, including duplicate updates, must acknowledge a current consistent generation; recover after lost publish/ack response | `completion`; per-delivery prefix and latest acknowledgement summary | `missing-acknowledgement`, `forged-completion`, `ack-response-loss` |
| Recompute, republish and re-acknowledge correctly; event/attendee order is irrelevant | Positive classification after repeated generations and acknowledgement | `republish-and-reack` variant; over-strict republication/error checkers are detected |

The authority now advances an existing delivery's acknowledgement summary when
a later current generation is successfully acknowledged. It previously left the
old generation there and falsely rejected legal recovery. Ordered calls remain
available in `observations`; the public checker schema now describes the summary.

## 20 — Workflow authority

Contract: [SEMANTICS.md](../../tasks/workflow-authority-repair/public/SEMANTICS.md).
Implementation: [service grader](../../tasks/workflow-authority-repair/private/domain.mjs),
[checker](../../tasks/workflow-authority-repair/private/reference/checker.mjs),
[candidate manifest](../../tasks/workflow-authority-repair/private/control-manifest.json).

| Existing obligation | Service enforcement and checker evidence | Discriminating cases / permitted alternative |
|---|---|---|
| Root-ancestor principal is origin; routing workers do not grant authority | `origin_identity`; independent parent walk | `wrong-origin`, `superseded-origin` |
| Use each job's exact resource, action and payload | `effect_payload`, `policy_at_effect`; compare records with immutable catalog | `wrong-payload`, `superseded-payload` |
| Permission requires an active, correctly scoped directed grant path; no principal repeats; an alternate surviving path remains valid | `policy_at_effect`; independent reachability and supplied-path validation | `empty-path`, `deny-all`, policy boundary cases, alternate traversal in positive variant |
| Every accepted admission must be authorized at its boundary, including admissions later superseded | Sticky authority/identity/payload flags; checker examines every admission and its policy | `superseded-path`, `superseded-origin`, `superseded-payload` defeat terminal-only checking |
| Dispatch must use the latest admission with both revisions current; effects retain admitted identity and payload | Host token/revision fences plus `policy_at_effect` and `effect_payload` | Post-admission revocation cases; `admission-only`; legal admission replacement |
| Pending committed work is not absence; terminal decisions and effects survive later policy changes and redelivery | `terminal_history`, `completion`; one decision per encountered job, effects matched to decisions | `pending-complete`, interruption and boundary schedules |
| Every delivery finishes with its own job's terminal decision; no extra work or deny-all shortcut | `completion`, `positive_work`, `terminal_history` | `wrong-delivery-association`, `deny-all`, `no-work` |
| Recover from malformed calls, stale fences, lost responses and repeated operations without enforcing a journal design | Host request errors and retained authority state; correct alternatives | `replacement-and-retry` variant repeats admissions/dispatches, changes valid path traversal and recovers from errors |

## 04 — Delegated budget

Contract: [SEMANTICS.md](../../tasks/delegated-budget-repair/public/SEMANTICS.md).
Implementation: [service grader](../../tasks/delegated-budget-repair/private/domain.mjs),
[checker](../../tasks/delegated-budget-repair/private/reference/checker.mjs),
[candidate manifest](../../tasks/delegated-budget-repair/private/control-manifest.json).

| Existing obligation | Service enforcement and checker evidence | Discriminating cases / permitted alternative |
|---|---|---|
| Wallet/grant scopes and exact reservation IDs are distinct; closed reservation IDs stay bound | `aggregate_budget`; independent ledger reconstruction and eligibility | `cross-wallet`, `reuse-reservation`; `exact-string-identities`, including `1`, `01` and prototype-like names |
| New holds require the matching owner, delegate, allowed grant and exact current version | Eligibility at every accepted revision, not current final terms | `wrong-owner-admission`, `wrong-delegate-admission`, `stale-reserve-version`; isolated `owner-alone` request |
| Lifetime use is captured spending plus outstanding holds across all grant versions | `aggregate_budget`; reconstruct holds/captures/releases independently | `ignore-holds`, `release-captured`; capture-frees-allowance mutation is detected |
| Settlement binds to its original hold's owner/delegate/grant, may not exceed its remainder, and processes in request order | Host request-order fence plus settlement eligibility and ledger comparison | `over-settlement`, `closed-and-over-settlement`; independent complete alternatives |
| Existing holds survive later revocation, delegate/version replacement and reduced limits | Historical reservation terms govern settlement, not current grant version | `settle-current-version`; grant-update and reduced-limit schedules |
| Each first accepted/rejected decision must match eligibility; terminal rejections remain terminal | `aggregate_budget`, `decisions`; reconstruct each accepted conditional boundary | `reject-valid-reservation`, reserve/duplicate/rejected command cases |
| UNKNOWN/PENDING may represent committed work; retries must not double-spend or release a different hold | Host command deduplication plus reconstructed ledgers and per-job prefixes | `uncertain-abandon`; lost-response schedules and `idempotent-settlement` variant |
| Return exact authoritative decisions/receipts in input order, including duplicates | `decisions`, `completion`; compare every completed report with command history | `wrong-report-receipt`, `uncertain-abandon`, `no-work` |
| Corrected API errors, polling, idempotent retries and alternate snapshot ordering are legal | No blanket error rejection; host leaves failed requests unchanged | `idempotent-settlement` variant reverses snapshot rows, retries decided commands and recovers from malformed input |

## Shared checker, verifier and packaging obligations

| Obligation | Executable coverage |
|---|---|
| A verdict for every opaque candidate token; boolean `ok`; optional diagnostic reasons | Native missing-verdict, always-accept and always-reject controls; exact output validation; arbitrary diagnostic text accepted |
| Deterministic and nonmutating checker inputs | Two invocations within the shared time budget; recursively frozen inputs before importing submitted code; mutation, mutate-then-restore and JSON-hook attacks fail |
| Accept permitted complete implementations as well as reject actual violations | Reference, independent alternative and additional complete positive variant per package; 23 weakened/over-strict checker mutations exercised against recorded executions |
| Keep reference code, labels, journals and reward authority private | Separate verifier image; root-only private/candidate directories; revoke journal access after each scenario; explicit read/write-denial probes |
| Submitted descendants may not survive to see published private results | Kill remaining submitted-UID processes; a detached child is confirmed started, then prevented from writing after checker completion |
| A forged reward or output symlink cannot manufacture success | Untrusted write/symlink probe receives a clean zero; trusted output is published by atomic replacement after process cleanup |
| Artifact, execution and resource boundaries remain valid | Regular-file-only copies with size/count/depth limits; bounded protocol and child timeouts; native static checks; assurance rejects artifact/evidence drift and excludes invalid execution |
| Public environment must not contain answers; network restrictions must be scoped correctly | Only public files enter the author image; private grader/solution enter separate images; Browser public/private application copies match; solver internet remains available |
| Foundry and native Harbor evaluate the same semantic population | Both now include all scenarios and all three positive candidates; candidate counts match for each package; native replay provides independently captured trace banks |

This map groups related fields under their contractual obligation. It does not
claim exhaustive enumeration of every possible program or adversarial payload.
Mutant detection is evidence of discrimination, not a forecast of model failure.
