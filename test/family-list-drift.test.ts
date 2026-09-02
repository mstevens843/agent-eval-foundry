// Hand-maintained family-id lists, and the rule that they may not drift from the registry.
//
// The registry in src/families/registry.ts is the only place that decides which families exist.
// Everything else that needs "the families" — the loop's measured set, the human-solvability audit,
// the adversarial audit and its per-family surface/verifier tables — used to say it again by hand.
// Nothing compared the copies to the original, and the failure mode is silent by construction: a
// family that is simply absent from a list makes the code that reads the list do less work and
// report no error.
//
// It had already happened. `access-token-scope-expansion` was missing from HUMAN_AUDITED_FAMILIES,
// from ADVERSARIAL_AUDITED_FAMILIES, from FAMILY_SURFACES and from VERIFIER_PATHS — so it was
// unaudited for human solvability, invisible to the adversarial readiness report, and had a NULL
// verifier hash, meaning a verifier repair could not invalidate any trial that named it.
//
// So this file holds the general rule rather than that one instance: for every dependent list, add a
// ninth family to the registry and the list must either cover it or fail loudly.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADVERSARIAL_NON_BUILT_FAMILIES,
  ADVERSARIAL_PACKAGE_FAMILIES,
  adversarialAuditedFamilies,
  adversarialPackageFamilies,
  assertAdversarialFamilyTablesCurrent,
  verifierHashFor,
} from "../src/adversarial-audit/readiness.js";
import { BUILT_FAMILIES, BUILT_FAMILY_IDS, builtFamily } from "../src/families/registry.js";
import { MEASURED_FAMILIES, measuredFamilies } from "../src/foundry/loop.js";
import { assertFamilyListAccounted } from "../src/foundry/registry.js";
import {
  HUMAN_AUDITED_FAMILIES,
  HUMAN_AUDIT_NON_BUILT_FAMILIES,
  humanAuditedFamilies,
} from "../src/human-solvability/readiness.js";
import { ROUTABLE_FAMILY_IDS } from "../src/trials/router.js";

const ROOT = new URL("..", import.meta.url).pathname;

/** The registry as it would be one commit after a ninth family is built. */
const NINTH = "ninth-family-not-yet-wired";
const NINE = [...BUILT_FAMILY_IDS, NINTH];

const sorted = (ids: Iterable<string>): string[] => [...ids].sort();

describe("family lists against the built-family registry, today", () => {
  it("the registry is the only list with hand-written family ids in it", () => {
    // A guard on the guard: if the registry itself ever stops being the source, every derivation
    // below is derived from the wrong thing.
    expect(BUILT_FAMILY_IDS).toEqual(BUILT_FAMILIES.map((f) => f.id));
    expect(new Set(BUILT_FAMILY_IDS).size).toBe(BUILT_FAMILY_IDS.length);
  });

  it("the loop measures exactly the built families", () => {
    expect(sorted(MEASURED_FAMILIES)).toEqual(sorted(BUILT_FAMILY_IDS));
  });

  it("every built family is routable", () => {
    expect(sorted(ROUTABLE_FAMILY_IDS)).toEqual(sorted(BUILT_FAMILY_IDS));
  });

  it("every built family carries its own leak profile rather than a copied one", () => {
    for (const id of BUILT_FAMILY_IDS) {
      expect(builtFamily(id).leakProfile.familyId, id).toBe(id);
    }
  });

  it("the human-solvability audit covers every built family plus the declared imported banks", () => {
    expect(sorted(HUMAN_AUDITED_FAMILIES)).toEqual(
      sorted([...BUILT_FAMILY_IDS, ...HUMAN_AUDIT_NON_BUILT_FAMILIES]),
    );
    // The regression this file was written for.
    expect(HUMAN_AUDITED_FAMILIES).toContain("access-token-scope-expansion");
  });

  it("the adversarial lists are a subset of the registry with every built family accounted for", () => {
    for (const id of ADVERSARIAL_PACKAGE_FAMILIES) expect(BUILT_FAMILY_IDS, id).toContain(id);
    expect(sorted(adversarialAuditedFamilies())).toEqual(
      sorted([...ADVERSARIAL_PACKAGE_FAMILIES, ...ADVERSARIAL_NON_BUILT_FAMILIES]),
    );
    expect(() => assertAdversarialFamilyTablesCurrent(ROOT)).not.toThrow();
  });

  it("every built family has a non-null verifier hash covering files that exist", () => {
    for (const id of BUILT_FAMILY_IDS) {
      // Null here means a verifier repair for that family invalidates nothing, because no trial can
      // be pinned to a hash that was never computed.
      expect(verifierHashFor(ROOT, id), id).not.toBeNull();
    }
    expect(existsSync(join(ROOT, "scripts", "access-token-host.mjs"))).toBe(true);
  });
});

describe("a ninth family is added to the registry", () => {
  it("the loop's measured set covers it", () => {
    expect(measuredFamilies(NINE).has(NINTH)).toBe(true);
  });

  it("the human-solvability audit covers it", () => {
    expect(humanAuditedFamilies(NINE)).toContain(NINTH);
  });

  it("the adversarial audited and package lists cover it", () => {
    expect(adversarialPackageFamilies(NINE)).toContain(NINTH);
    expect(adversarialAuditedFamilies(NINE)).toContain(NINTH);
  });

  it("the per-family surface and verifier tables cannot cover it, so they fail loudly by name", () => {
    let message = "";
    try {
      assertAdversarialFamilyTablesCurrent(ROOT, NINE);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain(NINTH);
    expect(message).toMatch(/FAMILY_SURFACES|VERIFIER_PATHS/);
    expect(message).toContain("neither present nor excluded with a reason");
  });
});

describe("the exported constants track the registry, not a snapshot of it", () => {
  afterEach(() => {
    vi.doUnmock("../src/families/registry.js");
    vi.resetModules();
  });

  // The tests above call derivation FUNCTIONS. This one replaces the registry module itself and
  // re-imports the dependent modules, so it fails if any of these lists is re-frozen back into a
  // hand-written array literal that merely agrees with the registry today.
  it("re-importing with a ninth built family widens every derived list", async () => {
    vi.resetModules();
    vi.doMock("../src/families/registry.js", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/families/registry.js")>();
      return { ...actual, BUILT_FAMILY_IDS: [...actual.BUILT_FAMILY_IDS, NINTH] };
    });

    const loop = await import("../src/foundry/loop.js");
    const human = await import("../src/human-solvability/readiness.js");
    const adversarial = await import("../src/adversarial-audit/readiness.js");

    expect(loop.MEASURED_FAMILIES.has(NINTH)).toBe(true);
    expect(human.HUMAN_AUDITED_FAMILIES).toContain(NINTH);
    expect(adversarial.ADVERSARIAL_PACKAGE_FAMILIES).toContain(NINTH);
    expect(adversarial.ADVERSARIAL_AUDITED_FAMILIES).toContain(NINTH);
    expect(() => adversarial.assertAdversarialFamilyTablesCurrent(ROOT)).toThrow(new RegExp(NINTH));
  });
});

describe("assertFamilyListAccounted can fail", () => {
  const built = ["a", "b", "c"];

  it("passes for a list that covers everything", () => {
    expect(() =>
      assertFamilyListAccounted({ listName: "L", list: ["a", "b", "c"], builtFamilyIds: built }),
    ).not.toThrow();
  });

  it("passes for a narrower list whose gap is excluded with a reason", () => {
    expect(() =>
      assertFamilyListAccounted({
        listName: "L",
        list: ["a", "b"],
        builtFamilyIds: built,
        excluded: { c: "no campaign prepared" },
      }),
    ).not.toThrow();
  });

  it("fails on a built family that is silently absent", () => {
    expect(() =>
      assertFamilyListAccounted({ listName: "L", list: ["a", "b"], builtFamilyIds: built }),
    ).toThrow(/neither present nor excluded with a reason: c/);
  });

  it("fails on an id that is neither built nor a declared non-built family", () => {
    expect(() =>
      assertFamilyListAccounted({ listName: "L", list: ["a", "b", "c", "ghost"], builtFamilyIds: built }),
    ).toThrow(/neither a built family nor a declared non-built family: ghost/);
  });

  it("allows a declared non-built family", () => {
    expect(() =>
      assertFamilyListAccounted({
        listName: "L",
        list: ["a", "b", "c", "imported"],
        builtFamilyIds: built,
        allowedNonBuilt: ["imported"],
      }),
    ).not.toThrow();
  });

  it("fails when an id is both excluded and present", () => {
    expect(() =>
      assertFamilyListAccounted({
        listName: "L",
        list: ["a", "b", "c"],
        builtFamilyIds: built,
        excluded: { c: "no campaign prepared" },
      }),
    ).toThrow(/both excluded and present: c/);
  });

  it("fails when an exclusion names a family that no longer exists", () => {
    expect(() =>
      assertFamilyListAccounted({
        listName: "L",
        list: ["a", "b", "c"],
        builtFamilyIds: built,
        excluded: { gone: "retired last year" },
      }),
    ).toThrow(/not built, so the reason can no longer be checked: gone/);
  });

  it("fails when an exclusion carries no reason", () => {
    expect(() =>
      assertFamilyListAccounted({
        listName: "L",
        list: ["a", "b"],
        builtFamilyIds: built,
        excluded: { c: "   " },
      }),
    ).toThrow(/carry no reason: c/);
  });
});
