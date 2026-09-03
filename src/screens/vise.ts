// Screen 1 — the vise test. Paper, ~45 minutes, and it kills more than the other four combined.
//
// The identifiability vise, from the source project's FINDINGS.md §3:
//
//   Fairness requires the graded rules fully stated. Human solvability requires the answer
//   computable from rules + data by an expert in 4-10 hours. But if a human can compute it, a
//   program can — and the agent writes that program and uses it as a self-check.
//
// So either the container determines the answer, in which case the agent enumerates or simulates
// its way there and the human's route is the agent's route run slower; or it does not, in which
// case the task grades a private convention and the expert fails too. Seven of fifteen cycle-5
// candidates died on exactly this fork and none found an interior.
//
// This screen makes the fork executable. It demands a written evidence chain and then does the one
// thing a prose review cannot: it VERIFIES THE CITATIONS. A derivation that quotes a sentence the
// package does not contain is void — not weak, void — and in practice that is the single most
// common way a plausible-sounding derivation fails, because a reader reconstructing a rule from
// memory reliably produces a sentence the author meant to write rather than the one they did.
//
// The banding is where this phase departs from every previous one. The instrument used to have two
// outcomes and the truth has three, and the missing one is the only one worth building.

import type { Band, ChainProfile, Citation, EvidenceChain, ViseVerdict } from "./types.js";

/**
 * Collapse runs of whitespace so a quote survives the reflowing every markdown file has had.
 *
 * Deliberately narrow: it normalises whitespace and the three dash variants and nothing else. It
 * does NOT lowercase, strip punctuation, or fuzzy-match. A citation screen that matches
 * approximately would pass exactly the derivations this exists to catch — the ones that quote what
 * the author meant instead of what the author wrote.
 */
export const normalise = (s: string): string => s.replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();

/**
 * Which citations cannot be found in the visible text.
 *
 * `visible` is every artifact the subject can read, concatenated. The check is substring
 * containment after normalisation, which is strict enough to catch a fabricated sentence and loose
 * enough to survive a line wrap.
 */
export const verifyCitations = (citations: readonly Citation[], visible: string): readonly Citation[] => {
  const hay = normalise(visible);
  return citations.filter((c) => !hay.includes(normalise(c.quote)));
};

export const profile = (chain: EvidenceChain): ChainProfile => ({
  citationCount: new Set(chain.citations.map((c) => normalise(c.quote))).size,
  sectionSpan: new Set(chain.citations.map((c) => c.section.trim())).size,
  inferenceDepth: chain.steps.length,
  negativeInference: chain.negativeInference,
  assumptionCount: chain.assumptions.length,
});

/**
 * Band a verified profile.
 *
 * Order matters and is not arbitrary. Assumptions dominate everything: a chain that needed a fact
 * the text does not carry is underspecified no matter how short it is, because the reader supplied
 * the missing rule and a different reader would have supplied a different one. Only after that does
 * shape matter.
 */
export const band = (p: ChainProfile): { band: Band; reasons: readonly string[] } => {
  const reasons: string[] = [];

  if (p.assumptionCount > 0) {
    reasons.push(
      `${p.assumptionCount} assumption(s) not present in the cited text: the reader supplied the rule`,
    );
    return { band: "underspecified", reasons };
  }

  if (p.citationCount === 0) {
    reasons.push("no citations: no chain of shipped evidence could be written");
    return { band: "unfair", reasons };
  }

  if (p.citationCount === 1 && p.sectionSpan === 1 && p.inferenceDepth <= 1 && !p.negativeInference) {
    reasons.push("stated outright in one sentence: p >= 0.85, fair but not worth building");
    return { band: "explicit", reasons };
  }

  // A negative inference is load-bearing whenever the conclusion cannot be reached without it, and
  // the chain declares that by setting the flag. It is the fragile kind because its soundness rests
  // on an enumeration being closed, and prose does not declare closure.
  if (p.negativeInference) {
    reasons.push("depends on something not being stated: sound only if the enumeration is closed");
  }
  if (p.citationCount >= 4) reasons.push(`${p.citationCount} citations: 4 or more is tortuous`);
  if (p.sectionSpan >= 3) reasons.push(`spans ${p.sectionSpan} sections: 3 or more is tortuous`);
  if (p.inferenceDepth > 2) reasons.push(`inference depth ${p.inferenceDepth}: more than 2 steps`);

  if (reasons.length > 0) return { band: "demanding-fragile", reasons };

  reasons.push(
    `${p.citationCount} citations across ${p.sectionSpan} section(s), depth ${p.inferenceDepth}, no negative inference`,
  );
  return { band: "demanding-fair", reasons };
};

/**
 * Run the vise test on one chain against the visible package.
 *
 * A chain with unverified citations is voided rather than banded, and voided is reported as
 * `unfair` — not because the task is necessarily unfair, but because no VERIFIED chain has been
 * written for it, which is the same evidentiary position. The distinction is recorded in the
 * reasons so a reader can tell "nobody has written one" from "one was written and it was fiction".
 */
export const vise = (chain: EvidenceChain, visible: string): ViseVerdict => {
  const unverified = verifyCitations(chain.citations, visible);
  const p = profile(chain);

  if (unverified.length > 0) {
    return {
      chainId: chain.id,
      band: "unfair",
      profile: p,
      unverifiedCitations: unverified,
      reasons: [
        `${unverified.length} of ${chain.citations.length} citation(s) do not appear in the visible package: the chain is void`,
        ...unverified.map((c) => `  ${c.section} quoted "${c.quote.slice(0, 72)}..." — not found`),
      ],
    };
  }

  const b = band(p);
  return {
    chainId: chain.id,
    band: b.band,
    profile: p,
    unverifiedCitations: [],
    reasons: b.reasons,
  };
};

/** The bands that permit a build. Everything else is a kill or a repair. */
export const PASSES_VISE: readonly Band[] = ["demanding-fair"];

export const clearsVise = (v: ViseVerdict): boolean => PASSES_VISE.includes(v.band);
