import { subject } from "./subject.mjs";

function baseTrace(overrides = {}) {
  return {
    id: "edge-trace-1",
    steps: [
      {
        index: 0,
        kind: "submit",
        selector: { kind: "testid", value: "pay", qualifier: null },
        recordedNodeId: "pay",
        value: null,
        precondition: { nodeExists: true, attr: "data-state", attrValue: "enabled" },
        postcondition: { effect: "payment", attr: null, attrValue: null },
        irreversible: true,
        ...overrides,
      },
    ],
  };
}

// 1. Pending region -> halted
{
  const trace = baseTrace();
  const app = {
    query: () => ({ node: null, matches: 0, pending: true }),
    attr: () => null,
    click: () => {}, type: () => {}, submit: () => {},
    confirmationPresent: () => false,
    acceptConfirmation: () => { throw new Error("no confirm"); },
    askModel: () => { throw new Error("must not call"); },
  };
  const report = subject.replay(trace, app);
  console.log("1. pending region ->", report.outcome, report.steps[0].haltReason);
}

// 2. Precondition mismatch -> halted
{
  const trace = baseTrace();
  const node = { id: "pay", role: "button", attrs: { "data-testid": "pay", "data-state": "disabled" }, text: "", children: [] };
  const app = {
    query: () => ({ node, matches: 1, pending: false }),
    attr: (id, name) => node.attrs[name] ?? null,
    click: () => {}, type: () => {}, submit: () => {},
    confirmationPresent: () => false,
    acceptConfirmation: () => { throw new Error("no confirm"); },
    askModel: () => { throw new Error("must not call"); },
  };
  const report = subject.replay(trace, app);
  console.log("2. precondition mismatch ->", report.outcome, report.steps[0].haltReason, report.steps[0].preconditionObserved);
}

// 3. Confirmation required but suppressed -> halted, no double-fire
{
  const trace = baseTrace();
  const node = { id: "pay", role: "button", attrs: { "data-testid": "pay", "data-state": "enabled", "data-opens-confirmation": "true" }, text: "", children: [] };
  let acceptCalls = 0;
  const app = {
    query: () => ({ node, matches: 1, pending: false }),
    attr: (id, name) => node.attrs[name] ?? null,
    click: () => {}, type: () => {}, submit: () => {},
    confirmationPresent: () => false,
    acceptConfirmation: () => { acceptCalls++; },
    askModel: () => { throw new Error("must not call"); },
  };
  const report = subject.replay(trace, app);
  console.log("3. suppressed confirmation ->", report.outcome, report.steps[0].haltReason, "acceptCalls:", acceptCalls);
}

// 4. Ambiguous match -> unreplayable
{
  const trace = baseTrace();
  const node = { id: "pay-1", role: "button", attrs: { "data-testid": "pay", "data-state": "enabled" }, text: "", children: [] };
  const app = {
    query: () => ({ node, matches: 2, pending: false }),
    attr: (id, name) => node.attrs[name] ?? null,
    click: () => {}, type: () => {}, submit: () => {},
    confirmationPresent: () => false,
    acceptConfirmation: () => { throw new Error("no confirm"); },
    askModel: () => { throw new Error("must not call"); },
  };
  const report = subject.replay(trace, app);
  console.log("4. ambiguous ->", report.outcome, report.unreplayableReason);
}

// 5. Replay twice, node fully removed on second call after irreversible fired -> still completed, no throw
{
  const trace = baseTrace();
  let removed = false;
  const node = { id: "pay", role: "button", attrs: { "data-testid": "pay", "data-state": "enabled", "data-opens-confirmation": "true" }, text: "", children: [] };
  let submitCalls = 0, acceptCalls = 0;
  const app = {
    query: () => removed ? { node: null, matches: 0, pending: false } : { node, matches: 1, pending: false },
    attr: (id, name) => removed ? null : (node.attrs[name] ?? null),
    click: () => {}, type: () => {},
    submit: () => { submitCalls++; },
    confirmationPresent: () => true,
    acceptConfirmation: () => { acceptCalls++; },
    askModel: () => { throw new Error("must not call"); },
  };
  const report1 = subject.replay(trace, app);
  removed = true; // simulate button removed after payment
  const report2 = subject.replay(trace, app);
  console.log("5. two calls, removed on 2nd ->", report1.outcome, report2.outcome, "submitCalls:", submitCalls, "acceptCalls:", acceptCalls);
}
