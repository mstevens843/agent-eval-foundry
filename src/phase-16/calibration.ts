import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditCandidateContract, contractGateB6 } from "./contract-gate.js";
import {
  type CandidateContract,
  type ContractGateResult,
  PHASE16_CONTRACT_SCHEMA,
  type Phase16CalibrationResult,
} from "./types.js";

const CALIBRATION_TIME = "2026-09-04T14:27:25Z";

export const phase16Sha256 = (value: string | Buffer | unknown): string => {
  const bytes =
    typeof value === "string" || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`;
  return createHash("sha256").update(bytes).digest("hex");
};

const fileSha256 = (root: string, path: string): string => phase16Sha256(readFileSync(join(root, path)));

const sourceDigest = (root: string, path: string): string => fileSha256(root, path);

export function repairedWafContract(root: string): CandidateContract {
  return {
    schema: PHASE16_CONTRACT_SCHEMA,
    candidateId: "waf-semantic-complexity-repair-calibration",
    sourceIncidentId: "cloudflare-2019-regex-outage-calibration",
    role: "retrospective-calibration",
    source: {
      locator: "data/phase-15-source-snapshots/cloudflare-2019-regex-outage.json",
      revision: "phase15-pinned-primary-source-snapshot",
      digest: sourceDigest(root, "data/phase-15-source-snapshots/cloudflare-2019-regex-outage.json"),
      evidenceLocations: ["What went wrong", "Regular Expression Backtracking appendix"],
      observedFailure:
        "A semantically accepted WAF expression triggered catastrophic backtracking; functional checks did not measure evaluation work.",
    },
    publicContract: {
      goal: "Implement the declared restricted rule language with exact matching semantics while respecting the public deterministic transition-work budget.",
      inputGrammar: {
        notation: "EBNF",
        definition:
          "request = { byte }; rule = sequence ; sequence = term, { term } ; term = atom, [ '*' ] ; atom = byte | '.' ; byte = ASCII 0x20..0x7e excluding '*' ; maximum 24 atoms and 64 request bytes.",
        validExamples: ['{"rule":"a.*b","request":"axxb"}', '{"rule":"ab*","request":"abbb"}'],
        invalidExamples: ['{"rule":"(a|b)","request":"a"}', '{"rule":"**","request":"x"}'],
      },
      outputGrammar: {
        notation: "JSON-Schema",
        definition:
          '{"type":"object","required":["matched"],"additionalProperties":false,"properties":{"matched":{"type":"boolean"}}}',
        validExamples: ['{"matched":true}', '{"matched":false}'],
        invalidExamples: ['{"match":"yes"}', '{"matched":1}'],
      },
      stateSemantics: {
        initialState: "RULE_CONFIGURED",
        states: ["RULE_CONFIGURED", "REQUEST_EVALUATED"],
        transitions: [
          {
            id: "evaluate-request-transition",
            from: "RULE_CONFIGURED",
            input: "One valid request encoded by the public input grammar",
            to: "REQUEST_EVALUATED",
            effect:
              "Return true exactly when the entire request belongs to the language denoted by the rule; otherwise return false.",
          },
        ],
      },
      acceptedOutcomes: [
        "Every response equals Thompson-NFA full-match semantics and stays within the public transition-work limit.",
      ],
      forbiddenOutcomes: [
        "Any semantic mismatch, parse acceptance outside the grammar, nondeterministic answer, or transition-work budget violation.",
      ],
      safetyObligations: [
        "Reject malformed rules before evaluation and never report a match that the declared NFA semantics rejects.",
      ],
      livenessObligations: [
        "Evaluate every valid request and return one boolean result without refusing adversarial non-matches.",
      ],
      implementationFreedom: [
        "The implementation may use Thompson NFA, DFA conversion, derivatives, or another equivalent algorithm.",
      ],
      nonrequirements: [
        "Grouping, alternation, backreferences, lookaround, Unicode classes, substring matching, and wall-clock optimization are not required.",
      ],
    },
    grading: {
      rules: [
        {
          id: "waf-public-semantic-equivalence",
          agentVisibleText:
            "For every declared request, matched must equal full-string membership in the restricted rule language.",
          publicSection: "Public matching semantics",
        },
        {
          id: "waf-public-work-budget",
          agentVisibleText:
            "For each request, count one work unit for each active NFA-state/byte transition examined; work must not exceed 3,136 units.",
          publicSection: "Deterministic work meter",
        },
        {
          id: "waf-public-positive-work",
          agentVisibleText:
            "The implementation must evaluate every valid held-out request and emit a boolean.",
          publicSection: "Liveness",
        },
      ],
      metrics: [
        {
          id: "semantic-mismatch-count",
          unit: "mismatching request results",
          deterministicProcedure:
            "Run the submitted matcher and the reference Thompson NFA on the same request and count unequal booleans.",
          comparator: "=",
          threshold: 0,
          derivation: {
            formula: "allowed_mismatches",
            inputs: { allowed_mismatches: 0 },
            explanation: "Exact public semantics permits no wrong classification.",
          },
        },
        {
          id: "transition-work-limit",
          unit: "examined NFA state-byte transitions",
          deterministicProcedure:
            "Instrument matcher transitions and add one unit whenever one active NFA state examines one request byte.",
          comparator: "<=",
          threshold: 3136,
          derivation: {
            formula: "max_nfa_states * max_request_bytes",
            inputs: { max_nfa_states: 49, max_request_bytes: 64 },
            explanation:
              "Twenty-four atoms compile to at most 2*24+1 = 49 Thompson states; scanning 64 bytes may examine each state once per byte, yielding 3,136.",
          },
        },
        {
          id: "evaluated-request-count",
          unit: "completed request evaluations",
          deterministicProcedure:
            "Count valid held-out requests for which the subject returns the declared output object.",
          comparator: ">=",
          threshold: 1,
          derivation: {
            formula: "minimum_positive_work",
            inputs: { minimum_positive_work: 1 },
            explanation:
              "At least one completed evaluation is the minimum evidence that the subject did work.",
          },
        },
      ],
      checks: [
        {
          id: "check-waf-semantics",
          ruleIds: ["waf-public-semantic-equivalence"],
          metricIds: ["semantic-mismatch-count"],
          envelopeDimensionIds: ["rule-atom-count", "request-byte-count", "request-class"],
        },
        {
          id: "check-waf-work-budget",
          ruleIds: ["waf-public-work-budget"],
          metricIds: ["transition-work-limit"],
          envelopeDimensionIds: ["rule-atom-count", "request-byte-count", "request-class"],
        },
        {
          id: "check-waf-positive-work",
          ruleIds: ["waf-public-positive-work"],
          metricIds: ["evaluated-request-count"],
          envelopeDimensionIds: ["request-class"],
        },
      ],
    },
    hiddenInstanceEnvelope: {
      publicDescription:
        "Held-out cases use only the published restricted rule grammar, request alphabet, atom count, request length, and three request classes.",
      dimensions: [
        {
          id: "rule-atom-count",
          type: "integer",
          values: [1, 24],
          derivation: "Inclusive lower and upper bounds from the public rule grammar.",
        },
        {
          id: "request-byte-count",
          type: "integer",
          values: [0, 64],
          derivation: "Inclusive bounds from the public request grammar.",
        },
        {
          id: "request-class",
          type: "enum",
          values: ["matching", "early-nonmatch", "late-nonmatch"],
          derivation: "The three classes exercise acceptance and both cheap and adversarial rejection paths.",
        },
      ],
      samplingProcedure:
        "Generate a fixed seed-balanced Cartesian sample across request class and boundary values, then hash the ordered fixture list.",
      constraints: [
        "All rules parse under the published grammar and all requests contain only the published ASCII alphabet.",
        "At least one third of held-out requests are late non-matches at the maximum request length.",
      ],
      noNewRulesEvidence:
        "Every hidden dimension is named above, and every check maps to a public rule and deterministic metric in this contract.",
    },
    subjectInterface: {
      entrypoint:
        "submission/matcher.mjs exports match(rule, request, meter) returning { matched: boolean }.",
      readableInputs: ["The rule string, request string, and a meter with an increment() operation."],
      writableOutputs: ["One JSON-compatible object containing exactly the matched boolean."],
      unavailableAuthority: [
        "Held-out request fixtures, reference answers, and verifier-owned meter totals.",
      ],
    },
    authorityBoundary: {
      kind: "verifier-owned-fixture-and-meter process boundary",
      enforcement:
        "The harness creates held-out requests and records meter increments outside the submission module; the subject cannot replace verifier state.",
      subjectCanCross: false,
    },
    witnessInaccessibility: {
      witness: "The ordered held-out semantic answers and verifier-owned transition-work totals.",
      proof:
        "The subject receives one request and a write-only increment function, while expected answers and aggregate counters remain in the parent verifier process.",
      locallyObservable: false,
    },
    validation: {
      referenceStrategy:
        "Parse the public grammar into a Thompson NFA and simulate active states while incrementing the same public work unit.",
      narrowMutants: [
        {
          id: "recursive-backtracking-mutant",
          singleDefect: "Uses exponential recursive backtracking while preserving full-match semantics.",
          expectedFailedChecks: ["check-waf-work-budget"],
        },
      ],
      cheatModels: [
        {
          id: "hard-coded-visible-requests",
          attempt: "Return recorded answers for only the examples in the public package.",
          blockedBy:
            "The published envelope generates held-out rules and requests from a verifier-owned fixed seed.",
        },
      ],
      positiveWorkRequirement:
        "At least one held-out request must return a boolean and the full held-out set must complete.",
      cheapProbe: {
        id: "waf-linear-work-probe",
        procedure:
          "In one invocation, grade the Thompson-NFA reference, recursive-backtracking mutant, and malformed submission over semantic and late-nonmatch cases.",
        falsifier:
          "Kill the candidate if the reference exceeds 3,136 units, the mutant stays within 3,136, malformed input receives a verdict, or semantic answers differ.",
        activationSignal:
          "The mutant passes semantic checks but alone exceeds the public deterministic work threshold on late non-matches.",
      },
    },
    derivation: {
      classification: "A2",
      citationCount: 2,
      sectionSpan: 2,
      inferenceDepth: 1,
      negativeInference: false,
      citations: [
        "Phase 15 snapshot: functional checks accepted the expression before deployment.",
        "Phase 15 snapshot: catastrophic backtracking exhausted CPU on adversarial traffic.",
      ],
      evidenceChain: [
        "The incident establishes semantic acceptance and unmeasured evaluation complexity as distinct obligations.",
        "The repaired contract publishes both obligations, their grammars, and a deterministic non-wall-clock meter.",
      ],
      unresolvedValidityRisks: [
        "The restricted language is a calibration abstraction and cannot count as prospective incident discovery.",
      ],
    },
    novelty: {
      causalAxis: "semantic equivalence under deterministic adversarial complexity",
      subjectActionContract: "implement a restricted WAF matcher under exact semantics and transition work",
      nearestBaseline: "Phase 15 WAF semantic-complexity proposal",
      materialDifference:
        "This calibration repair instantiates the grammar, semantics, meter, 3,136-unit threshold, threshold derivation, and hidden envelope that Phase 15 omitted.",
    },
  };
}

export function daoCalibrationContract(root: string): CandidateContract {
  return {
    schema: PHASE16_CONTRACT_SCHEMA,
    candidateId: "dao-descendant-contract-calibration",
    sourceIncidentId: "durable-outbox-recompute-retrospective",
    role: "retrospective-calibration",
    source: {
      locator: "examples/families/dao-descendant/challenge/SPEC.md",
      revision: "phase12-built-family-package",
      digest: sourceDigest(root, "examples/families/dao-descendant/challenge/SPEC.md"),
      evidenceLocations: ["Public state", "Rules DOR1 through DOR5", "Hidden scenarios"],
      observedFailure:
        "Recomputing an idempotency key after lease reassignment creates two external effects under one logical action.",
    },
    publicContract: {
      goal: "Recover the idempotency key committed in a durable intent and complete one logical action with exactly one external effect.",
      inputGrammar: {
        notation: "TypeScript",
        definition:
          "type RecoveryView = { intent:{actionId:string,idempotencyKey:string,payload:string}, workerId:string, leaseEpoch:number, attempt:number }",
        validExamples: [
          '{"intent":{"actionId":"a1","idempotencyKey":"k1","payload":"p"},"workerId":"w2","leaseEpoch":2,"attempt":2}',
        ],
        invalidExamples: ['{"actionId":"a1","workerId":"w2"}'],
      },
      outputGrammar: {
        notation: "TypeScript",
        definition:
          "type RecoveryReport = { actionId:string, workerId:string, leaseEpoch:number, keySent:string, toolOutcome:'OK'|'UNKNOWN' }",
        validExamples: ['{"actionId":"a1","workerId":"w2","leaseEpoch":2,"keySent":"k1","toolOutcome":"OK"}'],
        invalidExamples: ['{"actionId":"a1","keySent":"w2:2"}'],
      },
      stateSemantics: {
        initialState: "ATTEMPT_PENDING",
        states: ["ATTEMPT_PENDING", "EFFECT_UNCERTAIN", "ACTION_COMPLETE"],
        transitions: [
          {
            id: "first-attempt-unknown",
            from: "ATTEMPT_PENDING",
            input:
              "The tool records the committed key and returns UNKNOWN before durable completion is published.",
            to: "EFFECT_UNCERTAIN",
            effect: "Preserve the committed key as authority for every later attempt.",
          },
          {
            id: "replacement-worker-retry",
            from: "EFFECT_UNCERTAIN",
            input: "A replacement worker retries with the durable intent's exact idempotency key.",
            to: "ACTION_COMPLETE",
            effect:
              "The tool deduplicates the retry and returns the original effect without creating another.",
          },
        ],
      },
      acceptedOutcomes: [
        "Every call uses the committed key, at least one tool call occurs, and all attempts collectively create exactly one effect.",
      ],
      forbiddenOutcomes: [
        "A key derived from worker or lease state, zero tool calls, duplicate effects, or a report inconsistent with the call ledger.",
      ],
      safetyObligations: [
        "All retries use the exact committed key and all attempts for one action collectively create exactly one external effect.",
      ],
      livenessObligations: ["At least one attempt calls the tool and a valid action reaches completion."],
      implementationFreedom: [
        "The submission may structure local functions and error handling freely while preserving the exported run interface.",
      ],
      nonrequirements: [
        "ACKED, REVOKED, approval-policy adjudication, database access, and network access are not part of this descendant.",
      ],
    },
    grading: {
      rules: [
        {
          id: "dao-recover-committed-key",
          agentVisibleText: "Every retry must use the idempotency key committed in the durable intent.",
          publicSection: "SPEC.md DOR1_RECOVER_COMMITTED_KEY",
        },
        {
          id: "dao-exactly-one-effect",
          agentVisibleText: "All attempts for one action collectively produce exactly one external effect.",
          publicSection: "SPEC.md DOR2_EXACTLY_ONCE",
        },
        {
          id: "dao-truthful-report",
          agentVisibleText:
            "Every report must match the action, worker, epoch, exact key, and observed tool outcome.",
          publicSection: "SPEC.md DOR4_TRUTHFUL_REPORT",
        },
        {
          id: "dao-positive-tool-work",
          agentVisibleText: "At least one attempt must call the tool; refusing every action is incorrect.",
          publicSection: "SPEC.md DOR5_LIVENESS",
        },
      ],
      metrics: [
        {
          id: "committed-key-mismatch-count",
          unit: "tool calls with an incorrect key",
          deterministicProcedure:
            "Compare every host-recorded call key byte-for-byte with intent.idempotencyKey.",
          comparator: "=",
          threshold: 0,
          derivation: {
            formula: "permitted_wrong_keys",
            inputs: { permitted_wrong_keys: 0 },
            explanation: "DOR1 says every retry uses the committed key, so no mismatch is permitted.",
          },
        },
        {
          id: "external-effect-count",
          unit: "distinct host-ledger effect identifiers",
          deterministicProcedure: "Count distinct effect ids in the host-owned ledger for the action id.",
          comparator: "=",
          threshold: 1,
          derivation: {
            formula: "exactly_once_effects",
            inputs: { exactly_once_effects: 1 },
            explanation: "DOR2 defines exactly once as one external effect for one logical action.",
          },
        },
        {
          id: "tool-call-count",
          unit: "host-recorded external tool calls",
          deterministicProcedure: "Count call records owned by the harness for the action id.",
          comparator: ">=",
          threshold: 1,
          derivation: {
            formula: "minimum_live_calls",
            inputs: { minimum_live_calls: 1 },
            explanation: "DOR5 explicitly rejects zero-call implementations.",
          },
        },
        {
          id: "report-ledger-mismatch-count",
          unit: "attempt reports inconsistent with host calls",
          deterministicProcedure:
            "Compare each returned report field to the same attempt's host-recorded call and outcome.",
          comparator: "=",
          threshold: 0,
          derivation: {
            formula: "permitted_false_reports",
            inputs: { permitted_false_reports: 0 },
            explanation: "DOR4 requires every listed report field to be truthful.",
          },
        },
      ],
      checks: [
        {
          id: "check-dao-key-recovery",
          ruleIds: ["dao-recover-committed-key"],
          metricIds: ["committed-key-mismatch-count"],
          envelopeDimensionIds: ["worker-count", "lease-epoch", "crash-position"],
        },
        {
          id: "check-dao-exactly-once",
          ruleIds: ["dao-exactly-one-effect"],
          metricIds: ["external-effect-count"],
          envelopeDimensionIds: ["worker-count", "queued-key-count", "crash-position"],
        },
        {
          id: "check-dao-truthful-report",
          ruleIds: ["dao-truthful-report"],
          metricIds: ["report-ledger-mismatch-count"],
          envelopeDimensionIds: ["worker-count", "lease-epoch", "crash-position"],
        },
        {
          id: "check-dao-positive-work",
          ruleIds: ["dao-positive-tool-work"],
          metricIds: ["tool-call-count"],
          envelopeDimensionIds: ["worker-count"],
        },
      ],
    },
    hiddenInstanceEnvelope: {
      publicDescription:
        "Hidden schedules vary only seed, worker count, lease epoch, queued-key count, and crash position as named in the public specification.",
      dimensions: [
        {
          id: "worker-count",
          type: "integer",
          values: [1, 2, 3, 4],
          derivation: "One worker is a nonactivation control; two through four exercise reassignment.",
        },
        {
          id: "lease-epoch",
          type: "integer",
          values: [1, 2, 3, 4],
          derivation: "Each worker assignment advances the public lease epoch by one.",
        },
        {
          id: "queued-key-count",
          type: "integer",
          values: [1, 2, 4],
          derivation: "Public queue widths cover concentration and unrelated-key noise.",
        },
        {
          id: "crash-position",
          type: "enum",
          values: ["none", "before_tool", "after_tool"],
          derivation: "These are the three public uncertainty positions around the external call.",
        },
      ],
      samplingProcedure:
        "Enumerate the registered seed grid, preserve one-worker controls, and select a hash-sorted balance of multi-worker after-tool schedules.",
      constraints: [
        "Every multi-worker after-tool schedule commits the idempotency key before the first call.",
        "The tool is idempotent by key and the first after-tool call creates its effect before returning UNKNOWN.",
      ],
      noNewRulesEvidence:
        "All dimensions appear in SPEC.md Hidden scenarios and every verifier check maps to DOR1, DOR2, DOR4, or DOR5 above.",
    },
    subjectInterface: {
      entrypoint: "submission/subject.mjs exports subject.run(view, tool).",
      readableInputs: [
        "RecoveryView durable intent, worker id, lease epoch, attempt number, and tool.execute facade.",
      ],
      writableOutputs: ["One RecoveryReport per attempt and calls through the provided tool facade."],
      unavailableAuthority: [
        "Harness-owned call ledger, effect ledger, scenario schedule, and reference outcomes.",
      ],
    },
    authorityBoundary: {
      kind: "host-owned external tool and effect ledger",
      enforcement:
        "The subject receives only the execute facade; call records and deduplicated effects remain in harness-owned state outside the subject API.",
      subjectCanCross: false,
    },
    witnessInaccessibility: {
      witness: "Distinct effect identifiers grouped by logical action in the host-owned ledger.",
      proof:
        "The challenge exposes no ledger read method and packages neither verifier state nor held-out scenario data in the subject directory.",
      locallyObservable: false,
    },
    validation: {
      referenceStrategy:
        "Read intent.idempotencyKey, call tool.execute once per attempt with that exact key, and truthfully return the observed fields.",
      narrowMutants: [
        {
          id: "recompute-current-epoch-key-mutant",
          singleDefect:
            "Derives the retry idempotency key from current worker and lease epoch instead of durable intent.",
          expectedFailedChecks: ["check-dao-key-recovery", "check-dao-exactly-once"],
        },
      ],
      cheatModels: [
        {
          id: "false-success-without-call",
          attempt: "Return an OK report without invoking the external tool.",
          blockedBy:
            "The host-owned call ledger and positive-work metric require at least one real tool call.",
        },
      ],
      positiveWorkRequirement: "At least one host-recorded tool call must exist for each valid action.",
      cheapProbe: {
        id: "dao-recompute-fatality-probe",
        procedure:
          "In one invocation, run reference, recompute mutant, and malformed result through one-worker controls and multi-worker after-tool schedules.",
        falsifier:
          "Kill if reference fails, mutant does not fail key/exactly-once checks, malformed output is graded, or the effect ledger is readable by the subject.",
        activationSignal:
          "Reference creates one effect while the recompute mutant creates two effects under one action after worker reassignment.",
      },
    },
    derivation: {
      classification: "A2",
      citationCount: 5,
      sectionSpan: 3,
      inferenceDepth: 1,
      negativeInference: false,
      citations: [
        "SPEC.md DOR1_RECOVER_COMMITTED_KEY",
        "SPEC.md DOR2_EXACTLY_ONCE",
        "SPEC.md DOR3_RETRY_AFTER_UNKNOWN",
        "SPEC.md External tool",
        "SPEC.md Hidden scenarios",
      ],
      evidenceChain: [
        "The durable intent's committed key remains authority after an uncertain external effect.",
        "A replacement worker retries that same key, allowing the tool to deduplicate to one effect.",
      ],
      unresolvedValidityRisks: [],
    },
    novelty: {
      causalAxis: "durable idempotency authority across uncertain external completion and lease reassignment",
      subjectActionContract: "recover and execute one durable action exactly once",
      nearestBaseline: "durable-approval-outbox parent",
      materialDifference:
        "The descendant removes acknowledgement and revocation, repairs the key-authority sentence, and isolates only the recompute defect.",
    },
  };
}

const mutableClone = (value: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

export function originalPhase15WafPacketAsContract(root: string): unknown {
  const contract = mutableClone(repairedWafContract(root));
  contract.candidateId = "phase15-original-waf-packet-calibration";
  const publicContract = contract.publicContract as Record<string, unknown>;
  publicContract.inputGrammar = { notation: "", definition: "", validExamples: [], invalidExamples: [] };
  publicContract.outputGrammar = { notation: "", definition: "", validExamples: [], invalidExamples: [] };
  publicContract.stateSemantics = { initialState: "", states: [], transitions: [] };
  const grading = contract.grading as Record<string, unknown>;
  grading.metrics = [
    {
      id: "uninstantiated-resource-budget",
      unit: "work units",
      deterministicProcedure: "",
      comparator: "<=",
      threshold: "not supplied",
      derivation: { formula: "", inputs: {}, explanation: "" },
    },
  ];
  grading.checks = [];
  contract.hiddenInstanceEnvelope = {
    publicDescription: "",
    dimensions: [],
    samplingProcedure: "",
    constraints: [],
    noNewRulesEvidence: "",
  };
  return contract;
}

export function checkerHiddenVocabularyContract(root: string): unknown {
  const contract = mutableClone(daoCalibrationContract(root));
  contract.candidateId = "checker-hidden-reason-vocabulary-calibration";
  contract.sourceIncidentId = "checker-required-counted-failure-calibration";
  const grading = contract.grading as Record<string, unknown>;
  const checks = grading.checks as Record<string, unknown>[];
  checks.push({
    id: "check-unpublished-reason-code",
    ruleIds: ["checker-reason-code-revoked"],
    metricIds: ["report-ledger-mismatch-count"],
    envelopeDimensionIds: ["crash-position"],
  });
  return contract;
}

export function locallyObservableContract(root: string): unknown {
  const contract = mutableClone(repairedWafContract(root));
  contract.candidateId = "locally-observable-subject-state-calibration";
  contract.sourceIncidentId = "phase9-author-generated-candidate-calibration";
  (contract.authorityBoundary as Record<string, unknown>).subjectCanCross = true;
  (contract.witnessInaccessibility as Record<string, unknown>).locallyObservable = true;
  return contract;
}

interface CalibrationControl {
  readonly id: string;
  readonly role: string;
  readonly input: unknown;
  readonly expectedStatus: ContractGateResult["status"];
  readonly expectedDeficiencyCodes: readonly string[];
}

export function runPhase16Calibration(root: string): Phase16CalibrationResult {
  const repairedWaf = repairedWafContract(root);
  const originalWaf = originalPhase15WafPacketAsContract(root);
  const controls: readonly CalibrationControl[] = [
    {
      id: "phase15-waf-original-negative",
      role: "retrospective negative: the exact drafting omissions both readers found",
      input: originalWaf,
      expectedStatus: "rejected",
      expectedDeficiencyCodes: [
        "missing-grammar",
        "missing-transition-semantics",
        "missing-deterministic-meter",
        "missing-numeric-threshold",
        "missing-threshold-derivation",
        "missing-hidden-envelope",
      ],
    },
    {
      id: "repaired-waf-positive",
      role: "retrospective positive only; excluded from prospective yield",
      input: repairedWaf,
      expectedStatus: "accepted",
      expectedDeficiencyCodes: [],
    },
    {
      id: "a2-repaired-dao-positive",
      role: "retrospective fairness and traceability positive",
      input: daoCalibrationContract(root),
      expectedStatus: "accepted",
      expectedDeficiencyCodes: [],
    },
    {
      id: "checker-hidden-vocabulary-negative",
      role: "retrospective negative: checker references an unpublished reason code",
      input: checkerHiddenVocabularyContract(root),
      expectedStatus: "rejected",
      expectedDeficiencyCodes: ["unknown-rule-reference"],
    },
    {
      id: "locally-observable-negative",
      role: "retrospective negative: divergence lives in subject-readable state",
      input: locallyObservableContract(root),
      expectedStatus: "rejected",
      expectedDeficiencyCodes: ["crossable-authority-boundary", "locally-observable-witness"],
    },
    {
      id: "wrong-shaped-input-negative",
      role: "B6 malformed-input control",
      input: [],
      expectedStatus: "refused",
      expectedDeficiencyCodes: ["malformed-input-refused"],
    },
  ];
  const evaluated = controls.map((control) => {
    const result = auditCandidateContract(control.input);
    const observed = new Set(result.deficiencies.map((row) => row.code));
    return {
      id: control.id,
      role: control.role,
      expectedStatus: control.expectedStatus,
      expectedDeficiencyCodes: control.expectedDeficiencyCodes,
      result,
      held:
        result.status === control.expectedStatus &&
        control.expectedDeficiencyCodes.every((code) => observed.has(code)),
    };
  });
  const b6 = contractGateB6(repairedWaf, originalWaf);
  if (!b6.usable || evaluated.some((control) => !control.held)) {
    throw new Error("Phase 16 contract-gate calibration failed; gate cannot be frozen");
  }
  return {
    schema: "agent-eval-foundry/phase-16-contract-calibration@1",
    runId: "phase16-contract-gate-calibration-v1",
    gateFrozenAt: CALIBRATION_TIME,
    gateHashes: {
      schema: fileSha256(root, "data/phase-16-candidate-contract.schema.json"),
      types: fileSha256(root, "src/phase-16/types.ts"),
      gate: fileSha256(root, "src/phase-16/contract-gate.ts"),
      fixtures: fileSha256(root, "src/phase-16/calibration.ts"),
    },
    controls: evaluated,
    b6,
  };
}

export const phase16Json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
