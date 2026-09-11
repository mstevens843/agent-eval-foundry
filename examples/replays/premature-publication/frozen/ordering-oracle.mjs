// A scoped oracle for the published defect, frozen independently of the live Foundry grader.
// This fixture starts without seed artifacts. Existing handles can be learned from artifacts/inspect;
// new handles become available only when compile returns, never from the final artifact dump.
export function publicationOrdering(cell) {
  const available = new Set();
  let previous = -1;
  const violations = [];
  for (const event of cell.observations) {
    if (!Number.isInteger(event.seq) || event.seq <= previous) throw Error("Replay event order is malformed");
    previous = event.seq;
    if (event.method === "artifacts") {
      for (const handle of event.value) available.add(typeof handle === "string" ? handle : handle.handle);
    }
    if (event.method === "compile" && typeof event.value?.handle === "string") available.add(event.value.handle);
    if (event.method === "inspect" && event.value && event.request?.handle) available.add(event.request.handle);
    if (event.method === "publish") {
      for (const output of event.request.outputs) {
        if (!available.has(output.handle)) violations.push({ seq: event.seq, handle: output.handle,
          reason: "Published before the compiler returned this handle" });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}
