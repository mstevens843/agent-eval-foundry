// How many things does a suite measure? Counting distinct catch sets overstates it, and this file
// is the correction.
//
// Suppose three instances have catch sets {A}, {A,B}, {A,B,C}. That is three distinct sets, so the
// naive count says three measurements. But they form a CHAIN under subset inclusion, and a chain has
// a much duller reading available: one underlying defect, three instances of increasing sensitivity
// to it. The strictest instance catches everything the others do. Nothing in the data forces the
// three-measurement story, so honesty requires reporting the dull one.
//
// The right statistic is therefore the width of the subset-poset: the size of the largest ANTICHAIN,
// a set of catch sets no two of which are nested. Those cannot be explained as one defect at
// different sensitivities, because each catches something the others miss.
//
// Computing it uses Dilworth's theorem: in a finite poset the maximum antichain equals the minimum
// number of chains covering the poset.
//
// The load-bearing step, stated precisely because it is the one a reader should check: the minimum
// vertex-disjoint PATH cover of a DAG is `n - maximumMatching` in the bipartite graph of its ORIENTED
// edge relation (left i, right j, edge iff S_i ⊊ S_j). That equals the minimum CHAIN cover only when
// the DAG is its own transitive closure -- otherwise a path cover can be strictly larger than a chain
// cover. Proper subset inclusion is transitive and we build an edge for every ordered comparable
// pair, so this DAG is transitively closed and the two coincide. Note the relation must stay
// oriented: "comparability" is symmetric, and adding both directions would destroy the DAG and the
// identity with it.
//
// Maximum matching is Kuhn's augmenting-path algorithm, O(V*E) and entirely adequate: n here is the
// number of DISTINCT catch sets, bounded by the suite size and typically under a hundred.
//
// One property this does NOT have, and which callers must not assume: the minimum chain cover is not
// unique. The width is canonical; the particular partition into chains depends on the order the
// input is scanned. Do not attach semantic identity to a specific chain.
//
// Jaccard clustering is also provided, for the softer question "which instances are nearly the
// same". It is deliberately not used for the headline number. A threshold is a knob, and a knob is
// something a person tunes until the answer is the one they wanted; the antichain width has no knob.

const isSubset = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length > b.length) return false;
  const set = new Set(b);
  return a.every((x) => set.has(x));
};

/** Strict subset: a ⊊ b. */
export const isProperSubset = (a: readonly string[], b: readonly string[]): boolean =>
  a.length < b.length && isSubset(a, b);

export function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setB = new Set(b);
  const inter = a.filter((x) => setB.has(x)).length;
  const union = a.length + b.length - inter;
  return union === 0 ? 1 : inter / union;
}

/** Maximum bipartite matching by Kuhn's algorithm. `adj[i]` lists right-nodes reachable from left i. */
function maxMatching(adj: readonly (readonly number[])[], rightCount: number): number {
  const matchRight = new Array<number>(rightCount).fill(-1);
  let total = 0;

  const tryKuhn = (left: number, seen: boolean[]): boolean => {
    for (const right of adj[left] ?? []) {
      if (seen[right] === true) continue;
      seen[right] = true;
      const current = matchRight[right];
      if (current === undefined) continue;
      if (current === -1 || tryKuhn(current, seen)) {
        matchRight[right] = left;
        return true;
      }
    }
    return false;
  };

  for (let left = 0; left < adj.length; left += 1) {
    if (tryKuhn(left, new Array<boolean>(rightCount).fill(false))) total += 1;
  }
  return total;
}

export interface AntichainResult {
  /** Width of the poset: the count of measurements not explainable as one defect at varying sensitivity. */
  readonly width: number;
  /** A minimum chain cover. Each chain is a nested sequence, weakest first. */
  readonly chains: readonly (readonly (readonly string[])[])[];
}

/**
 * Maximum antichain width over distinct catch sets, plus a witnessing minimum chain cover.
 *
 * `sets` must already be deduplicated; duplicates are the same measurement and would each add a
 * spurious chain.
 */
export function antichainWidth(sets: readonly (readonly string[])[]): AntichainResult {
  const n = sets.length;
  if (n === 0) return { width: 0, chains: [] };

  const adj: number[][] = sets.map((a, i) =>
    sets.flatMap((b, j) => (i !== j && isProperSubset(a, b) ? [j] : [])),
  );

  const matchRight = new Array<number>(n).fill(-1);
  const matchLeft = new Array<number>(n).fill(-1);

  const tryKuhn = (left: number, seen: boolean[]): boolean => {
    for (const right of adj[left] ?? []) {
      if (seen[right] === true) continue;
      seen[right] = true;
      const current = matchRight[right];
      if (current === undefined) continue;
      if (current === -1 || tryKuhn(current, seen)) {
        matchRight[right] = left;
        matchLeft[left] = right;
        return true;
      }
    }
    return false;
  };

  let matched = 0;
  for (let left = 0; left < n; left += 1) {
    if (tryKuhn(left, new Array<boolean>(n).fill(false))) matched += 1;
  }

  // Reconstruct chains: each left node points to its successor; chain heads are unmatched on the right.
  const hasPredecessor = new Array<boolean>(n).fill(false);
  for (let r = 0; r < n; r += 1) if ((matchRight[r] ?? -1) !== -1) hasPredecessor[r] = true;

  const chains: (readonly string[])[][] = [];
  for (let i = 0; i < n; i += 1) {
    if (hasPredecessor[i] === true) continue;
    const chain: (readonly string[])[] = [];
    let cur = i;
    const guard = new Set<number>();
    while (cur !== -1 && !guard.has(cur)) {
      guard.add(cur);
      const s = sets[cur];
      if (s !== undefined) chain.push(s);
      cur = matchLeft[cur] ?? -1;
    }
    chains.push(chain);
  }

  return { width: n - matched, chains };
}

/**
 * The standalone matching, exported so the width can be checked without trusting the chain
 * reconstruction: `sets.length - maxBipartiteMatching(adj, sets.length)` must equal
 * `antichainWidth(sets).width` for the same `adj`. `test/axis-meter.test.ts` pins that equality, so
 * this and the matching loop inlined in `antichainWidth` cannot silently diverge.
 */
export const maxBipartiteMatching = maxMatching;

/** Build the oriented proper-subset DAG used by `antichainWidth`. Exposed for that same check. */
export const subsetAdjacency = (sets: readonly (readonly string[])[]): readonly (readonly number[])[] =>
  sets.map((a, i) => sets.flatMap((b, j) => (i !== j && isProperSubset(a, b) ? [j] : [])));

/** Group catch sets whose pairwise Jaccard meets `threshold`, greedily by descending set size. */
export function jaccardGroups(
  sets: readonly (readonly string[])[],
  threshold: number,
): readonly (readonly number[])[] {
  const order = sets.map((_, i) => i).sort((a, b) => (sets[b]?.length ?? 0) - (sets[a]?.length ?? 0));
  const assigned = new Set<number>();
  const groups: number[][] = [];
  for (const i of order) {
    if (assigned.has(i)) continue;
    const group = [i];
    assigned.add(i);
    for (const j of order) {
      if (assigned.has(j)) continue;
      if (jaccard(sets[i] ?? [], sets[j] ?? []) >= threshold) {
        group.push(j);
        assigned.add(j);
      }
    }
    groups.push(group);
  }
  return groups;
}
