export function tokens(pattern) {
  const result = [];
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      result.push({ kind: "literal", value: pattern[++i] });
      continue;
    }
    result.push(c === "*" ? { kind: "star" } : c === "?" ? { kind: "any" } : { kind: "literal", value: c });
  }
  return result.filter((t, i) => t.kind !== "star" || result[i - 1]?.kind !== "star");
}
