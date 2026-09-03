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
const effectByKey = new Map();
let seq = 0;
let currentView = null;

const tool = {
  execute(actionId, request) {
    seq += 1;
    calls.push({
      seq,
      attempt: currentView.attempt,
      workerId: currentView.workerId,
      leaseEpoch: currentView.leaseEpoch,
      actionId,
      request: { ...request },
    });
    const prior = effectByKey.get(request.idempotencyKey);
    if (prior !== undefined) return { ok: true, effectId: prior, deduplicated: true };
    const effectId = `effect::${request.idempotencyKey}`;
    effectByKey.set(request.idempotencyKey, effectId);
    seq += 1;
    effects.push({
      seq,
      actionId,
      idempotencyKey: request.idempotencyKey,
      payload: request.payload,
      effectId,
    });
    return { ok: true, effectId, deduplicated: false };
  },
};

try {
  const controls = {
    reference: {
      run(view, facade) {
        const idempotencyKey = view.intent.idempotencyKey;
        const receipt = facade.execute(view.intent.actionId, {
          idempotencyKey,
          payload: view.intent.payload,
        });
        return {
          actionId: view.intent.actionId,
          workerId: view.workerId,
          leaseEpoch: view.leaseEpoch,
          idempotencyKey,
          outcome: "executed",
          toolOk: receipt.ok,
        };
      },
    },
    "recompute-current-epoch": {
      run(view, facade) {
        const idempotencyKey =
          `idem::${view.intent.actionId}::${view.intent.requestId}::epoch-${view.leaseEpoch}`;
        const receipt = facade.execute(view.intent.actionId, {
          idempotencyKey,
          payload: view.intent.payload,
        });
        return {
          actionId: view.intent.actionId,
          workerId: view.workerId,
          leaseEpoch: view.leaseEpoch,
          idempotencyKey,
          outcome: "executed",
          toolOk: receipt.ok,
        };
      },
    },
  };
  const control = typeof input.control === "string" ? controls[input.control] : undefined;
  const mod = control === undefined ? await import(modulePath) : { subject: control };
  if (!mod.subject || typeof mod.subject.run !== "function") {
    throw new Error("module must export subject.run(view, tool)");
  }
  for (currentView of scenario.views) reports.push(await mod.subject.run(currentView, tool));
  process.stdout.write(JSON.stringify({ reports, calls, effects }));
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message ?? err) }));
}
