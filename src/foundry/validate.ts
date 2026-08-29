// The validators. Deliberately independent of anything that produces this data.
//
// Nothing in this file imports the scaffold generator, and the generator does not import it. That
// separation is the whole point: a checker written by the same code path that produced the artifact
// checks that the code ran, not that the result is correct. The foundry's own thesis is that AI
// proposes structure and a deterministic system decides whether it is valid, so the deciding half
// has to be able to reject the proposing half.
//
// Each function parses raw JSON into a typed value and throws `SchemaError` carrying a `RuleCode` on
// the first violation. The codes are enumerated in schema.ts and every one of them has a known-bad
// fixture under `fixtures/invalid/` with a test asserting it is rejected FOR THAT CODE. A rule with
// no fixture fails the rule-coverage test, which is the closest thing this repo has to mutation
// testing its own checker.
//
// The rules encode judgements, and the judgements are worth stating:
//
// - A mechanism with no `falsePositiveShape` is not a mechanism worth building a family around. If
//   you cannot say how a wrong implementation passes a naive suite, an ordinary test already catches
//   it and the family would be redundant on arrival.
// - An authoritative source with no `whyEngineCannotForge` is a trust boundary nobody has thought
//   about. Every real bypass found in the source project was exactly this: a ground truth the engine
//   turned out to be able to reach.
// - A ledger row promoted with no links is a decision with no evidence, and a killed row with no
//   failure notes destroys the only thing kills are good for — the kill rate that feeds the budget.
// - A mechanism with no mutant in the bank cannot be verified by anything. Coverage gaps here are
//   how a registry ends up describing difficulty it has no way to detect.

import {
  type AuthoritativeSource,
  type Candidate,
  type CandidateResults,
  DATA_QUALITY,
  DECISIONS,
  type ExpectedMutant,
  type Knob,
  MECHANISM_MATURITY,
  type Mechanism,
  type Mutant,
  TASK_STATUS,
  type TaskShape,
  array,
  fail,
  id,
  isRecord,
  num,
  numNullable,
  oneOf,
  requiredList,
  str,
  strArray,
  strNullable,
  uniqueIds,
} from "./schema.js";

const obj = (v: unknown, path: string): Record<string, unknown> =>
  isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

// ---------------------------------------------------------------- mechanisms

export function parseMechanism(v: unknown, path: string): Mechanism {
  const o = obj(v, path);
  const maturity = oneOf(o["maturity"], `${path}.maturity`, MECHANISM_MATURITY);
  const evidence = strNullable(o["evidence"], `${path}.evidence`);
  if (maturity === "measured" && evidence === null) {
    fail(
      "MECH_MEASURED_WITHOUT_EVIDENCE",
      `${path}.evidence`,
      'maturity "measured" requires evidence; an unsourced measurement is an assertion',
    );
  }
  return {
    id: id(o["id"], `${path}.id`),
    name: str(o["name"], `${path}.name`),
    summary: str(o["summary"], `${path}.summary`),
    whyAgentsFail: str(o["whyAgentsFail"], `${path}.whyAgentsFail`),
    whatCorrectSystemsDo: str(o["whatCorrectSystemsDo"], `${path}.whatCorrectSystemsDo`),
    falsePositiveShape: (() => {
      const s = strNullable(o["falsePositiveShape"], `${path}.falsePositiveShape`);
      return s === null
        ? fail(
            "MECH_NO_FALSE_POSITIVE_SHAPE",
            `${path}.falsePositiveShape`,
            "required: if a wrong implementation cannot pass a naive suite, an ordinary test already catches this and no family is needed",
          )
        : s;
    })(),
    exampleDomains: strArray(o["exampleDomains"], `${path}.exampleDomains`),
    suggestedMutants: requiredList(
      o["suggestedMutants"],
      `${path}.suggestedMutants`,
      "MECH_NO_SUGGESTED_MUTANT",
      "a mechanism with no known-bad implementation cannot be verified by anything",
    ),
    fairnessRisks: strArray(o["fairnessRisks"], `${path}.fairnessRisks`),
    cheatRisks: strArray(o["cheatRisks"], `${path}.cheatRisks`),
    measurableSignals: requiredList(
      o["measurableSignals"],
      `${path}.measurableSignals`,
      "MECH_NO_MEASURABLE_SIGNAL",
      "a mechanism with no observable signal cannot be graded, only described",
    ),
    maturity,
    evidence,
  };
}

export function parseMechanisms(v: unknown, path = "mechanisms"): readonly Mechanism[] {
  const list = array(v, path, parseMechanism);
  uniqueIds(
    list.map((m) => m.id),
    path,
  );
  return list;
}

// ---------------------------------------------------------------- mutants

export function parseMutant(v: unknown, path: string): Mutant {
  const o = obj(v, path);
  return {
    id: id(o["id"], `${path}.id`),
    name: str(o["name"], `${path}.name`),
    bug: str(o["bug"], `${path}.bug`),
    mechanisms: requiredList(
      o["mechanisms"],
      `${path}.mechanisms`,
      "MUTANT_NO_MECHANISM",
      "a mutant that exercises no mechanism is a bug with no theory behind it",
    ),
    caughtBy: requiredList(
      o["caughtBy"],
      `${path}.caughtBy`,
      "MUTANT_NOT_CAUGHT_BY_ANYTHING",
      "a mutant no check catches is a mutant that will silently pass every suite it is added to",
    ),
    falseConfidence: str(o["falseConfidence"], `${path}.falseConfidence`),
    sketch: str(o["sketch"], `${path}.sketch`),
  };
}

export function parseMutants(v: unknown, path = "mutants"): readonly Mutant[] {
  const list = array(v, path, parseMutant);
  uniqueIds(
    list.map((m) => m.id),
    path,
  );
  return list;
}

// ---------------------------------------------------------------- task shapes

const parseKnob = (v: unknown, path: string): Knob => {
  const o = obj(v, path);
  const values = Array.isArray(o["values"])
    ? o["values"]
    : fail("E_TYPE", `${path}.values`, "expected an array");
  return {
    name: str(o["name"], `${path}.name`),
    type: oneOf(o["type"], `${path}.type`, ["int", "enum", "bool", "seed"] as const),
    values: values.map((x, i) =>
      typeof x === "string" || typeof x === "number" || typeof x === "boolean"
        ? x
        : fail("E_TYPE", `${path}.values[${i}]`, "expected string, number or boolean"),
    ),
    purpose: str(o["purpose"], `${path}.purpose`),
  };
};

const parseSource = (v: unknown, path: string): AuthoritativeSource => {
  const o = obj(v, path);
  const why = strNullable(o["whyEngineCannotForge"], `${path}.whyEngineCannotForge`);
  if (why === null) {
    fail(
      "SHAPE_UNFORGEABILITY_UNSTATED",
      `${path}.whyEngineCannotForge`,
      "required: every verifier bypass found in the source project was a ground truth the engine turned out to be able to reach",
    );
  }
  return {
    name: str(o["name"], `${path}.name`),
    whatItSettles: str(o["whatItSettles"], `${path}.whatItSettles`),
    whyEngineCannotForge: why,
  };
};

const parseExpectedMutant = (v: unknown, path: string): ExpectedMutant => {
  const o = obj(v, path);
  return {
    mutantId: id(o["mutantId"], `${path}.mutantId`),
    mustFailCheck: str(o["mustFailCheck"], `${path}.mustFailCheck`),
  };
};

const nonEmpty = <T>(items: readonly T[], path: string, code: Parameters<typeof fail>[0], why: string) => {
  if (items.length === 0) fail(code, path, why);
  return items;
};

export function parseTaskShape(v: unknown, path = "shape"): TaskShape {
  const o = obj(v, path);
  const status = oneOf(o["status"], `${path}.status`, TASK_STATUS);
  const buildHours = num(o["estimatedBuildHours"], `${path}.estimatedBuildHours`);
  const frontierUsd = num(o["estimatedFrontierUsd"], `${path}.estimatedFrontierUsd`);
  const trialsRun = numNullable(o["agentTrialsRun"], `${path}.agentTrialsRun`);
  const trialsPassed = numNullable(o["agentTrialsPassed"], `${path}.agentTrialsPassed`);
  if (trialsRun !== null && trialsRun > 0 && trialsPassed === null) {
    fail(
      "SHAPE_TRIAL_OUTCOME_MISSING",
      `${path}.agentTrialsPassed`,
      "a family claiming agent trials must declare how many of them passed; a trial count with no outcome cannot be told apart from no trials at all, and the ship gate has to fail closed on it",
    );
  }
  if (trialsPassed !== null && trialsRun !== null && trialsPassed > trialsRun) {
    fail(
      "SHAPE_TRIAL_OUTCOME_MISSING",
      `${path}.agentTrialsPassed`,
      `${trialsPassed} trials passed out of ${trialsRun} run`,
    );
  }
  const built = status === "built" || status === "screened" || status === "trialed" || status === "shipped";
  if (built && buildHours <= 0) {
    fail(
      "SHAPE_BUILT_WITHOUT_COST",
      `${path}.estimatedBuildHours`,
      `status "${status}" means this was actually built, so its build cost cannot be zero — an unpriced family breaks the budget model`,
    );
  }

  const hidden = strNullable(o["hiddenGradedRegion"], `${path}.hiddenGradedRegion`);
  if (hidden === null) {
    fail(
      "SHAPE_NO_HIDDEN_REGION",
      `${path}.hiddenGradedRegion`,
      "required: without a stated sampling region the hidden tests are indistinguishable from secret rules, which is the unfairness this project exists to avoid",
    );
  }

  return {
    familyId: id(o["familyId"], `${path}.familyId`),
    name: str(o["name"], `${path}.name`),
    domain: str(o["domain"], `${path}.domain`),
    mechanisms: strArray(o["mechanisms"], `${path}.mechanisms`),
    visibleRules: strArray(o["visibleRules"], `${path}.visibleRules`),
    hiddenGradedRegion: hidden,
    knobs: nonEmpty(
      array(o["knobs"], `${path}.knobs`, parseKnob),
      `${path}.knobs`,
      "SHAPE_NO_KNOBS",
      "a family with no knobs is a single task; instances are the only thing that makes a family cheaper than hand-authoring",
    ),
    authoritativeSources: nonEmpty(
      array(o["authoritativeSources"], `${path}.authoritativeSources`, parseSource),
      `${path}.authoritativeSources`,
      "SHAPE_NO_AUTHORITATIVE_SOURCE",
      "grading needs a source of truth the implementation cannot produce for itself",
    ),
    referenceContract: nonEmpty(
      strArray(o["referenceContract"], `${path}.referenceContract`),
      `${path}.referenceContract`,
      "SHAPE_NO_REFERENCE_CONTRACT",
      "without a reference contract there is no evidence the family is solvable at all",
    ),
    expectedMutants: nonEmpty(
      array(o["expectedMutants"], `${path}.expectedMutants`, parseExpectedMutant),
      `${path}.expectedMutants`,
      "SHAPE_NO_EXPECTED_MUTANTS",
      "a family that names no known-bad implementation has no way to show its verifier works",
    ),
    fairnessConstraints: nonEmpty(
      strArray(o["fairnessConstraints"], `${path}.fairnessConstraints`),
      `${path}.fairnessConstraints`,
      "SHAPE_NO_FAIRNESS_CONSTRAINT",
      "a family with no fairness boundary will eventually punish a correct implementation and nobody will notice",
    ),
    cheatResistance: nonEmpty(
      strArray(o["cheatResistance"], `${path}.cheatResistance`),
      `${path}.cheatResistance`,
      "SHAPE_NO_CHEAT_RESISTANCE",
      "an ungamed grader is an assumption until it is a requirement",
    ),
    expectedFailureModes: strArray(o["expectedFailureModes"], `${path}.expectedFailureModes`),
    estimatedBuildHours: buildHours,
    estimatedFrontierUsd: frontierUsd,
    status,
    dataQuality: oneOf(o["dataQuality"], `${path}.dataQuality`, DATA_QUALITY),
    evidence: strNullable(o["evidence"], `${path}.evidence`),
    estimatedAxes: numNullable(o["estimatedAxes"], `${path}.estimatedAxes`),
    agentTrialsRun: trialsRun,
    agentTrialsPassed: trialsPassed,
  };
}

// ---------------------------------------------------------------- candidate ledger

const parseResults = (v: unknown, path: string): CandidateResults | null => {
  if (v === null || v === undefined) return null;
  const o = obj(v, path);
  const subjects = strArray(o["subjectsTested"], `${path}.subjectsTested`);
  if (subjects.length === 0) {
    fail(
      "LEDGER_RESULTS_WITHOUT_SUBJECTS",
      `${path}.subjectsTested`,
      "a result with no named subject cannot be reproduced or attributed",
    );
  }
  return {
    subjectsTested: subjects,
    passed: num(o["passed"], `${path}.passed`),
    failed: num(o["failed"], `${path}.failed`),
    note: str(o["note"], `${path}.note`),
  };
};

export function parseCandidate(v: unknown, path: string): Candidate {
  const o = obj(v, path);
  const status = oneOf(o["status"], `${path}.status`, TASK_STATUS);
  const decision = oneOf(o["decision"], `${path}.decision`, DECISIONS);
  const dataQuality = oneOf(o["dataQuality"], `${path}.dataQuality`, DATA_QUALITY);
  const results = parseResults(o["results"], `${path}.results`);
  const costUsd = numNullable(o["costUsd"], `${path}.costUsd`);
  const failureNotes = strNullable(o["failureNotes"], `${path}.failureNotes`);
  const links = strArray(o["links"], `${path}.links`);

  const rationale = strNullable(o["decisionRationale"], `${path}.decisionRationale`);
  if (rationale === null) {
    fail(
      "LEDGER_NO_DECISION_RATIONALE",
      `${path}.decisionRationale`,
      "an unexplained decision cannot be revisited when the evidence changes",
    );
  }
  if ((status === "trialed" || status === "shipped") && costUsd === null) {
    fail(
      "LEDGER_TRIALED_WITHOUT_COST",
      `${path}.costUsd`,
      `status "${status}" means frontier budget was spent; an unpriced trial makes the budget model fiction`,
    );
  }
  if (status === "killed" && failureNotes === null) {
    fail(
      "LEDGER_KILLED_WITHOUT_FAILURE_NOTES",
      `${path}.failureNotes`,
      "an unclassified kill teaches nothing; the kill taxonomy is the transferable output of screening",
    );
  }
  if (decision === "promote" && links.length === 0) {
    fail(
      "LEDGER_PROMOTED_WITHOUT_EVIDENCE",
      `${path}.links`,
      "promotion without a link is a promotion on vibes",
    );
  }
  if (dataQuality === "measured" && results === null) {
    fail(
      "LEDGER_MEASURED_WITHOUT_RESULTS",
      `${path}.results`,
      'dataQuality "measured" with no results is the exact confusion between measured and estimated this ledger exists to prevent',
    );
  }

  return {
    id: id(o["id"], `${path}.id`),
    title: str(o["title"], `${path}.title`),
    mechanisms: strArray(o["mechanisms"], `${path}.mechanisms`),
    domain: str(o["domain"], `${path}.domain`),
    status,
    hypothesis: str(o["hypothesis"], `${path}.hypothesis`),
    whyHard: str(o["whyHard"], `${path}.whyHard`),
    whyMightBeUnfair: str(o["whyMightBeUnfair"], `${path}.whyMightBeUnfair`),
    results,
    costUsd,
    failureNotes,
    decision,
    decisionRationale: rationale,
    transferability: str(o["transferability"], `${path}.transferability`),
    links,
    dataQuality,
  };
}

export function parseCandidates(v: unknown, path = "candidates"): readonly Candidate[] {
  const list = array(v, path, parseCandidate);
  uniqueIds(
    list.map((c) => c.id),
    path,
  );
  return list;
}
