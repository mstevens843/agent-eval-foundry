export function microseconds(text, unit) {
  const [whole, fraction = ""] = text.split(".");
  return (
    ((BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"))) *
      { ms: 1000n, s: 1000000n, min: 60000000n }[unit]) /
    1000n
  );
}
function gcd(a, b) {
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}
export function add(a, b) {
  const n = a.n * b.d + b.n * a.d,
    d = a.d * b.d,
    g = gcd(n, d);
  return { n: n / g, d: d / g };
}
export function rounded(a) {
  const q = a.n / a.d,
    r = a.n % a.d;
  return q + (r * 2n > a.d || (r * 2n === a.d && q % 2n) ? 1n : 0n);
}
