// arguments: extracted compatibility command services. Core APIs remain independent of dispatch.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const USAGE = `agent-eval-foundry — discover, screen and select agent-benchmark task families

ANALYSIS (how many things does an existing suite measure?)
  report <file> [--out f]        axis report for a result matrix
  json   <file> [--out f]        the same as raw JSON
    --import <source>            read a foreign format; see \`sources\`
    --null-trials <n>            significance test against a marginal-preserving null
    --null-seed <n>              seed for it (fixed by default, so reports stay diffable)
    --min-resolved <n>           swebench: drop submissions below this resolve count
    --limit <n>                  swebench: keep only the n strongest submissions

REGISTRY (what could be built, and can we detect it?)
  check                          load and validate everything; assert coverage. The CI gate.
  kill analyze <family>          why a family failed the gate, with evidence and disposition
  evolve <family> [--emit-shapes d]  variants the kill analysis justifies
  families-built                 the families that actually execute
  mechanisms [--out f]           mechanism registry report
  mutants [--out f]              mutant bank report
  ledger [--out f]               candidate ledger, led by kills
  families [--out f]             family diversity: axes, not task count
  ship [--out f]                 ship / no-ship gate table per family
  snapshot [--out f]             per-family evidence snapshot: scenarios, trials, axes, hashes
  funnel report [--out f]        adaptive discovery/validation/production funnel report
  funnel probes                  validated mechanism probes
  funnel next                    cheapest next evidence actions
  funnel transfer                transfer tests: mechanism carried across domains
  discovery report [--out f]     Discovery Workbench v1: candidate pool, scoring and queue
  discovery candidates           candidate task-family ideas before probes/families
  discovery score                deterministic cheap-screen scores
  discovery next                 next build/probe/kill/transfer queue
  discovery scaffold --candidate <id> --out <dir>
                                  draft task-shape artifact from a promoted candidate
  probes run                      run deterministic executable mechanism probes
  probes report [--out f]         mechanism probe evidence and promotion queue
  probes next                     next actions from probe evidence
  probes scaffold --probe <id> --out <dir>
                                  draft task-shape artifact from a promoted probe
  promotion report [--out f]      promoted-family build pipeline report
  promotion next                  next promoted-family build actions
  promotion scaffold --promotion <id> --out <dir>
                                  draft family skeleton from a promotion record
  lineage report [--out f]        lineage kill/reallocation learning report
  lineage next                    next cluster after solved lineages
  provider-delta report [--out f] deployment-alias mixed-provider smoke decision report
  provider-delta diagnosis [--out f]
                                  deployment-alias artifact/failure delta diagnosis
  provider-delta evolution [--out f]
                                  deployment-alias conditional evolution options
  deployment-alias readiness [--out dir]
                                  targeted deployment-alias readiness reports
  phase13 report [--out f]       retained historical family x recipe transfer report
  phase13 results [--out f]      retained structured transfer activation measurements
  phase13 design [--out f]       preregistered minimal design matrix
  phase13 measure [--out f]      explicitly run current local transfer measurements and grading
  phase14 report [--out f]       controlled agent-ablation status and effects report
  phase14 packages [--out f]     frozen seeded/neutral package hashes and B6 evidence
  phase14 scenarios [--out f]    frozen concentrated and balanced scenario views
  phase14 preflight [--out f]    cross-provider execution-readiness gate
  phase14 trials [--out f]       planned and observed attempt ledger
  phase14 effects [--out f]      operator-effect ledger and measured ranking
  phase14 challenge --family <id> --starter <profile> --out <dir>
                                  materialize one frozen ablation package
  phase14 status                  next frozen execution cell
  phase14 label --attempt <id> --reader <openai|anthropic>
                                  independently label one counted failure
  phase14 execute --attempt <id>  run exactly the next registered seeded cell
  phase15 report [--out f]       provenance-first discovery engine result
  phase15 provenance [--out f]   normalized source evidence and extraction decisions
  phase15 queue [--out f]        semantic-deduplicated candidate and reader queue
  phase15 packets [--out f]      blinded reader packets without scores or rationale
  phase15 probes [--out f]       reader-gated B6 cheap-probe results
  phase15 comparison [--out f]   discovery-method yield and cost comparison
  phase15 corrections [--out f]  audit corrections discovered during the run
  phase16 calibration [--out f]  frozen candidate-contract gate calibration
  phase16 report [--out f]       contract-complete prospective discovery result
  phase16 sources [--out f]      frozen source evidence and extraction outcomes
  phase16 contracts [--out f]    complete prospective candidate contracts
  phase16 gate [--out f]         contract-gate results for every drafted candidate
  phase16 traceability [--out f] public-rule, metric and envelope traceability
  phase16 queue [--out f]        capped semantic-unique candidate queue
  phase16 packets [--out f]      blinded immutable reader packets
  phase16 reviews [--out f]      raw review decisions or explicit provider block
  phase16 probes [--out f]       reader-gated B6 probe outcomes
  phase16 comparison [--out f]   discovery-method comparison with null blocked yield
  phase16 hashes [--out f]       frozen and generated input hashes
  phase16 corrections [--out f] audit corrections discovered during the run
  phase16 preflight [--out f]    frozen cross-provider readiness observation
  phase16 review --candidate <id> --reader <openai|anthropic>
                                  execute exactly the next frozen blind read
  phase16 next                    show the next registered reader assignment
  phase16 final-reviews [--out f] normalized continuation reviews and decisions
  phase16 final-probes [--out f] reader-gated continuation probe results
  phase16 final-comparison [--out f] completed prospective method comparison
  phase16 continuation [--out f] final continuation status and decision

  phase17 report [--out f]       the Phase 17 CAA validation result
  phase17 audit [--out f]        Phase 16 probe-contract audit and truth repair
  phase17 probe [--out f]        the exact CAA Probe V2 against its frozen registration
  phase17 controls [--out f]     runnable-package controls and the scenario activation map
  phase17 preflight [--out f]    trial preflight, provider readiness and estimated maximum spend
  phase17 ledger [--out f]       measured trial ledger, countability and the campaign decision
  phase17 next                   the next registered trial slot
  phase17 trial --attempt <id> [--retry n]  execute exactly that registered slot
  phase19 report [--out f]       UI relabelling, corrected reranking, reviews and probes
  phase19 preflight [--out f]    provider readiness and B6 status without credential values
  phase19 packets [--out f]      immutable five-trial UI label-packet manifest
  phase19 labels [--out f]       cross-provider UI root-cause decisions
  phase19 rerank [--out f]       corrected 20-family disposition and top-five queue
  phase19 reviews [--out f]      top-five cross-provider decisions and gated probes
  phase19 next-label             next UI packet/provider assignment
  phase19 label --packet <id> --reader <openai|anthropic>
                                  independently label one historical UI failure
  phase19 next-review            next top-five candidate/provider assignment
  phase19 review --candidate <id> --reader <openai|anthropic>
                                  independently review one corrected candidate
  sources                        list every matrix source, implemented and planned

FAMILIES (run a measured mini-benchmark)
  family scenarios [--out f]     generate and emit the measured scenario set
  family run [--out f]           run reference + mutants, emit the result matrix
  family report [--out f]        family report: policy, mutants, axis structure
  family axis [--out f]          axis report for the family matrix
  family sweep --family <id>     reference + mutants for any built family
  family shape --family <id>     regenerate a built family's task shape from its own code
  family postmortem <family>     the typed kill analysis for a family
  family promote <variant>       assert a proposed variant is now a built family
  cross-family [--out f]         compare measured families; verdict refused/partial/measured
  family trials [--out f]        trial-readiness: what mutants prove, what they do not
  challenge build [--out dir]    emit the agent-facing package (hidden artifacts excluded)
  trials local [--out f]         run every checked-in subject, emit trial records
  trials run --run-id <id> --model <m> [--provider <p>] [--subject <s>]
       [--timeout <ms>] [--inherit-env] [--cost <usd>] [--campaign <id>]
       [--command <argv...>]        MUST BE LAST: everything after it is the command
                                 run ONE real agent trial; writes trials/<family>/<id>/
  trials campaign [--plan f] [--run] [--only A1,A2]
                                 validate/reconcile a campaign plan; --run executes runnable slots
  trials verify --family <id> <run-id>
                                 re-grade a preserved submission; checks the challenge hash
  trials matrix --family <id>    the AGENT bank: counted trials as a matrix
  trials prepare --family <id> --out <dir>
                                 emit the exact challenge bundle + instruction for external running
  trials route [--family <id>]   what the router knows about a family
  trials providers               every adapter, and what each one needs
  trials import <dir> [--out f]  ingest agent attempts from <dir>/<run>/metadata.json
  trials bank [--out f]          every trial on record, counted and uncounted
  shared-bank [--out f]          cross-family subject overlap and what it permits
  history import [path] [--out f]  normalize Harbor run summaries: spend and waste, never evidence
  history import-trials <repo>   write the preserved cc267 runs as trial directories with per-check cells
  external packet --family <id> --provider <p> --out <dir>
                                 build third-party evidence packet with hash-pinned templates
  external validate <packet-dir> validate a returned external/human packet without importing it
  external verify <packet-dir>   grade returned submission and write verifier-output.json
  external import <packet-dir>   preserve and import a returned packet if it is countable
  external report [--out f]      external evidence intake readiness and returned-packet status
  human readiness [--out f]      public-package audit for clean-room human review
  human solvability [--out f]    counted independent human solve evidence
  browser-backed run [--out f]   run the measured Playwright-backed UI replay spike
  browser-backed verify          validate the preserved browser-backed measurement
  browser-backed report [--out f] browser-backed measurement report
  browser-backed axis [--out f]  browser-backed mutant-detection axis report
  adversarial readiness [--out f] verifier-integrity attack readiness
  adversarial campaign <family> [--json]  threat model and campaign plan
  adversarial prepare <family> [--provider p] [--out dir]  build attack packet
  adversarial import <dir>       import a completed adversarial packet
  adversarial verify <run-id>    validate one adversarial audit record
  adversarial replay <run-id>    replay a preserved exploit artifact, if one exists
  adversarial triage <run-id>    classify attempt vs bypass vs normal solve vs theory
  adversarial isolate prepare <family> [--out dir]  build fs-sandbox attack packet
  adversarial isolate verify <bundle>  check attacker-visible bundle isolation
  adversarial isolate container prepare <family> [--out dir]  build container/no-network attack packet
  adversarial isolate container verify <bundle>  validate container/no-network manifest
  adversarial isolate container smoke <family>  run container/no-network readiness smoke
  adversarial probe <family>     run deterministic verifier-integrity hardening probes
  adversarial v2 report [--out f] v2 isolation/replay/probe evidence summary
  adversarial container report [--out f] container/no-network evidence summary
  adversarial import-report [--out f] imported external adversarial evidence
  adversarial report [--out f]   counted verifier-integrity evidence
  adversarial all                regenerate campaign files and attack bundles

PRODUCTION
  scaffold --shape <file> [--out dir]
  scaffold --mechanism <id>[,<id>] --domain <d> --name <family-id> [--out dir]
  budget --total <usd> --rate <usd/h> [--target <tasks>] [--out f]
  all [--out dir]                regenerate every checked-in report

  --root <dir>                   repository root (default: cwd)
`;

export const VALUED = new Set([
  "--out",
  "--import",
  "--min-resolved",
  "--limit",
  "--null-trials",
  "--null-seed",
  "--shape",
  "--mechanism",
  "--domain",
  "--name",
  "--total",
  "--rate",
  "--target",
  "--root",
  // Added with the trial router. Every flag that takes a value must be here or `positional` reads
  // the VALUE as a positional argument — which is how `trials verify --family X <run-id>` first
  // tried to open a trial directory named after the family.
  "--family",
  "--run-id",
  "--model",
  "--provider",
  "--subject",
  "--effort",
  "--timeout",
  "--cost",
  "--campaign",
  "--candidate",
  "--probe",
  "--promotion",
  "--plan",
  "--only",
  "--emit-shapes",
  "--browser-executable",
]);

export const flag = (argv: readonly string[], name: string): string | null => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? null);
};

export const numeric = (argv: readonly string[], name: string): number | undefined => {
  const raw = flag(argv, name);
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

export function positional(argv: readonly string[], skip: number): string | undefined {
  let seen = 0;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      if (VALUED.has(arg)) i += 1;
      continue;
    }
    if (seen === skip) return arg;
    seen += 1;
  }
  return undefined;
}

export const emit = (argv: readonly string[], text: string): void => {
  const out = flag(argv, "--out");
  if (out === null) process.stdout.write(text);
  else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text, "utf8");
    process.stderr.write(`wrote ${out}\n`);
  }
};

export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
