// The memory facade's IDENTITY is part of the published contract, and this file is the probe that
// keeps it that way.
//
// The package README and `types.ts` both say `runSession` is called "once per session, in order,
// with the SAME memory facade throughout". Both graders — the in-process `Harness` and the
// subprocess `scripts/memory-host.mjs` — used to build a NEW frozen facade object per session over
// the same backing store. Only object identity was wrong, and object identity was precisely what the
// contract told submissions they could rely on: two real trials keyed per-scenario state off it
// (`memory !== previousMemory` means a new scenario) and therefore reset that state at every session
// boundary, failing every attack scenario for a reason that had nothing to do with the task.
//
// So the assertions here are deliberately about identity rather than about behaviour: a probe that
// only checked "the store is shared" passed the whole time the family was broken.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Harness } from "../src/families/memory-poisoning/runner.js";
import { buildScenario } from "../src/families/memory-poisoning/scenarios.js";
import type { MemoryFacade, Subject } from "../src/families/memory-poisoning/types.js";

const SCENARIO = buildScenario({
  seed: 11,
  attack: "secret_recall",
  sessionsBetween: 3,
  memoryKind: "fact_store",
  benignActions: 1,
  decoySimilarity: "none",
});

describe("the memory facade is one object per scenario", () => {
  it("hands the in-process harness's every session the same facade object", () => {
    const seen: MemoryFacade[] = [];
    const probe: Subject = {
      id: "identity-probe",
      label: "records the facade object it was handed",
      runSession: (_view, memory) => {
        seen.push(memory);
        return { decisions: [], audit: [] };
      },
    };

    const harness = new Harness(SCENARIO);
    for (const session of SCENARIO.sessions) {
      harness.enterSession(session.index);
      probe.runSession(
        {
          index: session.index,
          segments: session.segments,
          actions: session.actions,
          grants: SCENARIO.grants,
          tools: SCENARIO.tools,
        },
        harness.memory(),
        harness.toolFacade(),
      );
    }

    expect(seen.length).toBe(SCENARIO.sessions.length);
    expect(seen.length).toBeGreaterThan(1);
    // Identity, not equality: a per-session facade over a shared store passes every structural
    // comparison and fails this one.
    expect(new Set(seen).size).toBe(1);
  });

  it("gives a different facade to a different scenario, so identity still marks a boundary", () => {
    const a = new Harness(SCENARIO).memory();
    const b = new Harness(SCENARIO).memory();
    expect(a).not.toBe(b);
  });

  it("stamps the writing session on the record even though the facade is shared", () => {
    const harness = new Harness(SCENARIO);
    const memory = harness.memory();
    harness.enterSession(0);
    memory.write({ key: "k0", value: "v0", provenance: [], originTrust: "user" });
    harness.enterSession(2);
    memory.write({ key: "k2", value: "v2", provenance: [], originTrust: "user" });
    const written = harness.sealedWrites().map((w) => w.record.writtenInSession);
    expect(written).toEqual([0, 2]);
  });

  it("hands the subprocess host's every session the same facade object", () => {
    // The host is a separate implementation of the same facade semantics, so it needs its own probe:
    // fixing one and not the other is exactly the drift the host script warns about.
    const dir = mkdtempSync(join(tmpdir(), "memory-facade-contract-"));
    const subjectPath = join(dir, "subject.mjs");
    writeFileSync(
      subjectPath,
      [
        "// Keys per-scenario state off the facade OBJECT, which the README says is legal.",
        "const seen = new WeakMap();",
        "export const subject = {",
        '  id: "identity-probe",',
        '  label: "reports how many sessions have shared this facade object",',
        "  runSession(view, memory) {",
        "    const count = (seen.get(memory) ?? 0) + 1;",
        "    seen.set(memory, count);",
        "    memory.write({",
        "      key: `probe.session.${view.index}`,",
        "      value: `sessions-sharing-this-facade:${count}`,",
        "      provenance: [],",
        '      originTrust: "user",',
        "    });",
        "    return { decisions: [], audit: [] };",
        "  },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const stdout = execFileSync("node", [join("scripts", "memory-host.mjs"), subjectPath], {
      input: JSON.stringify({ scenario: SCENARIO }),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const out = JSON.parse(stdout) as {
      error: string | null;
      writes: readonly { readonly record: { readonly value: string; readonly writtenInSession: number } }[];
    };

    expect(out.error).toBeNull();
    expect(out.writes.length).toBe(SCENARIO.sessions.length);
    // 1, 2, 3, ... — one facade seen once more per session. A per-session facade gives 1, 1, 1, ...
    expect(out.writes.map((w) => w.record.value)).toEqual(
      SCENARIO.sessions.map((_s, i) => `sessions-sharing-this-facade:${i + 1}`),
    );
    // And the session stamp still moves, which is what the shared facade could plausibly have broken.
    expect(out.writes.map((w) => w.record.writtenInSession)).toEqual(SCENARIO.sessions.map((s) => s.index));
  });
});
