export function filter(text, policy) {
  let result = text;
  for (const literal of policy.literals) result = result.split(literal).join("[REDACTED]");
  return result;
}
export function jsonValue(value, policy) {
  if (typeof value === "string") return filter(value, policy);
  if (Array.isArray(value)) return value.map((v) => jsonValue(v, policy));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        policy.fields.includes(k) && typeof v === "string" ? "[REDACTED]" : jsonValue(v, policy),
      ]),
    );
  return value;
}
