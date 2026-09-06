# Professional package portfolio

This is the Prompt 4 construction layer. It adds four professional descendants to
the existing native CAA package. Twelve protected generic families remain available
for calibration; they are not twelve additional professional contenders. The 22
research shapes, browser prototype, kernels, packages and qualified releases are
different inventories.

Status and measured package hashes belong in
[the Prompt 4 report](../reports/PROMPT-04-PROFESSIONAL-PORTFOLIO.md). Local controls
do not establish maximum hardness, a human solve, or target-model failures.

## What is runnable

| Package | Useful work and substantial interaction | Solution outline |
| --- | --- | --- |
| `caa-revalidation-repair` | Concurrent certificate authorization, current/stale cache, indeterminate names, later orders and collateral cache preservation | Keyed concurrent collection, per-name decisions and selective persistent writeback |
| `browser-replay-repair` | Real Chromium forms, recorded identity, discarded input on remount, confirmation and repeated delivery | Current-DOM interpreter plus per-step receipts and truthful all-attempt completion |
| `persistent-knowledge-repair` | Actual disk persistence across fresh processes, revision-aware derived values, complete lineage, current grants and immutable publications | Snapshot/DAG evaluation or append-only revision journal with bottom-up dependency resolution |
| `delegated-budget-repair` | Multiple requests sharing grant budgets, owner/delegate identity, revised authority, repeated deliveries and UNKNOWN transport responses | Ordered allocation plus stable request identities and attainable receipt reconciliation |
| `compatible-rollout-repair` | Mixed consumer ABI, staged generations, historical health samples, alias/cache publication, per-service rollback and scoped cleanup | Compatibility join followed by generation-bound health checks and scoped two-phase publication |

The new packages are multi-file Node applications with working public tests and a
separate protected service/driver. They do not need provider credentials. CAA
remains its original Go service. The public tests deliberately cover ordinary
working behavior; they are not fabricated green results or complete hidden suites.

## Build, validate, grade and export

Dependency setup is explicit. The browser base image and Playwright version are
pinned in `tasks/portfolio-runtime/Dockerfile`. Run the following setup once when
those dependencies are not cached; all later grading is offline:

```sh
docker build --provenance=false -t foundry-portfolio-runtime:v1 tasks/portfolio-runtime
pnpm build
pnpm package:local portfolio runtime /absolute/new/runtime-directory
```

For each of the four new package IDs:

```sh
pnpm package:local portfolio build browser-replay-repair /absolute/new/build /absolute/runtime-directory
pnpm package:local portfolio validate /absolute/build /absolute/new/verification
pnpm package:local portfolio export /absolute/build /absolute/new/recipient /absolute/verification/assurance.json
```

Outputs must be new directories: no silent merge with an older package. Validation
exits nonzero when a required operation fails and retains the unsuccessful receipt.
An export requires exact package/control identities and intact evidence bytes.
One cached runtime archive is captured, then reused with copy-on-write where the
filesystem supports it. Neither archive size nor Docker cache reuse is disguised
as independent validation evidence.

A recipient needs Node and Docker but does not need this source checkout or any
ignored planning document. The export includes the self-contained local CLI:

```sh
node /absolute/recipient/package/tooling/local-cli.mjs portfolio load-runtime /absolute/recipient
node /absolute/recipient/package/tooling/local-cli.mjs portfolio validate /absolute/recipient /absolute/new/recipient-check
node /absolute/recipient/package/tooling/local-cli.mjs portfolio grade /absolute/recipient /absolute/submitted-source /absolute/new/grade
```

`portfolio inspect BUILD` is read-only. `grade` consumes an arbitrary multi-file
submission containing `entry.mjs`, not a built-in subject name. `visible/public/`
is the authoring workspace. `package/private/`, `store/` and `verification/` are
recipient-only; never mount them in the solving workspace. The optional final
`grade` argument selects existing private scenario IDs for local diagnosis; it
does not create a new subject trial or new package identity.

Native CAA continues to use `pnpm package:local build`, `validate`, `export` and
`produce`, as documented in [package production](package-production.md). These are
locally runnable foundry artifacts. The new Node adapter layout is **not claimed
to have passed Harbor/TB3 destination acceptance**; destination packaging/rubric,
human-authored review sections and independent human solve evidence are pending.
Prompt 5 receives actual submission interfaces, not permission to execute models.

For an automated recipient check from an unrelated working directory, after
building the exports above:

```sh
node scripts/verify-portfolio-exports.mjs /absolute/new/reproduction /absolute/browser-recipient /absolute/memory-recipient /absolute/wallet-recipient /absolute/rollout-recipient
```

This repeats all twelve assurance operations per export, verifies retained browser
trace hashes, rejects artifact/evidence drift and classifies a deliberately crashing
submission as invalid. It uses each export's bundled CLI and writes separate evidence;
it does not import the current repository implementation to grade the package.

## How the boundary works

```text
PackageRecord and retained component bytes
  ├─ public modules → bounded staged copy → UID 1000 Node child
  └─ private domain + scenarios → root authority process
          ↑ allowlisted operation requests │ observed responses ↓
          └─ domain state / real Chromium / actual effect collection
                          ↓
                 behavior-only verifier
                          ↓
             versioned cells, traces and assurance
```

The root authority never imports submitted modules. It receives private files over
host-owned stdin and creates a root-only directory. The public client can request
documented operations, not evaluate arbitrary code in the authority or browser.
The shared Prompt 3 sequenced/bounded protocol executes those requests and owns the
observation ledger. Every job runs in a fresh unprivileged process; only explicitly
provided disk storage survives. This supersedes neither historical facade identity
nor old kernel behavior.

Browser event handlers call a protected backend binding. No `window.__effects`
array or known-subject identifier determines a grade. The prototype's original
three concerns—locator conflict, remount and false-ready state—are carried into
the new version; the original spike and results remain historical.
`browserProduction` exposes the successor under the existing browser family.
Captured Playwright ZIP traces, DOM snapshots, actual operations, effects and
per-attempt reports can be inspected after a local run. Trace timestamps are not
used as semantic determinism criteria.

The container is read-only except bounded temporary/state mounts, has no external
network while grading, and has CPU/memory/PID limits. CHOWN creates child-owned
storage; SETUID/SETGID launch the child and KILL reaps it. The child acquires none
of these privileges. Root-readable positive controls accompany the known child
read/write-denial control. This proves the tested boundary, not immunity to every
possible unknown implementation defect.

## Per-layer construction and evidence rationale

Origin key: **engineering transfer** means a reusable outbox process lesson;
**hypothesis** means a possible cross-task difficulty mechanism, not measured
transfer; **native** means the new family's own semantics; **validity repair**
means making grading more faithful rather than making the task harder.

### Browser

| Layer / rule | Why and origin | Observation / control |
| --- | --- | --- |
| Recorder/resolver/form/journal | Separate recorded location, current form identity, dispatch and commit; native temporal integration | Wrong-candidate control, valid receipt-first alternative |
| Explicit deterministic render queue | Real remount/settling work without timing flakiness; validity repair | Current connected/value-bearing reads; pre-fill-read control |
| Confirmation and positive completion | An accepted click is not necessarily an effect; native + hypothesis | Protected effect binding; no-confirmation and claim-only controls |
| All attempts and repeated delivery | Earlier lies and duplicate effects remain observable; engineering transfer | Per-attempt effect snapshots, repeated-delivery and post-selection early-report controls |
| Real traces and protected collection | Make future diagnosis inspectable; engineering transfer | ZIP trace hashes, denied private reads/writes, root positive control |

### Persistent knowledge

| Layer / rule | Why and origin | Observation / control |
| --- | --- | --- |
| Store and revision layers | Real serialization and replacement, not same-object memory; native | Fresh Node jobs, update events absent from later jobs; stale-revision and replace-store controls |
| Derived graph and authority | Trust/lineage covers every dependency, not just a convenient parent; native | Independent authoritative DAG closure; first-parent control |
| Current grant version | Legitimate content does not authorize an old grant; native | Actual publication payload compared to job-specific expected population; stale-grant control |
| Publication history and reports | Retrying is not new work; later updates do not rewrite old facts; engineering transfer | Per-job expected/effect prefixes, exact lineage/value, post-selection report-lineage control |
| Alternative ordering/storage | Do not grade the author's preferred representation; validity repair | Append-only/bottom-up alternative publishes independent items in reverse order and is accepted |

### Delegated budgets

| Layer / rule | Why and origin | Observation / control |
| --- | --- | --- |
| Ordered queue and aggregate allocator | Several individually affordable requests can exceed a shared budget; native | Independent expected allocation and actual balances after each job; per-request-budget control |
| Owner/delegate/current grant | These are different identities and lifetimes; native + hypothesis | Full effect descriptor and current grant state; owner-blind/stale-version controls |
| UNKNOWN and receipt resolution | Do not guess or permanently abandon work; conceptual transfer with explicit domain-native resolution | Accepted/absent receipt schedule bounded by three lookups; unknown-abandon control |
| Repeated delivery and history | Deduplicate actual intent and retain executed facts after policy changes; engineering transfer | Stable request keys, exact receipts, per-job state and post-selection receipt-claim control |
| Alternative allocator | Acceptance is not tied to one journal layout or repeated descriptions; validity repair | Ephemeral allocation table with receipt-first reconciliation versus persisted receipt cache |

### Rollout

| Layer / rule | Why and origin | Observation / control |
| --- | --- | --- |
| Catalog/consumer compatibility | Global latest is not necessarily usable by each consumer; native | Actual deployment ABI and expected per-consumer target; wrong-ABI control |
| Generation-attributed health | A green historical/foreign sample does not qualify this stage; native + hypothesis | Observed current-generation sample pairs and bind-time checks; green-history control |
| Alias plus cache publication | A count-correct rollout can retain a stale consumer binding; native | Exact independently owned deployment/alias/cache state; skip-cache and wrong-binding controls |
| Per-target rollback and preservation | One failed target cannot undo unrelated good work; native | Each entry release, real restoration generation and unaffected-service comparison |
| Temporary staging cleanup | Cleanup must finish without deleting someone else's records; engineering transfer | Owned stage IDs compared before/after; broad-cleanup and no-work controls |
| Alternative stage order | Both sequential and staged-fleet strategies are legitimate; validity repair | Two-pass independent alternative accepted |

### Native CAA

Retain the prior complete artifact's public outcome contract, concurrent authority
queries, per-name cache boundary, indeterminate outcomes, all-or-nothing issuance,
cross-order writeback and unrelated cache preservation. Both different correct
collectors and all narrow controls run through its existing real native route.

No extra rule was added merely to fill this lane. More names do not add a distinct
inference; importing outbox receipt ambiguity would misstate the actual authority
protocol; extra retry prohibitions could reject valid implementations. The current
service already combines the defensible interactions this pass identified. The
remaining keyed-planner easy route is an explicit uncertainty, not a hidden claim
of maximum hardness. Fresh controls revalidate the actual retained artifact.

## Selection, diversity and limits

The scenario grids and control consultation history are in
`data/portfolio-selection-ledger.json`. Development controls include narrow
activation/non-activation pairs. Four additional controls were authored after
freezing those generator bytes and do not select scenario membership. Their first
results are validation evidence; after inspection they become regression controls.
Do not call them permanently held out or invent an unseen second bank.

These are not five reskinned key-recovery problems. Renaming a CAA keyed collector
does not produce a live DOM interpreter, transitive revision graph, cumulative
budget allocation or fleet compatibility/rollback algorithm. The memory evaluator
needs dependency edges and version closure, which the budget allocator does not;
the allocator needs ordered resource consumption, which the rollout controller
does not; rollout needs per-consumer compatibility and qualified stage observations,
which a browser receipt journal does not supply. Shared operation collection and
some temporal-identity principles are deliberate infrastructure reuse. This is a
source/solution review, not proof of independent model failure axes.

`data/portfolio-dispositions.json` ranks and dispositions all 22 current shapes.
Research-only compensation DAGs, CRM automation and bitemporal auditing remain
named opportunities with missing work. Protected containment, token, checker and
recompute kernels remain useful calibration. No hidden scenario variant, old UI
kernel, or renamed recovery sibling is counted toward the five packages.

Easiest plausible solutions remain: CAA's keyed planner; browser drain/re-resolve
plus receipts; a complete memory DAG evaluator; serialized current-budget allocation;
and conservative two-phase rollout. Those strategies are legal. If target agents
consistently implement them fully, the construction promise is refuted—not rescued
by raising hidden thresholds or adding a ban on the successful approach.

The repeat-build review also caught Docker's nondeterministic ordering of its
multi-image export indexes in the native CAA path. The producer now canonicalizes
only these unordered top-level lists before hashing the archive. Image blobs,
layer order and task semantics remain unchanged; old archives stay preserved.

Estimated expert work is roughly 90–180 minutes depending on package and familiarity.
These are author estimates, not observed human solves or measured minimum time.
Actual model hardness, expert fairness review, destination qualification and
prospective distinct-task yield remain pending. Prompt 5 must not treat local
assurance as execution authorization.
