#!/usr/bin/env node

const [modulePath] = process.argv.slice(2);
const input = await new Promise((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    data += chunk;
  });
  process.stdin.on("end", () => resolve(JSON.parse(data)));
  process.stdin.on("error", reject);
});

const scenario = input.scenario;
if (
  scenario === null ||
  typeof scenario !== "object" ||
  scenario.intent === null ||
  typeof scenario.intent !== "object" ||
  !Array.isArray(scenario.views)
) {
  process.stdout.write(JSON.stringify({ error: "scenario is absent or wrong-shaped" }));
  process.exit(0);
}

const reports = [];
const calls = [];
const effects = [];
const executionByKey = new Map();
let seq = 0;
let currentView = null;

const venue = {
  placeOrder(orderIntentId, request) {
    seq += 1;
    calls.push({
      seq,
      attempt: currentView.attempt,
      reconcilerId: currentView.reconcilerId,
      authorityEpoch: currentView.authorityEpoch,
      orderIntentId,
      request: { ...request },
    });
    const prior = executionByKey.get(request.idempotencyKey);
    if (prior !== undefined) return { accepted: true, executionId: prior, deduplicated: true };
    const executionId = `execution::${request.idempotencyKey}`;
    executionByKey.set(request.idempotencyKey, executionId);
    seq += 1;
    effects.push({ seq, orderIntentId, executionId, ...request });
    return { accepted: true, executionId, deduplicated: false };
  },
};

try {
  const controls = {
    reference: {
      run(view, facade) {
        const idempotencyKey = view.intent.idempotencyKey;
        const receipt = facade.placeOrder(view.intent.orderIntentId, {
          idempotencyKey,
          accountId: view.intent.accountId,
          symbol: view.intent.symbol,
          side: view.intent.side,
          quantity: view.intent.quantity,
        });
        return {
          orderIntentId: view.intent.orderIntentId,
          reconcilerId: view.reconcilerId,
          authorityEpoch: view.authorityEpoch,
          idempotencyKey,
          outcome: "accepted",
          venueAccepted: receipt.accepted,
        };
      },
    },
    "recompute-current-authority": {
      run(view, facade) {
        const idempotencyKey =
          `order::${view.intent.orderIntentId}::${view.intent.clientRequestId}::authority-${view.authorityEpoch}`;
        const receipt = facade.placeOrder(view.intent.orderIntentId, {
          idempotencyKey,
          accountId: view.intent.accountId,
          symbol: view.intent.symbol,
          side: view.intent.side,
          quantity: view.intent.quantity,
        });
        return {
          orderIntentId: view.intent.orderIntentId,
          reconcilerId: view.reconcilerId,
          authorityEpoch: view.authorityEpoch,
          idempotencyKey,
          outcome: "accepted",
          venueAccepted: receipt.accepted,
        };
      },
    },
  };
  const control = typeof input.control === "string" ? controls[input.control] : undefined;
  const mod = control === undefined ? await import(modulePath) : { subject: control };
  if (!mod.subject || typeof mod.subject.run !== "function") {
    throw new Error("module must export subject.run(view, venue)");
  }
  for (currentView of scenario.views) reports.push(await mod.subject.run(currentView, venue));
  process.stdout.write(JSON.stringify({ reports, calls, effects }));
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message ?? err) }));
}
