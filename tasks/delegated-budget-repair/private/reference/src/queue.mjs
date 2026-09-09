export function ordered(requests) {
  return requests.map((r) => ({ ...r }));
}
