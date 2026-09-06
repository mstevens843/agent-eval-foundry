// Domain adapters choose operations explicitly. Neither property traversal nor subject code runs here.
export function session(view, operations, onReport, observations, count = 1) {
  const names = Object.keys(operations);
  return {
    count,
    begin(index) {
      return {
        attemptId: String(index),
        method: "run",
        view: typeof view === "function" ? view(index) : view,
        facades: [{ name: "api", methods: names, properties: {} }],
      };
    },
    async invoke(name, args) {
      const key = name.startsWith("api.") ? name.slice(4) : "";
      if (
        !names.includes(key) ||
        !Array.isArray(args) ||
        args.length !== 1 ||
        !args[0] ||
        typeof args[0] !== "object" ||
        Array.isArray(args[0])
      )
        throw Error("operation or argument schema");
      const request = structuredClone(args[0]);
      const value = await operations[key](request);
      observations.push({ seq: observations.length, method: key, request, value: structuredClone(value) });
      return value;
    },
    report: onReport,
    result: () => ({ channels: { observations }, report: { captured: true } }),
  };
}
export const equal = (a, b) => canonical(a) === canonical(b);
export function canonical(x) {
  if (Array.isArray(x)) return JSON.stringify(x.map((v) => JSON.parse(canonical(v))));
  if (x && typeof x === "object")
    return JSON.stringify(
      Object.fromEntries(
        Object.keys(x)
          .sort()
          .map((k) => [k, JSON.parse(canonical(x[k]))]),
      ),
    );
  return JSON.stringify(x);
}
export function checks(map) {
  return { checks: map, failures: Object.keys(map).filter((k) => map[k] !== true) };
}
