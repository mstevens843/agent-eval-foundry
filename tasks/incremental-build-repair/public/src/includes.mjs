export function inputs(entry, files) {
  return Object.entries(files).map(([path, text]) => ({ path, text }));
}
