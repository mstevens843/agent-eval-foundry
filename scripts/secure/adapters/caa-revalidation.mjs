// Trusted cell-side adapter for caa-revalidation.
//
// Ports caa-revalidation-host.mjs's facade logic: `caa.current(fqdn)` still answers only for the
// exact name it is given, from a map the subject cannot enumerate, and every query is still recorded
// in call order. What moved is WHERE the record goes: each query is reported through `emit` on the
// "queries" channel instead of a local array a monkeypatched `process.stdout.write` could bypass.

export async function runCell({ subject, payload, emit }) {
  const scenario = payload?.scenario;
  if (
    scenario === null ||
    typeof scenario !== "object" ||
    scenario === undefined ||
    scenario.view === null ||
    typeof scenario.view !== "object" ||
    !Array.isArray(scenario.view.names) ||
    scenario.current === null ||
    typeof scenario.current !== "object"
  ) {
    throw new Error("scenario is absent or wrong-shaped");
  }
  if (typeof subject.run !== "function") {
    throw new Error("module must export subject.run(view, caa)");
  }

  let seq = 0;
  const caa = Object.freeze({
    current(fqdn) {
      seq += 1;
      emit("call", { channel: "queries", entry: { seq, fqdn: String(fqdn) } });
      const answer = scenario.current[String(fqdn)];
      return answer === "ALLOW" || answer === "DENY" ? answer : "DENY";
    },
  });

  const view = JSON.parse(JSON.stringify(scenario.view));
  const report = await subject.run(view, caa);
  emit("report", report);
}
