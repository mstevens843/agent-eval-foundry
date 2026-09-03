# Phase 13 - Controlled Family x Recipe Transfer Laboratory

## Verdict

The committed-authority recipe transferred mechanically in **3/3** substrates, and **3/3** packages are trial-ready.
The result is local verifier, activation and package evidence. It is **not agent-difficulty evidence**:
0 model reads ran and $0.00 was spent.

The precise claim is that the same narrow defect, under the same controlled factors, creates an
externally visible duplicate in three domain contracts. It does not show that an agent will write
that defect, or that these are three independent difficulty axes.

## Preregistration And Audit

The preregistration is `data/phase-13-preregistration.json` at SHA-256 `745d61bdd5b45a13bb6b699a46768691fd7bf939b217bc888185ad36fccb8db2`, written against baseline commit `7abb410`. It predicted 3/3 probe survivors.

Phase 12 correction: Four empty dao-descendant adversarial exploit/submitted-bypass directories lacked tracked .gitkeep files. Phase 13 added them after clone-fidelity failed; this repairs fresh-clone reproducibility without changing the challenge hash.

Phase 13 corrections:

- The first implementation shortened the preregistered held-out id recompute-from-attempt-counter to recompute-attempt-counter. The implementation was renamed to the registered id; the preregistration was not edited.
- The two new verifiers initially left the static specification probe blind because their recognizable outcome set sat outside a scoring-decision window. The same rule was moved into scoring scope without changing behavior; the probe now reads and clears it from visible text.
- Authoritative real-system source review for trading and deployment happened after local outcomes. It is retained as post-outcome provenance and cannot support a prospective source-first transfer claim.
- Campaign isolation was declared but not cross-checked against slot runners or preserved trial records. Plans now reject incompatible executable runners, and reconciliation reports any recorded-isolation mismatch.

The boundary-source audit is `data/phase-13-boundary-evidence.json` at SHA-256 `9f861d6ff47d2edcb5d2772c3070a8f18a4e8c42e2e064e623a7637fdf63e171`. Its timing is **post-outcome**.
These sources establish real-system precedent for the modeled boundaries. Because they were audited after the local probes ran, they do not convert Phase 13 into a prospective source-first discovery result and do not validate the exact synthetic protocols.

This timing matters: the documents show that the abstractions have real-system precedent, but
they cannot make the two novel transfers prospective or source-first after their local outcomes
were already known. Phase 13 therefore preserves that claim as **not established**.

## Boundary Proof

| substrate | stable logical identity | inaccessible witness | provenance class | sources |
|---|---|---|---|---|
| `dao-descendant` | actionId + requestId | host-owned per-action call and effect ledgers | source-task-derived | `source-task-outbox-semantics` |
| `trading-reconciliation-recompute` | orderIntentId + clientRequestId | host-owned venue call and execution ledgers | synthetic-protocol-with-real-precedent-post-outcome | `alpaca-idempotent-orders`, `alpaca-order-reconciliation` |
| `deployment-rollback-recompute` | rollbackIntentId + releaseId | host-owned controller call and rollback-effect ledgers | synthetic-composite-with-real-precedent-post-outcome | `kubernetes-external-controller-boundary`, `aws-ecs-client-token-retry`, `argo-rollout-rollback` |

For every package, the subject subprocess receives only the operation facade. The host records
calls and effects in closure-owned arrays and returns sealed data to the parent verifier. The
reference uses only the public view and facade. Trading and deployment are synthetic protocols:
the process boundary is executable, while production-system fidelity remains unmeasured.

### Documentary provenance

| source | kind | location | explicitly does not establish |
|---|---|---|---|
| `source-task-outbox-semantics` | local-primary-source | Durable approval outbox public semantics (`../klavis-terminal-bench-task/tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md`) | frontier difficulty of the repaired descendant; trading or deployment domain fidelity |
| `alpaca-idempotent-orders` | authoritative-product-documentation | [Alpaca Trading CLI - Idempotent Orders](https://docs.alpaca.markets/us/docs/alpacas-cli) | the benchmark venue receipt shape; all exchanges sharing Alpaca semantics; a guaranteed lost-response schedule |
| `alpaca-order-reconciliation` | authoritative-product-documentation | [Alpaca - Placing Orders](https://docs.alpaca.markets/us/docs/orders-at-alpaca) | exactly-once execution under every broker failure mode; the benchmark's synthetic execution ledger |
| `kubernetes-external-controller-boundary` | authoritative-project-documentation | [Kubernetes - Controllers](https://kubernetes.io/docs/concepts/architecture/controller/) | the benchmark rollback-key schema; exactly-once external compensation by itself |
| `aws-ecs-client-token-retry` | authoritative-product-documentation | [Amazon ECS - Ensuring idempotency](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_Idempotency.html) | the benchmark compensation API; a universal rollback protocol; an unbounded token lifetime |
| `argo-rollout-rollback` | authoritative-project-documentation | [Argo Rollouts - Rollback Window](https://argo-rollouts.readthedocs.io/en/stable/features/rollback/) | a client idempotency token for rollback; the benchmark's compensation-effect ledger |

The deployment abstraction is a documented-pattern composite: no cited product exposes the exact
rollback-intent protocol implemented here. The trading abstraction similarly narrows a documented
client-order identity and reconciliation boundary into a deterministic benchmark facade.

## Minimal Identifiable Design

`U` is uncertain completion after the external effect. `C` is changed recovery authority. Four
cells are the smallest design that identifies both main effects and their interaction.

| substrate | cell | reference failures | narrow exactly-once | own confirmation | effects |
|---|---|---:|---|---|---:|
| `dao-descendant` | `U0C0` | 0 | pass | green | 1 |
| `dao-descendant` | `U1C0` | 0 | pass | green | 1 |
| `dao-descendant` | `U0C1` | 0 | pass | green | 1 |
| `dao-descendant` | `U1C1` | 0 | fail | green | 2 |
| `trading-reconciliation-recompute` | `U0C0` | 0 | pass | green | 1 |
| `trading-reconciliation-recompute` | `U1C0` | 0 | pass | green | 1 |
| `trading-reconciliation-recompute` | `U0C1` | 0 | pass | green | 1 |
| `trading-reconciliation-recompute` | `U1C1` | 0 | fail | green | 2 |
| `deployment-rollback-recompute` | `U0C0` | 0 | pass | green | 1 |
| `deployment-rollback-recompute` | `U1C0` | 0 | pass | green | 1 |
| `deployment-rollback-recompute` | `U0C1` | 0 | pass | green | 1 |
| `deployment-rollback-recompute` | `U1C1` | 0 | fail | green | 2 |

Every substrate has interaction contrast **1.0**: neither factor alone duplicates work; `U1C1`
does. This rules out broad retry breakage and broad authority-change breakage in the probes.

## Activation Sweep

| substrate | grid points | broad narrow failures | by recovery actors | selected target | controls |
|---|---:|---:|---|---:|---:|
| `dao-descendant` | 72 | 27 | 1: 0/18; 2: 9/18; 3: 9/18; 4: 9/18 | 18/18 | 0/6 |
| `trading-reconciliation-recompute` | 72 | 27 | 1: 0/18; 2: 9/18; 3: 9/18; 4: 9/18 | 18/18 | 0/6 |
| `deployment-rollback-recompute` | 72 | 27 | 1: 0/18; 2: 9/18; 3: 9/18; 4: 9/18 | 18/18 | 0/6 |

The controlling condition is shared: one recovery actor structurally cannot cross authority and
fails 0/18 grid points; two or more fail 9/18 because only the uncertain half activates. Selection
raises narrow-mutant fatality from 27/72 in the broad grid to 18/24 overall and 18/18 in the named
target stratum, while retaining six non-activation controls. All target failures remain locally green.

## Held-Out Subjects

Only the reference and current-authority recompute subject informed selection. These subjects were
evaluated after the set was frozen:

| substrate | held-out subject | intended check | caught in selected | caught in target |
|---|---|---|---:|---:|
| `dao-descendant` | `no-op` | `liveness` | 24/24 | 18/18 |
| `dao-descendant` | `forged-stable-report` | `report_matches_call_ledger` | 18/24 | 18/18 |
| `dao-descendant` | `recompute-from-attempt-counter` | `exactly_once` | 18/24 | 18/18 |
| `trading-reconciliation-recompute` | `no-op` | `liveness` | 24/24 | 18/18 |
| `trading-reconciliation-recompute` | `forged-stable-report` | `report_matches_venue_ledger` | 18/24 | 18/18 |
| `trading-reconciliation-recompute` | `recompute-from-attempt-counter` | `exactly_once` | 18/24 | 18/18 |
| `deployment-rollback-recompute` | `no-op` | `liveness` | 24/24 | 18/18 |
| `deployment-rollback-recompute` | `forged-stable-report` | `report_matches_controller_ledger` | 18/24 | 18/18 |
| `deployment-rollback-recompute` | `recompute-from-attempt-counter` | `exactly_once` | 18/24 | 18/18 |

The no-op establishes the positive-work floor, the forged report establishes call-ledger
reconciliation, and the attempt-counter variant shows the frozen target is not tied to one epoch
formula.

## Frozen Packages And Campaigns

| family | challenge hash | scenario set | files | starter failures | host errors | campaign |
|---|---|---|---:|---:|---:|---|
| `dao-descendant` | `9d89b49307a960f65f2e6e8f204fd15e` | `descendant-24-21639a0f` | 8 | 18/24 | 0 | ready |
| `trading-reconciliation-recompute` | `94bfc2c401ad2cc19f7e84e8a1270a08` | `recompute-24-1063a653` | 8 | 18/24 | 0 | ready |
| `deployment-rollback-recompute` | `2ddfad2fd3287f752c41a408184b48ce` | `recompute-24-80da6d41` | 8 | 18/24 | 0 | ready |

Each matched campaign has one Codex slot and one Claude import slot, both `NOT_RUN`. Its future
$30 ceiling is a campaign authorization limit, not Phase 13 spend. A countable failure still needs
two independent blind root-cause labels; only agreed capability can become difficulty evidence.
Here `ready` means deterministic package, current hash, executable subprocess route, B6 controls,
and a reconciled campaign contract. It does not mean container-isolated, human-evidenced,
adversarial-audited, or agent-difficulty-evidenced.

## Kill Signals

| substrate | triggered |
|---|---|
| `dao-descendant` | none |
| `trading-reconciliation-recompute` | none |
| `deployment-rollback-recompute` | none |

## Interpretation

The result supports **recipe portability**: a durable logical identity, a committed key, uncertain
external completion, changed recovery authority, and an inaccessible effect witness can be expressed
fairly and checked in all three substrates. The family effect on this local interaction is zero: all
three interaction contrasts are 1.0.

The result does not yet support **hardness portability**. The three implementations are deliberately
isomorphic, the specifications state the key-recovery rule explicitly, and no agent attempted them.
A future controlled ablation must distinguish which recipe operators change agent behavior, followed
by matched cross-provider smoke trials only after those effects are registered.
It also does not establish prospective real-system transfer because the external-source audit was
performed after the local outcomes; a future transfer must begin from its source boundary.

## Evidence Limits

- Synthetic venue and controller facades are not production exchange or cloud-system measurements.
- Three domain packages carrying one interaction are not three independent failure axes.
- Mutant fatality proves verifier discrimination, not frontier difficulty.
- The campaign manifests are prepared but every slot remains unrun.
- The trial route isolates submitted code from host-owned evidence in a subprocess; it still shares the host filesystem and network, so adversarial no-bypass evidence remains absent.
- No solve-rate, capability-attribution, or cost-per-agent-failure claim is created here.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
