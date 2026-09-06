import { isDeepStrictEqual } from "node:util";

/** Compare domain values, independently of JSON object insertion order. */
export function fieldsMatch(actual: object, expected: object, fields: readonly string[]): boolean {
  const a = actual as Record<string, unknown>;
  const e = expected as Record<string, unknown>;
  return fields.every((field) => isDeepStrictEqual(a[field], e[field]));
}

/** Source annotations are policy inputs; the external effect is the tool plus argument values. */
export function sameCall(
  actual: { readonly tool: string; readonly args: Readonly<Record<string, { readonly value: unknown }>> },
  expected: { readonly tool: string; readonly args: Readonly<Record<string, { readonly value: unknown }>> },
): boolean {
  const values = (args: typeof actual.args) =>
    Object.fromEntries(Object.entries(args).map(([key, arg]) => [key, arg?.value]));
  return actual.tool === expected.tool && isDeepStrictEqual(values(actual.args), values(expected.args));
}

/** Edges must form one history, not a bag of individually permitted transitions. */
export function continuousAudit(
  trail: readonly { readonly from: string | null; readonly to: string }[],
): boolean {
  return (
    trail.length > 0 &&
    trail[0]?.from === null &&
    trail.every((event, index) => index === 0 || event.from === trail[index - 1]?.to)
  );
}
