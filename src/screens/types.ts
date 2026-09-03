// The five screens, in cost order — ported from the source project's FINDINGS.md §9.
//
// WHY THIS MODULE EXISTS. This repository built exactly one of the five screens its own source
// project had already established, and it built the most expensive one. `src/spec-probe/` is
// roughly screen 5 with a little of screen 1. There is no activation audit, no leak audit and no
// identifiability check — and those are the three that do the killing. The source project's
// measured verdict on its own five designs:
//
//   "Four of five designs would have been killed at step 1, 2 or 3 — before any code was written
//    for the task itself."
//
// The foundry instead killed four families after building them, and killed a fifth (Phase 5's
// forward build) only after a complete SPEC and four independent readers. That is the same
// information bought at roughly two orders of magnitude more cost, one family per phase.
//
// THE ORDER IS THE POINT. Screens run cheapest-first and stop at the first kill, because the entire
// economic argument is that a paper screen costing 45 minutes should never be preceded by a build
// costing 18 to 120 hours. A runner that executes all five and reports them together would be
// correct and useless.
//
// WHAT THESE ARE NOT. None of these is a judge. Screen 1 is adjudicated by independent readers, not
// by this code — this code verifies that the citations a derivation claims actually exist and says
// what profile the derivation has. Screens 2-4 are mechanical and their verdicts are facts about
// the artifact, not opinions about it.

/** The five screens, in the cost order that makes the economics work. */
export type ScreenId = "vise" | "activation" | "leak" | "identifiability" | "agent";

export const SCREEN_ORDER: readonly ScreenId[] = ["vise", "activation", "leak", "identifiability", "agent"];

/** Roughly what each screen costs to run once, for the cost-ordered report. */
export const SCREEN_COST: Readonly<Record<ScreenId, string>> = {
  vise: "paper, ~45 min",
  activation: "mechanical, seconds",
  leak: "mechanical, seconds",
  identifiability: "mechanical, seconds",
  agent: "~25 min, 3 samples",
};

/**
 * One sentence a derivation leans on, with the section it came from.
 *
 * `quote` is verified against the visible package by `verifyCitations`. A derivation citing a
 * sentence that is not there is void — not weak evidence, not a near miss. That check is the whole
 * reason this screen is mechanical rather than a vibe: it is the difference between "the reader
 * says the spec states X" and "the spec states X".
 */
export interface Citation {
  /** Section identifier as the reader wrote it, e.g. "§6". Used for section-span, not for lookup. */
  readonly section: string;
  /** The sentence, quoted. Must appear in the visible package after whitespace normalisation. */
  readonly quote: string;
}

/**
 * A written chain of shipped evidence by which any solver determines the answer.
 *
 * FINDINGS.md §9 step 1: "Name the chain of shipped evidence by which *any* solver determines the
 * answer. If it cannot be written, the task is unfair. If it can, that paragraph is the attack
 * path." The second half is why this doubles as the difficulty analysis rather than only a fairness
 * check — a chain that is easy to write is an attack that is easy to run.
 */
export interface EvidenceChain {
  readonly id: string;
  /** The question this chain answers, stated so that a reader could answer it independently. */
  readonly question: string;
  /** The answer the chain reaches. */
  readonly answer: string;
  readonly citations: readonly Citation[];
  /** One step per inference. Length is the depth. */
  readonly steps: readonly string[];
  /**
   * Whether any step depends on something NOT being stated — an enumeration read as exhaustive, an
   * absent edge read as a forbidden edge.
   *
   * This is the fragile kind and it is flagged rather than banned. The durable outbox's ACKED rule
   * is the worked example: §4 enumerates transitions and ACKED has no outgoing arrow, but the
   * paragraph immediately after introduces `IN_DOUBT`, a state absent from that same diagram, which
   * falsifies it as an exhaustive enumeration. A negative inference is only as good as the
   * enumeration's closure, and closure is exactly what prose does not declare.
   */
  readonly negativeInference: boolean;
  /** Where the negative inference sits, if there is one. Required when the flag is set. */
  readonly negativeInferenceSite?: string;
  /** Assumptions used that are not in the cited text. Any entry here means category 1. */
  readonly assumptions: readonly string[];
  readonly author: string;
}

export interface ChainProfile {
  readonly citationCount: number;
  readonly sectionSpan: number;
  readonly inferenceDepth: number;
  readonly negativeInference: boolean;
  readonly assumptionCount: number;
}

/**
 * The bands. The middle one is the entire contribution of this phase.
 *
 * The foundry's instrument had two outcomes — defect or not — and collapsed "derivable but
 * demanding" into "defect". That is why it has rejected five of five, including one artifact
 * written by an author who knew every failure mode and wrote explicitly against each. A screen with
 * no pass band is indistinguishable from a broken screen.
 */
export type Band =
  /** No chain can be written: the rule is hidden and the task is unfair to any solver. */
  | "unfair"
  /** Stated outright. Fair, and per the calibration table p >= 0.85, so not worth building. */
  | "explicit"
  /** The interior. Derivable from cited text, demanding enough that most readers miss it. */
  | "demanding-fair"
  /** Derivable but the derivation is tortuous or rests on a negative inference. Repair first. */
  | "demanding-fragile"
  /** A reader had to supply something the text does not say. Withdraw. */
  | "underspecified";

export interface ViseVerdict {
  readonly chainId: string;
  readonly band: Band;
  readonly profile: ChainProfile;
  /** Citations that could not be found in the visible package. A non-empty list voids the chain. */
  readonly unverifiedCitations: readonly Citation[];
  readonly reasons: readonly string[];
}

/** A structure that claims to carry difficulty, and how often it actually fired. */
export interface ActivationRecord {
  readonly name: string;
  readonly kind: "check" | "knob";
  /** How many measured opportunities there were. */
  readonly opportunities: number;
  /** How many times it fired -- a check that failed someone, a knob that moved the expected label. */
  readonly fired: number;
  /**
   * Whether it actually SEPARATED anything.
   *
   * Distinct from `fired > 0` at both ends, and the distinction is the screen. A check every graded
   * cell passes measures nothing; so does a check every graded cell fails, which is a constant
   * wearing a check's name. Only the interior discriminates between subjects, and discriminating
   * between subjects is the entire job.
   */
  readonly separated: boolean;
  readonly rate: number;
}

export interface ActivationVerdict {
  readonly subjectId: string;
  readonly records: readonly ActivationRecord[];
  readonly dead: readonly ActivationRecord[];
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

export interface LeakVerdict {
  readonly subjectId: string;
  /** Bits of the label recoverable from the single most informative visible field. */
  readonly maxMutualInformationBits: number;
  /** Label entropy, for scale. MI at or near this means the label is a lookup. */
  readonly labelEntropyBits: number;
  readonly worstField: string | null;
  /** Accuracy of a depth-limited decision tree over visible fields alone. */
  readonly classifierAccuracy: number;
  /** Accuracy of always predicting the most common label. The floor to beat. */
  readonly majorityBaseline: number;
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

export interface IdentifiabilityVerdict {
  readonly subjectId: string;
  /** Groups of instances whose visible content is byte-identical but whose labels differ. */
  readonly collisions: readonly {
    readonly visibleHash: string;
    readonly instanceIds: readonly string[];
    readonly labels: readonly string[];
  }[];
  readonly instancesChecked: number;
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

/** The calibration table from FINDINGS.md §6, measured against demonstrated capability. */
export type DiscoveryShape =
  | "evidence-channel-present"
  | "consequence-of-stated-rule"
  | "standard-tool-residual"
  | "memorised-public-implementation"
  | "choose-against-confirmed-green"
  | "abstraction-model-cannot-justify";

export interface CalibrationRow {
  readonly shape: DiscoveryShape;
  readonly description: string;
  readonly pLow: number;
  readonly pHigh: number;
  /** Only the last two rows are worth building on. */
  readonly worthBuilding: boolean;
}

export const CALIBRATION_TABLE: readonly CalibrationRow[] = [
  {
    shape: "evidence-channel-present",
    description: "Uses an evidence channel present in the container",
    pLow: 0.85,
    pHigh: 1.0,
    worthBuilding: false,
  },
  {
    shape: "consequence-of-stated-rule",
    description: "Is a consequence of a rule stated in the instruction",
    pLow: 0.85,
    pHigh: 1.0,
    worthBuilding: false,
  },
  {
    shape: "standard-tool-residual",
    description: "Falls out of running a standard tool and reading the residual",
    pLow: 0.8,
    pHigh: 1.0,
    worthBuilding: false,
  },
  {
    shape: "memorised-public-implementation",
    description: "Is a memorised public implementation",
    pLow: 0.85,
    pHigh: 1.0,
    worthBuilding: false,
  },
  {
    shape: "choose-against-confirmed-green",
    description: "Requires choosing against a confirmed green measurement",
    pLow: 0.35,
    pHigh: 0.55,
    worthBuilding: true,
  },
  {
    shape: "abstraction-model-cannot-justify",
    description: "Requires an abstraction the model must justify but cannot",
    pLow: 0.3,
    pHigh: 0.5,
    worthBuilding: true,
  },
];
