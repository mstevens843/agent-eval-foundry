import assert from "node:assert/strict";

// The execution and learning probes take native and browser exports first.
// Registry insertion order is unrelated to those positional CLI arguments.
export function integrationExports(packages) {
  const byId = new Map(packages.map((pkg) => [pkg.id, pkg]));
  assert.equal(byId.size, packages.length, "duplicate integration package ID");
  const required = ["caa-revalidation-repair", "browser-replay-repair"];
  const first = required.map((id) => {
    const pkg = byId.get(id);
    assert(pkg, `missing integration package: ${id}`);
    return pkg.export;
  });
  return [...first, ...packages.filter((pkg) => !required.includes(pkg.id)).map((pkg) => pkg.export)];
}
