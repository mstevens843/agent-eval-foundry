import { SPEC_MD } from "../families/caa-revalidation/spec.js";
import { buildScenario } from "../families/caa-revalidation/truth.js";
import type { ScenarioParams } from "../families/caa-revalidation/truth.js";
import type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./package.js";

export const CAA_REVALIDATION_HIDDEN_ARTIFACTS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "truth.ts",
  "scenarios.ts",
  "matrix.json",
  "answer-matrix.json",
  "current-authority.json",
  "query-ledger.json",
  "reports/",
] as const;

const README = `# Challenge: multi-name certificate authorization revalidation

## The problem

A certificate order names up to five domains. Each name carries the hour its domain control was
validated and the authorization answer recorded at that time. Answers older than the recheck window
no longer speak for the present, and the order is only issuable when every name currently allows it.

## What you are given

| file | what it is |
|---|---|
| \`SPEC.md\` | the complete normative rules and the hidden-scenario dimensions |
| \`types.ts\` | the public domain model and the authority interface |
| \`starter/subject.mjs\` | an incomplete skeleton that never contacts the authority |
| \`examples/\` | visible example orders |

## What you must produce

Write \`submission/subject.mjs\` exporting \`subject.run(view, caa)\` returning one \`OrderReport\`.
Do not modify \`challenge/\`.

## How you are graded

The grader owns the current-authorization map and an append-only ledger recording the exact fqdn of
every call your subject makes. It checks the ledger, not your report's account of it. Hidden cases
sample only the dimensions declared in \`SPEC.md\`.
`;

const STARTER = `// Starter skeleton. It establishes the module shape and nothing else.
//
// It never contacts the authority, so every name is answered from its recorded value regardless of
// age. Read SPEC.md and replace this with an implementation that satisfies all five rules.

export const subject = {
  id: "starter",
  label: "Recorded-value-only skeleton",
  run(view, caa) {
    const results = view.names.map((name) => ({
      fqdn: name.fqdn,
      caa: name.cachedCaa,
      source: "CACHE",
    }));
    return {
      decision: results.every((row) => row.caa === "ALLOW") ? "ISSUE" : "REFUSE",
      results,
    };
  },
};
`;

/**
 * Visible examples: views only.
 *
 * No example ships an expected report. Every one of these orders contains at least one name old
 * enough to need a recheck, so its decision lives behind the authority facade, and an example
 * carrying that decision would be the package shipping part of its own answer key.
 */
const EXAMPLES: readonly {
  readonly label: string;
  readonly params: ScenarioParams;
  readonly note: string;
}[] = [
  {
    label: "boundary-ages",
    params: { seed: 7, domainCount: 2, agePattern: "boundary-eight", denyPosition: "none" },
    note: "Ages 8 and 9. Age 8 is inside the recheck window and age 9 is outside it.",
  },
  {
    label: "single-name",
    params: { seed: 19, domainCount: 1, agePattern: "all-stale", denyPosition: "first" },
    note: "One name, older than the window. It must be rechecked under its own fqdn before the order is decided.",
  },
  {
    label: "five-names-mixed",
    params: { seed: 31, domainCount: 5, agePattern: "mixed", denyPosition: "last" },
    note: "Five names of mixed age. Some are inside the recheck window and some are not; the report must carry one result per name in this order.",
  },
];

const typesFor = (typesSource: string): string =>
  [
    "// Public domain model. The current-authorization map, the query ledger, the hidden scenario",
    "// generator, the verifier and the mutant bank are absent.",
    "",
    typesSource,
  ].join("\n");

const examples = (): readonly ChallengeFile[] =>
  EXAMPLES.map((entry, index) => {
    const scenario = buildScenario(entry.params);
    return {
      path: `examples/example-${index + 1}-${entry.label}.json`,
      content: `${JSON.stringify({ view: scenario.view, note: entry.note }, null, 2)}\n`,
    };
  });

export function buildCaaRevalidationChallengePackage(
  typesSource: string,
  scenarioSetId: string,
): ChallengePackage {
  const files: ChallengeFile[] = [
    { path: "README.md", content: README },
    { path: "SPEC.md", content: SPEC_MD },
    { path: "types.ts", content: typesFor(typesSource) },
    { path: "starter/subject.mjs", content: STARTER },
    ...examples(),
  ];
  const manifest: ChallengeManifest = {
    familyId: "caa-revalidation",
    scenarioSetId,
    visibleFiles: files.map((file) => file.path).sort(),
    hiddenArtifacts: [...CAA_REVALIDATION_HIDDEN_ARTIFACTS],
    submissionFormat: "an ES module exporting `subject` with run(view, caa)",
  };
  return {
    familyId: manifest.familyId,
    files: [...files, { path: "MANIFEST.json", content: `${JSON.stringify(manifest, null, 2)}\n` }],
    manifest,
  };
}
