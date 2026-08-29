// The scaffold generator: registry in, a startable task folder out.
//
// This does not emit a runnable Terminal-Bench task, and pretending otherwise would be the dishonest
// version of this module. Building the shipped durable-outbox task took roughly 45 hours, most of it
// in the three-process verifier; no generator is going to produce that from a mechanism id. What a
// generator CAN do is remove the part of the work that is genuinely mechanical: pulling the right
// mutants out of the bank, restating the mechanism's fairness risks as a checklist the author has to
// tick off, and refusing to emit a folder that lacks any of them.
//
// The value is therefore in what it REFUSES to leave out. Every artifact in ARTIFACT_PLAN exists
// because its absence was a real failure in the source project:
//
//   hidden-test-plan      the 5/6 false positive happened because hidden coverage was chosen by
//                         intuition and never written down as a sampling plan.
//   mutant-plan           two of three Opus engines wrote checkers that could not express the rule;
//                         a named mutant list is what turns "my checker works" into a claim.
//   fairness-checklist    four of nine gated mechanisms died as unfair or already-solved, which is
//                         cheaper to discover on paper than after a build.
//   cheat-resistance      three real verifier bypasses were found in the shipped task's own grader.
//
// Output is an in-memory manifest rather than direct disk writes, so the generator stays pure and
// the CLI owns I/O. `scaffold-check.ts` grades this output and does not import this file.

import type { Registry } from "./registry.js";
import type { Mechanism, Mutant, TaskShape } from "./schema.js";

export interface ScaffoldFile {
  readonly path: string;
  readonly content: string;
}

export interface ScaffoldMetadata {
  readonly familyId: string;
  readonly name: string;
  readonly domain: string;
  readonly mechanisms: readonly string[];
  readonly mutants: readonly string[];
  readonly generatedFrom: "mechanism" | "shape";
  readonly artifacts: readonly string[];
}

export interface ScaffoldOutput {
  readonly familyId: string;
  readonly metadata: ScaffoldMetadata;
  readonly files: readonly ScaffoldFile[];
}

/** The artifact table. `scaffold-check.ts` enumerates the same list; neither imports the other. */
export const ARTIFACT_PLAN = [
  "family.json",
  "instruction.draft.md",
  "hidden-test-plan.md",
  "reference-checklist.md",
  "mutant-plan.md",
  "fairness-checklist.md",
  "cheat-resistance-checklist.md",
  "README.md",
] as const;

const bullets = (items: readonly string[]): string =>
  items.length === 0 ? "_none recorded_" : items.map((i) => `- ${i}`).join("\n");

const checkboxes = (items: readonly string[]): string =>
  items.length === 0 ? "_none recorded_" : items.map((i) => `- [ ] ${i}`).join("\n");

const instruction = (name: string, domain: string, mechs: readonly Mechanism[]): string => `# ${name}

> DRAFT. This is a starting point, not a shippable instruction. Everything below is derived from the
> mechanism registry; the domain specifics are yours to write.

Repair the ${domain} system in \`/app/\` so that it behaves correctly under the conditions described
below.

## What must hold

${bullets(mechs.map((m) => m.whatCorrectSystemsDo))}

## The conditions that make this hard

${bullets(mechs.map((m) => `${m.name}: ${m.summary}`))}

## Author's checklist before this instruction ships

- [ ] Every rule the verifier grades appears above. Fairness requires the agent can read it.
- [ ] The instruction states that invariants hold for every seed and configuration the harness can
      generate, not only the shipped examples. Without that sentence the hidden sampling region is
      indistinguishable from a secret rule.
- [ ] Absolute paths throughout.
- [ ] The required timeout sentence from the current contributing guide is the last line.
`;

const hiddenTestPlan = (shapeLike: {
  hiddenGradedRegion: string;
  knobs: readonly { name: string; purpose: string }[];
}): string => `# Hidden test plan

## Sampling region

${shapeLike.hiddenGradedRegion}

This is a SAMPLING statement. If it reads as a rule the agent could not have known, the family is
unfair and needs reworking before any budget is spent.

## Parameters to sweep

${bullets(shapeLike.knobs.map((k) => `\`${k.name}\` — ${k.purpose}`))}

## The selection error to avoid

Validating that a trap is *robust* is not the same as identifying which parameter *controls* it. In
the source project the hidden family was chosen against an engine that carried the target bug so
broadly that every parameter value looked like a trigger; against a stronger engine only one value
actually fired, and the suite passed a defective implementation.

- [ ] For each hidden point, name the parameter that controls whether the mechanism fires.
- [ ] Select against the narrowest-signal adversary available, not the broadest.
- [ ] Every selected point must catch engines that had no role in selecting it.
`;

const referenceChecklist = (contract: readonly string[]): string => `# Reference solution checklist

The reference exists to prove the family is solvable at all. Until it passes, no trial budget should
be spent: a family whose reference fails is measuring its own bugs.

${checkboxes(contract.length > 0 ? contract : ["Write the reference contract for this family."])}

- [ ] Reference passes every graded check.
- [ ] A no-op implementation scores zero.
- [ ] The reference is not the only implementation that could pass — sanity-check that the contract
      describes behaviour rather than one specific design.
`;

const mutantPlan = (mutants: readonly Mutant[]): string => `# Mutant plan

Each mutant below is a deliberately broken implementation this family's verifier must catch. Running
them is how the verifier is graded: a suite that passes a known-bad engine is not a suite.

${
  mutants.length === 0
    ? "_No mutants mapped. This family cannot demonstrate that its verifier works._"
    : mutants
        .map(
          (m) => `## ${m.name} (\`${m.id}\`)

**Bug.** ${m.bug}

**Why it is dangerous.** ${m.falseConfidence}

**Must be caught by:**
${bullets(m.caughtBy)}

\`\`\`
${m.sketch}
\`\`\`
`,
        )
        .join("\n")
}

## Gate

- [ ] Every mutant above fails at least one named check.
- [ ] Record WHICH check caught it. A mutant caught by an unrelated assertion is luck, not coverage.
- [ ] Re-run the mutant bank on every verifier change.
`;

const fairnessChecklist = (mechs: readonly Mechanism[]): string => `# Fairness checklist

A family that punishes a correct implementation is worse than no family: it produces failures that
teach the wrong lesson. Work through every risk the registry records for these mechanisms.

${checkboxes(mechs.flatMap((m) => m.fairnessRisks))}

## Kill taxonomy — apply before building

- [ ] **already-solved** — do current models already handle this correctly? Measure before building.
- [ ] **self-verifiable** — can the agent cheaply brute-force a check and confirm its own answer?
- [ ] **unfair-or-defused** — is the mechanism that makes the task solvable the same one that
      defuses its trap?
- [ ] **no-window** — is the race or interleaving this depends on reliably reachable?

Four of nine gated mechanisms in the source project died of the first category alone.
`;

const cheatChecklist = (mechs: readonly Mechanism[]): string => `# Cheat-resistance checklist

Three real bypasses were found in the source project's own verifier, two of them by writing the
exploit and running it rather than by inspection. Assume yours has some too.

${checkboxes(mechs.flatMap((m) => m.cheatRisks))}

## Structural requirements

- [ ] Ground truth lives in a process the implementation under test cannot reach.
- [ ] The grading process never imports the implementation's code.
- [ ] Scenario inputs are regenerated from the seed, not taken from the implementation's own report.
- [ ] A deliberately empty run (no external calls at all) scores zero.
- [ ] An implementation that rebinds or monkeypatches the ground-truth accessor scores zero, and
      fails identically to the plain no-op so the tampering is provably inert.
- [ ] The reward channel is writable only by the grader.
`;

const readme = (m: ScaffoldMetadata): string => `# ${m.name}

Scaffold generated by \`agent-eval-foundry\`. **Nothing here is runnable yet** — this is the
paperwork a task family needs before it earns build time, with the mechanical parts filled in from
the registry.

| | |
|---|---|
| family | \`${m.familyId}\` |
| domain | ${m.domain} |
| mechanisms | ${m.mechanisms.join(", ")} |
| mutants to catch | ${m.mutants.length > 0 ? m.mutants.join(", ") : "_none mapped_"} |
| generated from | ${m.generatedFrom} |

## Order of work

1. \`fairness-checklist.md\` — cheapest kill first. Most candidates die here, for $0.
2. \`instruction.draft.md\` — write the visible rules. Every graded rule must appear.
3. \`reference-checklist.md\` — build the reference. No trial budget until it passes.
4. \`mutant-plan.md\` — run the known-bad bank. This grades your verifier.
5. \`cheat-resistance-checklist.md\` — attack your own grader.
6. \`hidden-test-plan.md\` — choose the sampling region, then justify each point.
7. Only now spend frontier budget.
`;

function assemble(
  metadata: ScaffoldMetadata,
  mechs: readonly Mechanism[],
  mutants: readonly Mutant[],
  hidden: { hiddenGradedRegion: string; knobs: readonly { name: string; purpose: string }[] },
  contract: readonly string[],
): ScaffoldOutput {
  const files: ScaffoldFile[] = [
    { path: "family.json", content: `${JSON.stringify(metadata, null, 2)}\n` },
    { path: "instruction.draft.md", content: instruction(metadata.name, metadata.domain, mechs) },
    { path: "hidden-test-plan.md", content: hiddenTestPlan(hidden) },
    { path: "reference-checklist.md", content: referenceChecklist(contract) },
    { path: "mutant-plan.md", content: mutantPlan(mutants) },
    { path: "fairness-checklist.md", content: fairnessChecklist(mechs) },
    { path: "cheat-resistance-checklist.md", content: cheatChecklist(mechs) },
    { path: "README.md", content: readme(metadata) },
  ];
  return { familyId: metadata.familyId, metadata, files };
}

export interface ScaffoldRequest {
  readonly familyId: string;
  readonly name: string;
  readonly domain: string;
  readonly mechanismIds: readonly string[];
}

/** Generate from mechanisms alone — the `foundry scaffold --mechanism ... --domain ...` path. */
export function generateScaffold(req: ScaffoldRequest, registry: Registry): ScaffoldOutput {
  const mechs = registry.mechanisms.filter((m) => req.mechanismIds.includes(m.id));
  if (mechs.length === 0) {
    throw new Error(`scaffold: none of [${req.mechanismIds.join(", ")}] is a known mechanism id`);
  }
  const wanted = new Set(mechs.flatMap((m) => m.suggestedMutants));
  const mutants = registry.mutants.filter((m) => wanted.has(m.id));
  const metadata: ScaffoldMetadata = {
    familyId: req.familyId,
    name: req.name,
    domain: req.domain,
    mechanisms: mechs.map((m) => m.id),
    mutants: mutants.map((m) => m.id),
    generatedFrom: "mechanism",
    artifacts: [...ARTIFACT_PLAN],
  };
  return assemble(
    metadata,
    mechs,
    mutants,
    {
      hiddenGradedRegion:
        "TO BE WRITTEN. State which region of the declared behaviour space the hidden tests sample, " +
        "in terms the agent could have derived from the visible rules.",
      knobs: [
        { name: "seed", purpose: "determines the generated input sequence" },
        { name: "TO BE WRITTEN", purpose: "the parameter that controls whether the mechanism fires" },
      ],
    },
    [],
  );
}

/** Generate from a validated task shape — the `foundry scaffold --shape <file>` path. */
export function scaffoldFromShape(shape: TaskShape, registry: Registry): ScaffoldOutput {
  const mechs = registry.mechanisms.filter((m) => shape.mechanisms.includes(m.id));
  const expected = new Set(shape.expectedMutants.map((e) => e.mutantId));
  const mutants = registry.mutants.filter((m) => expected.has(m.id));
  const metadata: ScaffoldMetadata = {
    familyId: shape.familyId,
    name: shape.name,
    domain: shape.domain,
    mechanisms: [...shape.mechanisms],
    mutants: mutants.map((m) => m.id),
    generatedFrom: "shape",
    artifacts: [...ARTIFACT_PLAN],
  };
  return assemble(metadata, mechs, mutants, shape, shape.referenceContract);
}
