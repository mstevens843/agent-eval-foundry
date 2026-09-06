// Retained Phase 19 outputs are readable even when a historical source was not preserved.
// This is byte preservation, NOT reproduction of the unavailable registered corpus.
import { readLockedHistory } from "../packages/history.js";
import type { Phase19Reranking } from "./evidence-rerank.js";
export const readPhase19Reranking = (root: string): Phase19Reranking =>
  readLockedHistory(root, "data/phase-19-reranking.json") as Phase19Reranking;
