/** Trusted adapter bundle. Delivered on authority stdin, NEVER in the submission mount.
 * Uses the same domain simulators as local sweeps. Only explicit views and allowlisted operations
 * cross the process boundary; these objects and their observation arrays never enter the cell.
 */
import { AuthorityHarness } from "../families/access-token-scope-expansion/runner.js";
import type { Scenario as ScenarioType6 } from "../families/access-token-scope-expansion/truth.js";
import type { Scenario as ScenarioType3 } from "../families/caa-revalidation/truth.js";
import type { Scenario as ScenarioType0 } from "../families/checker-required-memory-poisoning/truth.js";
import { ExternalLedgerHarness } from "../families/dao-descendant/runner.js";
import type { Scenario as ScenarioType9 } from "../families/dao-descendant/truth.js";
import { WalletAuthorityHarness } from "../families/delegated-wallet-scope-reconciliation/runner.js";
import type { Scenario as ScenarioType7 } from "../families/delegated-wallet-scope-reconciliation/truth.js";
import { DeploymentHarness } from "../families/deployment-model-alias-rollout-drift/runner.js";
import type { Scenario as ScenarioType8 } from "../families/deployment-model-alias-rollout-drift/truth.js";
import { ControllerLedgerHarness } from "../families/deployment-rollback-recompute/runner.js";
import type { Scenario as ScenarioType11 } from "../families/deployment-rollback-recompute/truth.js";
import { Harness } from "../families/memory-poisoning/runner.js";
import type { Scenario as ScenarioType2 } from "../families/memory-poisoning/truth.js";
import { ToolHarness } from "../families/prompt-injection-containment/runner.js";
import type { Scenario as ScenarioType1 } from "../families/prompt-injection-containment/types.js";
import { VenueLedgerHarness } from "../families/trading-reconciliation-recompute/runner.js";
import type { Scenario as ScenarioType10 } from "../families/trading-reconciliation-recompute/truth.js";
import { App as ReplayApp } from "../families/ui-action-record-replay/app.js";
import type { Scenario as ScenarioType4 } from "../families/ui-action-record-replay/truth.js";
import { App as LiveApp } from "../families/ui-replay-live-dom/app.js";
import type { Scenario as ScenarioType5 } from "../families/ui-replay-live-dom/truth.js";
import { checkerAuthority } from "./checker-authority.js";

declare const __FOUNDRY_AUTHORITY_SOURCE_DIGEST__: string;
export const AUTHORITY_SOURCE_DIGEST =
  typeof __FOUNDRY_AUTHORITY_SOURCE_DIGEST__ === "undefined"
    ? "unbuilt"
    : __FOUNDRY_AUTHORITY_SOURCE_DIGEST__;

export interface PublicFacade {
  readonly name: string;
  readonly methods: readonly string[];
  readonly properties: Readonly<Record<string, unknown>>;
}
export interface AttemptFrame {
  readonly attemptId: string;
  readonly method: string;
  readonly view: unknown;
  readonly facades: readonly PublicFacade[];
  readonly module?: "subject" | "checker";
  readonly mergeView?: boolean;
}
export interface AuthorityResult {
  readonly channels: Readonly<Record<string, readonly unknown[]>>;
  readonly report: unknown;
}
export interface OperationAuthority {
  readonly count: number;
  begin(index: number): AttemptFrame;
  invoke(method: string, args: unknown): unknown | Promise<unknown>;
  report(value: unknown): void;
  result(): AuthorityResult;
}
export interface AuthorityContext {
  execute(authority: OperationAuthority): Promise<AuthorityResult & { error: string | null }>;
}

type Shape = "string" | "object" | "number" | "number?";
type Schemas = Readonly<Record<string, readonly Shape[]>>;
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const clone = <T>(v: T): T => structuredClone(v);

/** Captured own methods only: no prototype/property traversal, no arbitrary callback execution. */
export function bindOperations(name: string, facade: object, schemas: Schemas) {
  const methods = new Map<string, { fn: (...args: unknown[]) => unknown; shape: readonly Shape[] }>(
    Object.entries(schemas).map(([method, shape]) => {
      const fn = (facade as Record<string, unknown>)[method];
      if (!Object.hasOwn(facade, method) || typeof fn !== "function")
        throw Error(`missing facade ${name}.${method}`);
      return [`${name}.${method}`, { fn: fn.bind(facade), shape }] as const;
    }),
  );
  return {
    description: {
      name,
      methods: Object.keys(schemas),
      properties: Object.fromEntries(Object.entries(facade).filter(([, v]) => typeof v !== "function")),
    },
    invoke(method: string, args: unknown): unknown {
      const entry = methods.get(method);
      if (
        !entry ||
        !Array.isArray(args) ||
        args.length > entry.shape.length ||
        args.length < entry.shape.filter((s) => !s.endsWith("?")).length ||
        args.some((v, i) =>
          entry.shape[i] === "object"
            ? !object(v)
            : entry.shape[i] === "number?"
              ? v != null && (typeof v !== "number" || !Number.isFinite(v))
              : entry.shape[i] === "string"
                ? typeof v !== "string"
                : typeof v !== "number" || !Number.isFinite(v),
        )
      ) {
        throw Error(`invalid operation or arguments: ${method}`);
      }
      return entry.fn(
        ...clone(args).map((v, i) => (entry.shape[i] === "number?" && v === null ? undefined : v)),
      );
    },
  };
}

export function createAuthority(
  payload: { familyId: string; scenario: unknown },
  context?: AuthorityContext,
): OperationAuthority {
  const { familyId } = payload;
  // Scenario bytes are trusted host input, not a child RPC argument. Domain constructors and
  // manifests validate those bytes; narrowing here never grants the child access to the scenario.
  if (!object(payload.scenario) || typeof payload.scenario.id !== "string")
    throw Error("invalid authority scenario");
  let count = 1;
  let begin: (index: number) => unknown;
  let method = "run";
  let observe: () => AuthorityResult["channels"];
  let operations: ReturnType<typeof bindOperations>[];
  const reports: Record<string, unknown>[] = [];
  let aggregate = false;

  switch (familyId) {
    case "checker-required-memory-poisoning": {
      if (!context) throw Error("checker requires a protected nested execution context");
      return checkerAuthority(payload.scenario as unknown as ScenarioType0, context, (scenario) =>
        createAuthority({ familyId: "prompt-injection-memory-poisoning", scenario }),
      );
    }
    case "prompt-injection-containment": {
      const s = payload.scenario as unknown as ScenarioType1;
      const harness = new ToolHarness(s as never);
      operations = [bindOperations("tools", harness.facade(), { invoke: ["string", "object"] })];
      // origin, params and hidden scenario identity are not public subject inputs.
      begin = () => ({
        segments: s.segments,
        grants: s.grants,
        tools: s.tools,
        actions: s.actions.map(({ origin: _origin, ...action }) => action),
      });
      observe = () => ({ ledger: harness.sealed() });
      break;
    }
    case "prompt-injection-memory-poisoning": {
      const s = payload.scenario as unknown as ScenarioType2;
      const harness = new Harness(s as never);
      method = "runSession";
      count = s.sessions.length;
      aggregate = true;
      operations = [
        bindOperations("memory", harness.memory(), { write: ["object"], recall: ["string"], keys: [] }),
        bindOperations("tools", harness.toolFacade(), { invoke: ["string", "object"] }),
      ];
      begin = (i) => {
        const session = s.sessions[i];
        if (!session) throw Error("missing session");
        harness.memory(session.index);
        return {
          index: session.index,
          segments: session.segments,
          actions: session.actions,
          grants: s.grants,
          tools: s.tools,
        };
      };
      observe = () => ({ writes: harness.sealedWrites(), ledger: harness.sealedTools() });
      break;
    }
    case "caa-revalidation": {
      const s = payload.scenario as unknown as ScenarioType3;
      const queries: { seq: number; fqdn: string }[] = [];
      operations = [
        bindOperations(
          "caa",
          {
            current(fqdn: string) {
              queries.push({ seq: queries.length + 1, fqdn });
              return s.current[fqdn] === "ALLOW" ? "ALLOW" : "DENY";
            },
          },
          { current: ["string"] },
        ),
      ];
      begin = () => s.view;
      observe = () => ({ queries });
      break;
    }
    case "ui-action-record-replay": {
      const s = payload.scenario as unknown as ScenarioType4;
      const app = new ReplayApp(s.liveTree, s.params.confirmation, s.params.asyncSettled);
      operations = [
        bindOperations("app", app.facade(), {
          query: ["object"],
          attr: ["string", "string"],
          click: ["string"],
          type: ["string", "string"],
          submit: ["string"],
          confirmationPresent: [],
          acceptConfirmation: [],
          askModel: ["string"],
        }),
      ];
      method = "replay";
      count = s.params.replayCount;
      begin = (i) => {
        app.beginReplay(i);
        return s.trace;
      };
      observe = () => ({ calls: app.sealedCalls(), effects: app.sealedEffects() });
      break;
    }
    case "ui-replay-live-dom": {
      const s = payload.scenario as unknown as ScenarioType5;
      const app = new LiveApp(s.params, s.trace);
      operations = [
        bindOperations("app", app.facade(), {
          query: ["object"],
          queryAnchor: ["object"],
          attr: ["string", "string"],
          regionState: ["string"],
          settle: [],
          click: ["string", "number?"],
          type: ["string", "string", "number?"],
          submit: ["string", "number?"],
          acceptConfirmation: ["string", "number?"],
          askModel: ["string"],
        }),
      ];
      method = "replay";
      count = s.params.replayCount;
      begin = (i) => {
        app.beginReplay(i);
        return s.trace;
      };
      observe = () => ({
        calls: app.sealedCalls(),
        effects: app.sealedEffects(),
        legitimate: [...app.sealedLegitimate()].map(([step, ids]) => [step, [...ids]]),
      });
      break;
    }
    case "access-token-scope-expansion": {
      const s = payload.scenario as unknown as ScenarioType6;
      const h = new AuthorityHarness(s as never);
      operations = [
        bindOperations("authority", h.facade(), {
          currentApproval: ["string"],
          currentToken: ["string"],
          issueToken: ["string", "object"],
        }),
      ];
      count = s.params.repeatCount;
      begin = (i) => {
        h.beginAttempt(i);
        return { ...s.view, attempt: i };
      };
      observe = () => ({ calls: h.sealedCalls(), effects: h.sealedEffects() });
      break;
    }
    case "delegated-wallet-scope-reconciliation": {
      const s = payload.scenario as unknown as ScenarioType7;
      const h = new WalletAuthorityHarness(s as never);
      operations = [
        bindOperations("authority", h.facade(), {
          currentPolicy: ["string"],
          currentDelegation: ["string"],
          currentToken: ["string"],
          remainingBudget: ["string", "string"],
          executeSpend: ["string", "object"],
        }),
      ];
      count = s.params.repeatCount;
      begin = (i) => {
        h.beginAttempt(i);
        return { ...s.view, attempt: i };
      };
      observe = () => ({ calls: h.sealedCalls(), effects: h.sealedEffects() });
      break;
    }
    case "deployment-model-alias-rollout-drift": {
      const s = payload.scenario as unknown as ScenarioType8;
      const h = new DeploymentHarness(s as never);
      operations = [
        bindOperations("deployment", h.facade(), {
          currentAlias: ["string"],
          rolloutLedger: ["string"],
          evalStream: ["string"],
          baseline: ["string"],
          applyRolloutDecision: ["string", "object"],
        }),
      ];
      count = s.params.repeatCount;
      begin = (i) => {
        h.beginAttempt(i);
        return { ...s.view, attempt: i };
      };
      observe = () => ({ calls: h.sealedCalls(), effects: h.sealedEffects() });
      break;
    }
    case "dao-descendant": {
      const s = payload.scenario as unknown as ScenarioType9;
      const h = new ExternalLedgerHarness();
      operations = [bindOperations("tool", h.facade(), { execute: ["string", "object"] })];
      count = s.views.length;
      begin = (i) => {
        const v = s.views[i];
        if (!v) throw Error("missing attempt");
        h.beginAttempt(v.attempt, v.workerId, v.leaseEpoch);
        return v;
      };
      observe = () => ({ calls: h.sealedCalls(), effects: h.sealedEffects() });
      break;
    }
    case "trading-reconciliation-recompute": {
      const s = payload.scenario as unknown as ScenarioType10;
      const h = new VenueLedgerHarness();
      operations = [bindOperations("venue", h.facade(), { placeOrder: ["string", "object"] })];
      count = s.views.length;
      begin = (i) => {
        const v = s.views[i];
        if (!v) throw Error("missing attempt");
        h.beginAttempt(v.attempt, v.reconcilerId, v.authorityEpoch);
        return v;
      };
      observe = () => ({ calls: h.sealedCalls(), effects: h.sealedEffects() });
      break;
    }
    case "deployment-rollback-recompute": {
      const s = payload.scenario as unknown as ScenarioType11;
      const h = new ControllerLedgerHarness();
      operations = [bindOperations("controller", h.facade(), { compensate: ["string", "object"] })];
      count = s.views.length;
      begin = (i) => {
        const v = s.views[i];
        if (!v) throw Error("missing attempt");
        h.beginAttempt(v.attempt, v.controllerId, v.authorityEpoch);
        return v;
      };
      observe = () => ({ calls: h.sealedCalls(), effects: h.sealedEffects() });
      break;
    }
    default:
      throw Error(`no operation authority for ${familyId}`);
  }
  if (!Number.isSafeInteger(count) || count < 1 || count > 64) throw Error("invalid attempt population");
  return {
    count,
    begin: (i) => ({
      attemptId: `attempt-${i}`,
      method,
      view: clone(begin(i)),
      facades: clone(operations.map((o) => o.description)),
    }),
    invoke(name, args) {
      const op = operations.find((o) => name.startsWith(`${o.description.name}.`));
      if (!op) throw Error("unknown facade");
      return clone(op.invoke(name, args));
    },
    report(value) {
      if (!object(value)) throw Error("report must be an object");
      if (aggregate && (!Array.isArray(value.decisions) || !Array.isArray(value.audit)))
        throw Error("invalid session report");
      reports.push(clone(value));
    },
    result() {
      const report = aggregate
        ? { decisions: reports.flatMap((r) => r.decisions), audit: reports.flatMap((r) => r.audit) }
        : ["caa-revalidation", "prompt-injection-containment"].includes(familyId)
          ? reports[0]
          : reports;
      return { channels: clone(observe()), report };
    },
  };
}
