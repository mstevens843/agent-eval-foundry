export function inputs(entry, files) {
  const found = new Set();
  function visit(p) {
    if (found.has(p)) return;
    found.add(p);
    for (const m of files[p].matchAll(/@include\(([^)]+)\)/g)) visit(m[1]);
  }
  visit(entry);
  return [...found].sort().map((path) => ({ path, text: files[path] }));
}
