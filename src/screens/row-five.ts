// Calibration row 5, made generative.
//
// Phase 6 found ONE concrete instance of "requires choosing against a confirmed green measurement",
// which the source project's calibration table names as one of only two rows worth building on. The
// instance is the durable outbox's `idem_key`:
//
//   idem_key(action_id, req_id, epoch) is a pure function, and epoch increments on every lease. A
//   crash forces the lease to expire, so the epoch after restart differs from the epoch at the time
//   of the call. An engine that RECOMPUTES the key gets one the tool has never seen: the dedupe does
//   not fire, a second side effect happens, and the engine's own check runs GREEN -- it re-invoked,
//   it received OK, it recorded EXECUTED. The failure is only visible in a ledger the engine cannot
//   read (SEMANTICS section 7: "That record is not readable from the engine").
//
// An instance is worth one task. The SHAPE is worth a generator, and this module is the shape.
//
//   A value that must be RECOVERED from committed evidence, where RECOMPUTATION silently yields a
//   different value, and the subject's natural self-check confirms the recomputed one.
//
// WHY EACH ELEMENT EARNS ITS PLACE. Drop any one and it stops being row 5:
//
//   - Recomputation must be the NATURAL move. If recovering is the obvious path, p goes to 0.85 and
//     you are on row 2, a consequence of a stated rule.
//   - The divergence must be SILENT. An exception, an error return, a type mismatch -- any signal at
//     all -- and the agent's normal debugging loop finds it. Row 3, a standard tool's residual.
//   - The local check must PASS. This is the whole of row 5. A failure the subject can observe is an
//     ordinary bug, and ordinary bugs are what agents are good at.
//   - The divergence must be GRADED, on evidence the subject cannot read. Otherwise nothing measures
//     it and the mechanism is decorative -- which the activation audit would catch anyway.
//
// WHAT THIS MODULE IS NOT. It does not decide whether a candidate is interesting. It checks whether
// a candidate has the structure, and the sharp part is `divergenceIsLocallyObservable`: a candidate
// whose divergence CAN be seen from subject-readable state is rejected, because the agent's own
// check would catch it and the whole mechanism collapses.

/** The six elements. A candidate must declare all of them or it is not this shape. */
export interface RowFiveCandidate {
  readonly id: string;
  readonly domain: string;

  /** The value the subject must get right, e.g. "the idempotency key for the retried call". */
  readonly value: string;

  /**
   * Where the authoritative copy lives, and when it was committed.
   *
   * Must be durable and must have been written BEFORE the boundary. A value committed after the
   * boundary is not recoverable and the task is unfair rather than hard.
   */
  readonly committedEvidence: string;

  /** What changes between the write and the recovery: a restart, a re-lease, a new session. */
  readonly boundary: string;

  /**
   * The recomputation the subject will naturally reach for, and the input that has moved under it.
   *
   * Naming the moved input is required, because it is the thing a reviewer checks. In the outbox it
   * is `epoch`.
   */
  readonly recomputation: string;
  readonly movedInput: string;

  /** What the subject's own verification will conclude. Must be a PASS for this to be row 5. */
  readonly localCheckOutcome: string;

  /** The external record that grades it, and why the subject cannot read it. */
  readonly gradedOn: string;
  readonly whyUnreadable: string;

  /**
   * Whether the divergence can be detected from state the subject CAN read.
   *
   * The load-bearing field. If true the candidate is not row 5, whatever else it declares.
   */
  readonly divergenceIsLocallyObservable: boolean;

  /** Anything that would signal the divergence: an exception, an error code, a type error. */
  readonly signalsEmitted: readonly string[];
}

export type RowFiveVerdict =
  | "row-five"
  /** Real, but the subject can see the divergence, so its own check catches it. */
  | "locally-observable"
  /** Something signals. The agent's ordinary debugging loop finds it. */
  | "signalled"
  /** Nothing grades the divergence, so the mechanism measures nothing. */
  | "ungraded"
  /** The evidence is not committed before the boundary, so recovery is impossible. */
  | "unrecoverable"
  /** Missing declared elements. */
  | "incomplete";

export interface RowFiveResult {
  readonly candidateId: string;
  readonly verdict: RowFiveVerdict;
  readonly reasons: readonly string[];
  /** Rough p from the calibration table, when the shape holds. */
  readonly pBand: readonly [number, number] | null;
}

const nonEmpty = (s: string | undefined): boolean => typeof s === "string" && s.trim().length > 0;

/**
 * Screen a candidate against the shape.
 *
 * Order matters: completeness, then recoverability, then the three properties that distinguish row 5
 * from the cheaper rows. The first failure is reported, because a candidate that fails on
 * recoverability is unfair and there is no point telling its author about signal discipline.
 */
export const screenRowFive = (c: RowFiveCandidate): RowFiveResult => {
  const missing = (
    [
      ["value", c.value],
      ["committedEvidence", c.committedEvidence],
      ["boundary", c.boundary],
      ["recomputation", c.recomputation],
      ["movedInput", c.movedInput],
      ["gradedOn", c.gradedOn],
    ] as const
  )
    .filter(([, v]) => !nonEmpty(v))
    .map(([k]) => k);

  if (missing.length > 0) {
    return {
      candidateId: c.id,
      verdict: "incomplete",
      reasons: [`does not declare: ${missing.join(", ")}`],
      pBand: null,
    };
  }

  // Unfair rather than hard: nothing to recover from.
  if (/^\s*(none|nothing|n\/a)\b/i.test(c.committedEvidence)) {
    return {
      candidateId: c.id,
      verdict: "unrecoverable",
      reasons: [
        "no evidence is committed before the boundary, so the correct value cannot be recovered by anyone: this is a hidden rule, not a hard one",
      ],
      pBand: null,
    };
  }

  if (!nonEmpty(c.whyUnreadable)) {
    return {
      candidateId: c.id,
      verdict: "ungraded",
      reasons: [
        "the grading record is not declared unreadable by the subject, so the subject can check it and the local check stops being green",
      ],
      pBand: null,
    };
  }

  if (c.signalsEmitted.length > 0) {
    return {
      candidateId: c.id,
      verdict: "signalled",
      reasons: [
        `the divergence emits ${c.signalsEmitted.length} signal(s) (${c.signalsEmitted.join(", ")}): an ordinary debugging loop finds it, which is calibration row 3, not row 5`,
      ],
      pBand: null,
    };
  }

  if (c.divergenceIsLocallyObservable) {
    return {
      candidateId: c.id,
      verdict: "locally-observable",
      reasons: [
        "the divergence is visible from state the subject can read, so the subject's own verification catches it: this is an ordinary bug and agents are good at ordinary bugs",
      ],
      pBand: null,
    };
  }

  return {
    candidateId: c.id,
    verdict: "row-five",
    reasons: [
      `${c.value} must be recovered from ${c.committedEvidence}`,
      `across ${c.boundary}, under which ${c.movedInput} moves`,
      `recomputing via ${c.recomputation} diverges silently`,
      `the subject's own check concludes: ${c.localCheckOutcome}`,
      `graded on ${c.gradedOn}, unreadable because ${c.whyUnreadable}`,
    ],
    pBand: [0.35, 0.55],
  };
};

/**
 * The mechanical core, and the reason this module is more than a form.
 *
 * Simulates one recover-vs-recompute divergence against an idempotent external authority and reports
 * what each party sees. It exists so the claim "the local check passes while the ledger diverges" is
 * a demonstration rather than an assertion -- the same reason the calibration ladder in
 * `test/screens.test.ts` builds artifacts instead of describing them.
 */
export interface DivergenceTrace {
  /** Distinct effects the external authority recorded. Correct behaviour is 1. */
  readonly externalEffects: number;
  /** What the subject's own verification concludes. Row 5 requires this to be true. */
  readonly localCheckPasses: boolean;
  /** Whether an external grader keyed on the stable id would see the fault. */
  readonly gradedAsFailure: boolean;
  readonly keysSeen: readonly string[];
}

export const simulateRecoverVsRecompute = (opts: {
  /** The stable identity the grader keys on, e.g. an action id. */
  readonly stableId: string;
  /** The value at the time of the first call. */
  readonly valueBefore: string;
  /** The value a recomputation produces after the boundary. */
  readonly valueAfter: string;
  /** Whether the subject recovers the committed value or recomputes it. */
  readonly strategy: "recover" | "recompute";
}): DivergenceTrace => {
  const ledger: { key: string; id: string }[] = [];
  // An idempotent authority: a key it has already seen records no new effect.
  const invoke = (key: string): "OK" => {
    if (!ledger.some((e) => e.key === key)) ledger.push({ key, id: opts.stableId });
    return "OK";
  };

  invoke(opts.valueBefore); // the pre-boundary call
  const retried = opts.strategy === "recover" ? opts.valueBefore : opts.valueAfter;
  const outcome = invoke(retried); // the post-boundary recovery call

  // What the subject can see: it retried, it got OK, so it believes one effect exists. This is the
  // green measurement it is being asked to choose against, and it is green in BOTH strategies.
  const localCheckPasses = outcome === "OK";

  const effectsForId = ledger.filter((e) => e.id === opts.stableId).length;
  return {
    externalEffects: effectsForId,
    localCheckPasses,
    gradedAsFailure: effectsForId !== 1,
    keysSeen: ledger.map((e) => e.key),
  };
};
