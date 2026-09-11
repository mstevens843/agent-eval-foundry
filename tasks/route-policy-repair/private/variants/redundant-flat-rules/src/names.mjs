export function fresh(policies, base) {
  let n = 0;
  while (Object.hasOwn(policies, base + n)) n++;
  return base + n;
}
