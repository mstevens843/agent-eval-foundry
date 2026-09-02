// Disk loading. The only file in the foundry layer that touches the filesystem.
//
// Everything else takes parsed values, which is what makes the validators testable against in-memory
// fixtures without a temp directory. This file is the thin edge that reads JSON, hands it to the
// validators, and lets their errors propagate unchanged — no wrapping, because a `SchemaError`
// carrying a rule code is more useful to a caller than a generic "failed to load registry".
//
// The candidate ledger is split across several files on purpose. The measured Klavis screening record
// and forward-looking ideas have different review cadences and very different epistemic status, and
// keeping them in one file invites editing the measured record while adding a speculative row.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  type AdaptiveFunnel,
  assertAdaptiveFunnelValid,
  parseMechanismProbes,
  parseTransferTests,
} from "./adaptive-funnel.js";
import {
  type DiscoveryWorkbench,
  assertDiscoveryWorkbenchValid,
  parseDiscoveryCandidates,
} from "./discovery-workbench.js";
import { type FamilyLineage, assertLineagesValid, parseFamilyLineages } from "./lineage.js";
import {
  EXECUTABLE_PROBES,
  type ProbeDefinition,
  type ProbeRunSummary,
  assertProbeDefinitionsValid,
  runMechanismProbes,
} from "./probe-runner.js";
import { type ProbeToFamilyPromotion, assertPromotionsValid, parsePromotions } from "./promotion.js";
import { type Registry, buildRegistry } from "./registry.js";
import type { Candidate, Mechanism, Mutant, TaskShape } from "./schema.js";
import { parseCandidates, parseMechanisms, parseMutants, parseTaskShape } from "./validate.js";

export const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`cannot read ${path}: ${(err as Error).message}`);
  }
};

export const loadMechanisms = (path: string): readonly Mechanism[] => parseMechanisms(readJson(path), path);

export const loadMutants = (path: string): readonly Mutant[] => parseMutants(readJson(path), path);

export function loadShapes(dir: string): readonly TaskShape[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const shapes = files.map((f) => parseTaskShape(readJson(join(dir, f)), `${dir}/${f}`));
  const seen = new Set<string>();
  for (const s of shapes) {
    if (seen.has(s.familyId)) throw new Error(`${dir}: duplicate familyId "${s.familyId}"`);
    seen.add(s.familyId);
  }
  return shapes;
}

/** Load and concatenate every `candidates*.json` in `dir`, validating ids are unique across all. */
export function loadCandidates(dir: string): readonly Candidate[] {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("candidates") && f.endsWith(".json"))
    .sort();
  const all = files.flatMap((f) => parseCandidates(readJson(join(dir, f)), `${dir}/${f}`));
  const seen = new Set<string>();
  for (const c of all) {
    if (seen.has(c.id)) throw new Error(`${dir}: duplicate candidate id "${c.id}" across ledger files`);
    seen.add(c.id);
  }
  return all;
}

export interface LoadOptions {
  readonly dataDir?: string;
  readonly shapesDir?: string;
}

/** Load the whole registry and check referential integrity. Throws on the first problem. */
export function loadRegistry(root: string, options: LoadOptions = {}): Registry {
  const dataDir = options.dataDir ?? join(root, "data");
  const shapesDir = options.shapesDir ?? join(root, "examples", "shapes");
  return buildRegistry(
    loadMechanisms(join(dataDir, "mechanisms.json")),
    loadMutants(join(dataDir, "mutants.json")),
    loadShapes(shapesDir),
    loadCandidates(dataDir),
  );
}

export function loadAdaptiveFunnel(root: string, registry = loadRegistry(root)): AdaptiveFunnel {
  const funnel = {
    probes: parseMechanismProbes(
      readJson(join(root, "data", "mechanism-probes.json")),
      "data/mechanism-probes.json",
    ),
    transfers: parseTransferTests(
      readJson(join(root, "data", "transfer-tests.json")),
      "data/transfer-tests.json",
    ),
  };
  assertAdaptiveFunnelValid(funnel, registry);
  return funnel;
}

export function loadDiscoveryWorkbench(
  root: string,
  registry = loadRegistry(root),
  funnel = loadAdaptiveFunnel(root, registry),
): DiscoveryWorkbench {
  const workbench = {
    candidates: parseDiscoveryCandidates(
      readJson(join(root, "data", "candidate-pool.json")),
      "data/candidate-pool.json",
    ),
  };
  assertDiscoveryWorkbenchValid(workbench, registry, funnel);
  return workbench;
}

export function loadProbeDefinitions(
  root: string,
  registry = loadRegistry(root),
  workbench = loadDiscoveryWorkbench(root, registry),
): readonly ProbeDefinition[] {
  void root;
  assertProbeDefinitionsValid(EXECUTABLE_PROBES, registry, workbench);
  return EXECUTABLE_PROBES;
}

export function loadProbeRunSummary(
  root: string,
  registry = loadRegistry(root),
  workbench = loadDiscoveryWorkbench(root, registry),
): ProbeRunSummary {
  const definitions = loadProbeDefinitions(root, registry, workbench);
  return runMechanismProbes(definitions);
}

export function loadPromotions(
  root: string,
  registry = loadRegistry(root),
  workbench = loadDiscoveryWorkbench(root, registry),
): readonly ProbeToFamilyPromotion[] {
  const promotions = parsePromotions(readJson(join(root, "data", "promotions.json")), "data/promotions.json");
  assertPromotionsValid(promotions, loadProbeRunSummary(root, registry, workbench), workbench);
  return promotions;
}

export function loadLineages(
  root: string,
  registry = loadRegistry(root),
  workbench = loadDiscoveryWorkbench(root, registry),
  promotions = loadPromotions(root, registry, workbench),
): readonly FamilyLineage[] {
  const lineages = parseFamilyLineages(readJson(join(root, "data", "lineages.json")), "data/lineages.json");
  assertLineagesValid(lineages, registry, workbench, promotions);
  return lineages;
}
