export const keyOf = (start, key) => JSON.stringify([start, key]);
export function add(windows, e, width) {
  const start = Math.floor(e.time / width) * width,
    k = keyOf(start, e.key);
  const row = windows.get(k) ?? { start, key: e.key, total: 0, count: 0 };
  row.total += e.delta;
  row.count++;
  windows.set(k, row);
}
export async function close(windows, frontier, view, api) {
  for (const [key, row] of windows)
    if (row.start + view.width + view.lateness <= frontier) {
      await api.emit({ row });
      windows.delete(key);
    }
}
