import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validationMetadataCurrent } from "../data/remaining-pass-grading-controls/cache-metadata.mjs";
interface Cell {
  observations: Array<{ method: string; request?: unknown; value?: unknown }>;
}
interface Control {
  id: string;
  fixture: string;
  expected: Array<{ name: string; token: string }>;
}
const read = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8"));
describe("304 metadata coverage on genuine retained traces", () => {
  const policy = read<{ controls: Control[] }>("data/remaining-pass-grading-controls/policy.json");
  const control = policy.controls.find((c) => c.id === "variant-cache-repair");
  if (!control) throw new Error("missing cache controls");
  const fixture = read<{ cases: Array<{ token: string; cells: Cell[] }> }>(control.fixture);
  const byName = (name: string): Cell => {
    const token = control.expected.find((e) => e.name === name)?.token;
    const cell = fixture.cases.find((x) => x.token === token)?.cells[0];
    if (!cell) throw new Error(`missing cache fixture: ${name}`);
    return cell;
  };
  it("catches unchanged stale metadata that the original service grader accepted", () => {
    expect(validationMetadataCurrent(byName("stale-304-metadata-control"))).toBe(false);
    expect(validationMetadataCurrent(byName("stale-304-metadata-baseline"))).toBe(true);
  });
  it("does not reject extra origin requests or legitimate copies and preserves evidence", () => {
    for (const name of ["copy-other-path-control", "fresh-plus-origin-control"]) {
      const cell = byName(name);
      const before = structuredClone(cell);
      expect(validationMetadataCurrent(cell)).toBe(true);
      expect(cell).toEqual(before);
    }
  });
  it("allows removal instead of retaining stale metadata", () => {
    const cell = structuredClone(byName("stale-304-metadata-control"));
    const last = cell.observations.map((o) => o.method).lastIndexOf("deliver");
    cell.observations.splice(
      last,
      0,
      ...["edge-a", "shield"].map((tier) => ({
        method: "write",
        request: { tier, entries: [] },
        value: { stored: true },
      })),
    );
    expect(validationMetadataCurrent(cell)).toBe(true);
  });
});
