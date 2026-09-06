import { CaseRegistry } from "../families/checker-required-memory-poisoning/cases.js";
import {
  invocationTrace,
  probeTrace,
  writeTrace,
} from "../families/checker-required-memory-poisoning/reference.js";
import type { Scenario } from "../families/checker-required-memory-poisoning/truth.js";
import type { CaseTrace, CheckerReport } from "../families/checker-required-memory-poisoning/types.js";
import type { MemoryWrite } from "../families/memory-poisoning/truth.js";
import type { ToolInvocation } from "../families/memory-poisoning/types.js";
import type { AuthorityContext, AuthorityResult, OperationAuthority } from "./operation-authority.js";

export function authorityTrace(result: AuthorityResult, caseId: string): CaseTrace {
  const report = result.report as Pick<CaseTrace, "decisions" | "audit">;
  const ledger = result.channels.ledger as ToolInvocation[];
  return {
    caseId,
    producer: "observed-subject",
    status: "completed",
    decisions: report.decisions,
    audit: report.audit,
    memoryWrites: writeTrace(result.channels.writes as MemoryWrite[]),
    toolInvocations: invocationTrace(ledger),
    receipts: ledger.map((t) => ({ actionId: t.actionId, source: "harness", ok: true })),
    finalState: { settled: true, cancelled: false },
  };
}

export function checkerAuthority(
  scenario: Scenario,
  context: AuthorityContext,
  memory: (scenario: Scenario["memoryScenario"]) => OperationAuthority,
): OperationAuthority {
  const subject = memory(scenario.memoryScenario);
  const required = { ...probeTrace(scenario), caseId: scenario.checkerCase.id, producer: "observed-subject" };
  const reports: CheckerReport[] = [];
  const observations: CaseTrace[][] = [[], []];
  let index = 0;
  let registry = new CaseRegistry(scenario);
  return {
    count: subject.count + 2,
    begin(i) {
      index = i;
      if (i < subject.count) return subject.begin(i);
      registry = new CaseRegistry(scenario);
      return {
        attemptId: `checker-${i - subject.count}`,
        method: "run",
        module: "checker",
        mergeView: true,
        view: { cases: [scenario.checkerCase] },
        facades: [{ name: "cases", methods: ["makeCase", "runCase"], properties: {} }],
      };
    },
    async invoke(method, args) {
      if (index < subject.count) return subject.invoke(method, args);
      if (!Array.isArray(args) || args.length !== 1) throw Error("invalid case operation arguments");
      if (method === "cases.makeCase") return registry.make(args[0]);
      if (method !== "cases.runCase" || typeof args[0] !== "string") throw Error("invalid case operation");
      const selected = registry.run(args[0]);
      let trace: CaseTrace;
      if (selected.checkerCase.id === scenario.checkerCase.id) trace = required;
      else {
        const result = await context.execute(memory(selected.memoryScenario));
        if (result.error !== null) throw Error(`generated case execution invalid: ${result.error}`);
        trace = authorityTrace(result, selected.checkerCase.id);
      }
      observations[index - subject.count]?.push(structuredClone(trace));
      return structuredClone(trace);
    },
    report(value) {
      if (index < subject.count) subject.report(value);
      else reports.push(structuredClone(value) as CheckerReport);
    },
    result() {
      return {
        channels: {},
        report: {
          subjectTrace: authorityTrace(subject.result(), scenario.memoryScenario.id),
          checkerRun: {
            report: reports[0],
            repeat: reports[1],
            invocations: observations.flat().length,
            trace: required,
            observations,
            error: null,
          },
        },
      };
    },
  };
}
