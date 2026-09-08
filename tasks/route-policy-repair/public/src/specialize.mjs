export function specialize(policies, preference) {
  const result = structuredClone(policies);
  for (const p of Object.values(result))
    for (const a of [...p.terms.map((t) => t.action), p.fallback])
      if (a.kind === "accept") a.preference = preference;
  return result;
}
