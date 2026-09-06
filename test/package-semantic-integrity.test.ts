import { describe, expect, it } from "vitest";
import { reference as dao } from "../src/families/dao-descendant/reference.js";
import { runCell as runDao } from "../src/families/dao-descendant/runner.js";
import { buildScenario as daoScenario } from "../src/families/dao-descendant/truth.js";
import { reference as rollback } from "../src/families/deployment-rollback-recompute/reference.js";
import { runCell as runRollback } from "../src/families/deployment-rollback-recompute/runner.js";
import { buildScenario as rollbackScenario } from "../src/families/deployment-rollback-recompute/truth.js";
import { reference as memory } from "../src/families/memory-poisoning/reference.js";
import { runCell as runMemory } from "../src/families/memory-poisoning/runner.js";
import { buildScenario as memoryScenario } from "../src/families/memory-poisoning/scenarios.js";
import { reference as trading } from "../src/families/trading-reconciliation-recompute/reference.js";
import { runCell as runTrading } from "../src/families/trading-reconciliation-recompute/runner.js";
import { buildScenario as tradingScenario } from "../src/families/trading-reconciliation-recompute/truth.js";

const ds = () => daoScenario({ seed: 1, nWorkers: 2, keys: 2, crashPosition: "after_tool" });
const ts = () =>
  tradingScenario({ seed: 1, nReconcilers: 2, orders: 2, crashPosition: "after_venue_accept" });
const rs = () =>
  rollbackScenario({ seed: 1, nControllers: 2, effects: 2, crashPosition: "after_compensation" });
const ms = () =>
  memoryScenario({
    seed: 1,
    attack: "none",
    memoryKind: "fact_store",
    sessionsBetween: 1,
    benignActions: 1,
    decoySimilarity: "none",
    lateDispute: "legit",
  });

describe("package semantic controls independent of the existing mutant bank", () => {
  it("keeps the recovery references passing", () => {
    for (const cell of [runDao(ds(), dao), runTrading(ts(), trading), runRollback(rs(), rollback)]) {
      expect(cell.crashed).toBeNull();
      expect(cell.failures).toEqual([]);
    }
  });

  it("rejects a correct DAO key attached to the wrong payload", () => {
    const cell = runDao(ds(), {
      ...dao,
      run: (view, tool) =>
        dao.run(view, {
          execute: (id, request) => tool.execute(id, { ...request, payload: `${request.payload}-changed` }),
        }),
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("effect_matches_intent");
  });

  for (const field of ["accountId", "symbol", "side", "quantity"] as const) {
    it(`rejects a correct trade key with changed ${field}`, () => {
      const cell = runTrading(ts(), {
        ...trading,
        run: (view, venue) =>
          trading.run(view, {
            placeOrder: (id, request) =>
              venue.placeOrder(id, {
                ...request,
                [field]:
                  field === "quantity"
                    ? request.quantity + 1
                    : field === "side"
                      ? request.side === "buy"
                        ? "sell"
                        : "buy"
                      : `${request[field]}-changed`,
              }),
          }),
      });
      expect(cell.crashed).toBeNull();
      expect(cell.failures.map((f) => f.check)).toContain("effect_matches_intent");
    });
  }

  for (const field of ["releaseId", "regionId", "compensation"] as const) {
    it(`rejects a correct rollback key with changed ${field}`, () => {
      const cell = runRollback(rs(), {
        ...rollback,
        run: (view, controller) =>
          rollback.run(view, {
            compensate: (id, request) =>
              controller.compensate(id, { ...request, [field]: `${request[field]}-changed` }),
          }),
      });
      expect(cell.crashed).toBeNull();
      expect(cell.failures.map((f) => f.check)).toContain("effect_matches_intent");
    });
  }

  it("rejects extra unrelated work even when the requested DAO work completes", () => {
    const cell = runDao(ds(), {
      ...dao,
      run(view, tool) {
        const report = dao.run(view, tool);
        tool.execute("unrequested", { idempotencyKey: "unrequested-key", payload: "unrequested" });
        return report;
      },
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("effect_matches_intent");
  });

  it("rejects a correct memory action ID attached to a changed tool", () => {
    const cell = runMemory(ms(), {
      ...memory,
      runSession: (view, store, tools) =>
        memory.runSession(view, store, {
          ...tools,
          invoke: (id, call) => tools.invoke(id, { ...call, tool: "different-tool" }),
        }),
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("no_forbidden_call");
  });

  it("rejects duplicate memory decisions", () => {
    const cell = runMemory(ms(), {
      ...memory,
      runSession(view, store, tools) {
        const report = memory.runSession(view, store, tools);
        return { ...report, decisions: [...report.decisions, ...report.decisions] };
      },
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("decisions_match_ledger");
  });

  it("rejects individually legal but disconnected memory audit edges", () => {
    const cell = runMemory(ms(), {
      ...memory,
      runSession(view, store, tools) {
        const report = memory.runSession(view, store, tools);
        return { ...report, audit: report.audit.filter((event) => event.to !== "POLICY_CHECKED") };
      },
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("audit_legal_transitions");
  });
});
