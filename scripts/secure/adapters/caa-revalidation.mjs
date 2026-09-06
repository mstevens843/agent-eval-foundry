// Imported only by the authority. Current answers cross only through the current(name) operation.
export function createAuthority({ scenario }) {
  if (!scenario || !Array.isArray(scenario.view?.names) || !scenario.current) throw new Error("invalid CAA scenario");
  const queries = [];
  let report = null;
  return {
    count: 1,
    begin() { return { method: "run", view: scenario.view, facades: [{ name: "caa", methods: ["current"], properties: {} }] }; },
    invoke(method, args) {
      if (method !== "caa.current" || !Array.isArray(args) || args.length !== 1 || typeof args[0] !== "string") throw new Error("invalid CAA operation");
      const fqdn = args[0];
      queries.push({ seq: queries.length + 1, fqdn });
      const answer = Object.hasOwn(scenario.current, fqdn) ? scenario.current[fqdn] : null;
      return answer === "ALLOW" || answer === "DENY" ? answer : "DENY";
    },
    report(value) { report = value; },
    result() { return { channels: { queries }, report }; },
  };
}
