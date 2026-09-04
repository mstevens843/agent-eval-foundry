export const PHASE16_CONTRACT_SCHEMA = "agent-eval-foundry/candidate-contract@1" as const;

export type DerivationClass = "A1" | "A2" | "A3" | "A4" | "fragile-A2";

export interface ContractSource {
  readonly locator: string;
  readonly revision: string;
  readonly digest: string;
  readonly evidenceLocations: readonly string[];
  readonly observedFailure: string;
}

export interface GrammarContract {
  readonly notation: "ABNF" | "EBNF" | "JSON-Schema" | "TypeScript";
  readonly definition: string;
  readonly validExamples: readonly string[];
  readonly invalidExamples: readonly string[];
}

export interface CandidateContract {
  readonly schema: typeof PHASE16_CONTRACT_SCHEMA;
  readonly candidateId: string;
  readonly sourceIncidentId: string;
  readonly role: "prospective" | "retrospective-calibration";
  readonly source: ContractSource;
  readonly publicContract: {
    readonly goal: string;
    readonly inputGrammar: GrammarContract;
    readonly outputGrammar: GrammarContract;
    readonly stateSemantics: {
      readonly initialState: string;
      readonly states: readonly string[];
      readonly transitions: readonly {
        readonly id: string;
        readonly from: string;
        readonly input: string;
        readonly to: string;
        readonly effect: string;
      }[];
    };
    readonly acceptedOutcomes: readonly string[];
    readonly forbiddenOutcomes: readonly string[];
    readonly safetyObligations: readonly string[];
    readonly livenessObligations: readonly string[];
    readonly implementationFreedom: readonly string[];
    readonly nonrequirements: readonly string[];
  };
  readonly grading: {
    readonly rules: readonly {
      readonly id: string;
      readonly agentVisibleText: string;
      readonly publicSection: string;
    }[];
    readonly metrics: readonly {
      readonly id: string;
      readonly unit: string;
      readonly deterministicProcedure: string;
      readonly comparator: "<" | "<=" | "=" | ">=" | ">";
      readonly threshold: number;
      readonly derivation: {
        readonly formula: string;
        readonly inputs: Readonly<Record<string, number>>;
        readonly explanation: string;
      };
    }[];
    readonly checks: readonly {
      readonly id: string;
      readonly ruleIds: readonly string[];
      readonly metricIds: readonly string[];
      readonly envelopeDimensionIds: readonly string[];
    }[];
  };
  readonly hiddenInstanceEnvelope: {
    readonly publicDescription: string;
    readonly dimensions: readonly {
      readonly id: string;
      readonly type: "enum" | "integer" | "boolean" | "string";
      readonly values: readonly (string | number | boolean)[];
      readonly derivation: string;
    }[];
    readonly samplingProcedure: string;
    readonly constraints: readonly string[];
    readonly noNewRulesEvidence: string;
  };
  readonly subjectInterface: {
    readonly entrypoint: string;
    readonly readableInputs: readonly string[];
    readonly writableOutputs: readonly string[];
    readonly unavailableAuthority: readonly string[];
  };
  readonly authorityBoundary: {
    readonly kind: string;
    readonly enforcement: string;
    readonly subjectCanCross: false;
  };
  readonly witnessInaccessibility: {
    readonly witness: string;
    readonly proof: string;
    readonly locallyObservable: false;
  };
  readonly validation: {
    readonly referenceStrategy: string;
    readonly narrowMutants: readonly {
      readonly id: string;
      readonly singleDefect: string;
      readonly expectedFailedChecks: readonly string[];
    }[];
    readonly cheatModels: readonly {
      readonly id: string;
      readonly attempt: string;
      readonly blockedBy: string;
    }[];
    readonly positiveWorkRequirement: string;
    readonly cheapProbe: {
      readonly id: string;
      readonly procedure: string;
      readonly falsifier: string;
      readonly activationSignal: string;
    };
  };
  readonly derivation: {
    readonly classification: DerivationClass;
    readonly citationCount: number;
    readonly sectionSpan: number;
    readonly inferenceDepth: number;
    readonly negativeInference: boolean;
    readonly citations: readonly string[];
    readonly evidenceChain: readonly string[];
    readonly unresolvedValidityRisks: readonly string[];
  };
  readonly novelty: {
    readonly causalAxis: string;
    readonly subjectActionContract: string;
    readonly nearestBaseline: string;
    readonly materialDifference: string;
  };
}

export interface ContractDeficiency {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ContractGateResult {
  readonly candidateId: string | null;
  readonly status: "accepted" | "rejected" | "refused";
  readonly deficiencies: readonly ContractDeficiency[];
  readonly checkedRuleCount: number;
  readonly checkedMetricCount: number;
  readonly checkedEnvelopeDimensionCount: number;
}

export interface Phase16CalibrationResult {
  readonly schema: "agent-eval-foundry/phase-16-contract-calibration@1";
  readonly runId: string;
  readonly gateFrozenAt: string;
  readonly gateHashes: Readonly<Record<string, string>>;
  readonly controls: readonly {
    readonly id: string;
    readonly role: string;
    readonly expectedStatus: ContractGateResult["status"];
    readonly expectedDeficiencyCodes: readonly string[];
    readonly result: ContractGateResult;
    readonly held: boolean;
  }[];
  readonly b6: {
    readonly usable: boolean;
    readonly sameInvocation: true;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
    readonly malformedInputRefused: boolean;
    readonly nondegenerate: boolean;
    readonly reasons: readonly string[];
  };
}
