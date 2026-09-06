export function eligible(r, w) {
  const g = w?.grants.find(
    (g) => g.id === r.grant && g.delegate === r.delegate && g.version === r.grantVersion,
  );
  return !!g?.allowed && g.spent + r.credits <= g.limit;
}
