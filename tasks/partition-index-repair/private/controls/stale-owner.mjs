export function owners(p) {
  return { assign() {}, accept: (e) => p.includes(e.partition) };
}
