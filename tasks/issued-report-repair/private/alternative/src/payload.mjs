export function payload(d, readings, current) {
  const resolved = d.inputs.map((s) => (s.kind === "reading" ? readings.get(s.id) : current.get(s.id)));
  const values = resolved.map((r, i) => (d.inputs[i].kind === "reading" ? r.value : r.payload.value));
  const unavailable = values.some((v) => v === null);
  return {
    status: unavailable ? "unavailable" : "available",
    value: unavailable ? null : d.op === "sum" ? values.reduce((a, b) => a + b, 0) : values[0] - values[1],
    sources: d.inputs.map((s, i) => ({ ...s, version: resolved[i].version })),
  };
}
export function changed(a, b) {
  return a.status !== b.status || a.value !== b.value;
}
