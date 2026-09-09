export const minute = (s) => Date.parse(s + "Z") / 60000;
export const civil = (n) => new Date(n * 60000).toISOString().slice(0, 16);
export function utc(local, zone) {
  return minute(local) - zone.initialOffset;
}
