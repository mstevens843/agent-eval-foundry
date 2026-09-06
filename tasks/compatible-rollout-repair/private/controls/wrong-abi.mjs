export function choose(releases, _service) {
  return [...releases].sort((a, b) => b.rank - a.rank)[0] ?? null;
}
