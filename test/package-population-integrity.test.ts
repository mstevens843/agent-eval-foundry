import { beforeEach, describe, expect, it } from "vitest";
import {
  reference as access,
  resetCompletionRecords as resetAccess,
} from "../src/families/access-token-scope-expansion/reference.js";
import { runCell as runAccess } from "../src/families/access-token-scope-expansion/runner.js";
import * as accessScenarios from "../src/families/access-token-scope-expansion/scenarios.js";
import {
  resetCompletionRecords as resetWallet,
  reference as wallet,
} from "../src/families/delegated-wallet-scope-reconciliation/reference.js";
import { runCell as runWallet } from "../src/families/delegated-wallet-scope-reconciliation/runner.js";
import * as walletScenarios from "../src/families/delegated-wallet-scope-reconciliation/scenarios.js";
import {
  reference as alias,
  resetCompletionRecords as resetAlias,
} from "../src/families/deployment-model-alias-rollout-drift/reference.js";
import { runCell as runAlias } from "../src/families/deployment-model-alias-rollout-drift/runner.js";
import * as aliasScenarios from "../src/families/deployment-model-alias-rollout-drift/scenarios.js";

const accessCase = accessScenarios
  .generateScenarios(accessScenarios.selectMeasuredSet(accessScenarios.enumerateSpace()))
  .find((s) => s.expected.allowed);
const walletCase = walletScenarios
  .generateScenarios(walletScenarios.selectMeasuredSet(walletScenarios.enumerateSpace()))
  .find((s) => s.expected.allowed);
const aliasCase = aliasScenarios.generateScenarios(
  aliasScenarios.selectMeasuredSet(aliasScenarios.enumerateSpace()),
)[0];
if (!accessCase || !walletCase || !aliasCase) throw new Error("missing positive-control scenario");

beforeEach(() => {
  resetAccess();
  resetWallet();
  resetAlias();
});
describe("complete population, not only the requested action's filtered records", () => {
  it("preserves all three valid implementations", () => {
    expect(runAccess(accessCase, access).failures).toEqual([]);
    expect(runWallet(walletCase, wallet).failures).toEqual([]);
    expect(runAlias(aliasCase, alias).failures).toEqual([]);
  });
  it("rejects an extra token effect", () => {
    const cell = runAccess(accessCase, {
      ...access,
      run: (view, authority) =>
        access.run(view, {
          ...authority,
          issueToken(id, grant) {
            const result = authority.issueToken(id, grant);
            authority.issueToken("foreign", grant);
            return result;
          },
        }),
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("no_forbidden_effect");
  });
  it("rejects an extra wallet effect", () => {
    const cell = runWallet(walletCase, {
      ...wallet,
      run: (view, authority) =>
        wallet.run(view, {
          ...authority,
          executeSpend(id, spend) {
            const result = authority.executeSpend(id, spend);
            authority.executeSpend("foreign", { ...spend, idempotencyKey: "foreign" });
            return result;
          },
        }),
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("report_matches_ledger");
  });
  it("rejects an extra rollout effect", () => {
    const cell = runAlias(aliasCase, {
      ...alias,
      run: (view, deployment) =>
        alias.run(view, {
          ...deployment,
          applyRolloutDecision(id, decision) {
            const result = deployment.applyRolloutDecision(id, decision);
            deployment.applyRolloutDecision("foreign", decision);
            return result;
          },
        }),
    });
    expect(cell.crashed).toBeNull();
    expect(cell.failures.map((f) => f.check)).toContain("report_matches_ledger");
  });
  it("rejects duplicate token decisions", () => {
    const cell = runAccess(accessCase, {
      ...access,
      run(view, authority) {
        const report = access.run(view, authority);
        return { ...report, decisions: [...report.decisions, ...report.decisions] };
      },
    });
    expect(cell.failures.map((f) => f.check)).toContain("report_matches_ledger");
  });
  it("rejects duplicate wallet decisions", () => {
    const cell = runWallet(walletCase, {
      ...wallet,
      run(view, authority) {
        const report = wallet.run(view, authority);
        return { ...report, decisions: [...report.decisions, ...report.decisions] };
      },
    });
    expect(cell.failures.map((f) => f.check)).toContain("report_matches_ledger");
  });
  it("rejects duplicate rollout decisions", () => {
    const cell = runAlias(aliasCase, {
      ...alias,
      run(view, deployment) {
        const report = alias.run(view, deployment);
        return { ...report, decisions: [...report.decisions, ...report.decisions] };
      },
    });
    expect(cell.failures.map((f) => f.check)).toContain("deterministic_result");
  });
});
