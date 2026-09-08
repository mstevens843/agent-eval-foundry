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
