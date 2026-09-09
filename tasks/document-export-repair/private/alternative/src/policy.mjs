export function filter(text, policy) {
  const literals = [...policy.literals].sort((a, b) => b.length - a.length);
  let result = "",
    i = 0;
  while (i < text.length) {
    const match = literals.find((x) => text.startsWith(x, i));
    if (match) {
      result += "[REDACTED]";
      i += match.length;
    } else result += text[i++];
  }
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
