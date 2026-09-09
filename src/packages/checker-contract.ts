/** A reason identifies an obligation, optionally followed by a readable explanation. */
export function namesCheck(reasons: unknown, checkId: string): boolean {
  return (
    Array.isArray(reasons) &&
    reasons.some(
      (reason) => typeof reason === "string" && (reason === checkId || reason.startsWith(`${checkId}:`)),
    )
  );
}

/** A control can violate several public obligations. Its private calibration label
 * is not a requirement that the checker must guess instead of naming another real failure. */
export function namesObservedFailure(reasons: unknown, observedFailures: readonly string[]): boolean {
  return observedFailures.some((check) => namesCheck(reasons, check));
}

/** Validate the whole population before counting rejections: absent is not false. */
export function completeVerdicts(
  value: unknown,
  tokens: readonly string[],
): value is {
  verdicts: Record<string, { ok: boolean; reasons?: string[] }>;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const verdicts = (value as { verdicts?: unknown }).verdicts;
  if (!verdicts || typeof verdicts !== "object" || Array.isArray(verdicts)) return false;
  const rows = verdicts as Record<string, { ok?: unknown; reasons?: unknown }>;
  return (
    Object.keys(rows).length === tokens.length &&
    tokens.every(
      (token) =>
        Object.hasOwn(rows, token) &&
        rows[token] !== null &&
        typeof rows[token] === "object" &&
        !Array.isArray(rows[token]) &&
        typeof rows[token].ok === "boolean" &&
        (rows[token].reasons === undefined ||
          (Array.isArray(rows[token].reasons) && rows[token].reasons.every((r) => typeof r === "string"))),
    )
  );
}

/** Extra positive candidates are self-contained overlays of the public starter. */
export function positiveVariantKeys(paths: readonly string[]): string[] {
  return [
    ...new Set(
      paths.flatMap((path) => {
        const match = /^private\/variants\/([a-z0-9][a-z0-9-]*)\/.+$/.exec(path);
        return match?.[1] ? [match[1]] : [];
      }),
    ),
  ].sort();
}
