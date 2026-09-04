export interface ExactBinomialInterval {
  readonly successes: number;
  readonly trials: number;
  readonly confidence: number;
  readonly estimate: number;
  readonly lower: number;
  readonly upper: number;
  readonly method: "Clopper-Pearson exact";
}

const assertCount = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
};

const choose = (n: number, k: number): number => {
  const smaller = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= smaller; index += 1) {
    result = (result * (n - smaller + index)) / index;
  }
  return result;
};

const probability = (n: number, k: number, p: number): number => {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return choose(n, k) * p ** k * (1 - p) ** (n - k);
};

const binomialCdf = (atMost: number, n: number, p: number): number => {
  let total = 0;
  for (let k = 0; k <= atMost; k += 1) total += probability(n, k, p);
  return total;
};

const binomialUpperTail = (atLeast: number, n: number, p: number): number => {
  let total = 0;
  for (let k = atLeast; k <= n; k += 1) total += probability(n, k, p);
  return total;
};

const bisectIncreasing = (target: number, fn: (value: number) => number): number => {
  let low = 0;
  let high = 1;
  for (let index = 0; index < 100; index += 1) {
    const midpoint = (low + high) / 2;
    if (fn(midpoint) < target) low = midpoint;
    else high = midpoint;
  }
  return (low + high) / 2;
};

const bisectDecreasing = (target: number, fn: (value: number) => number): number => {
  let low = 0;
  let high = 1;
  for (let index = 0; index < 100; index += 1) {
    const midpoint = (low + high) / 2;
    if (fn(midpoint) > target) low = midpoint;
    else high = midpoint;
  }
  return (low + high) / 2;
};

/** Two-sided Clopper-Pearson interval. No interval is emitted for zero observations. */
export function exactBinomialInterval(
  successes: number,
  trials: number,
  confidence = 0.95,
): ExactBinomialInterval | null {
  assertCount(successes, "successes");
  assertCount(trials, "trials");
  if (successes > trials) throw new RangeError("successes must not exceed trials");
  if (!(confidence > 0 && confidence < 1)) throw new RangeError("confidence must be between 0 and 1");
  if (trials === 0) return null;

  const tail = (1 - confidence) / 2;
  const lower = successes === 0 ? 0 : bisectIncreasing(tail, (p) => binomialUpperTail(successes, trials, p));
  const upper = successes === trials ? 1 : bisectDecreasing(tail, (p) => binomialCdf(successes, trials, p));
  return {
    successes,
    trials,
    confidence,
    estimate: successes / trials,
    lower,
    upper,
    method: "Clopper-Pearson exact",
  };
}
