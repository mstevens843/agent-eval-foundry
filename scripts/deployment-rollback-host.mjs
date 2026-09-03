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

const controller = {
  compensate(rollbackIntentId, request) {
    seq += 1;
    calls.push({
      seq,
      attempt: currentView.attempt,
      controllerId: currentView.controllerId,
      authorityEpoch: currentView.authorityEpoch,
      rollbackIntentId,
      request: { ...request },
    });
    const prior = effectByKey.get(request.idempotencyKey);
    if (prior !== undefined) return { applied: true, effectId: prior, deduplicated: true };
    const effectId = `rollback-effect::${request.idempotencyKey}`;
    effectByKey.set(request.idempotencyKey, effectId);
    seq += 1;
    effects.push({ seq, rollbackIntentId, effectId, ...request });
    return { applied: true, effectId, deduplicated: false };
  },
};

try {
  const controls = {
    reference: {
      run(view, facade) {
        const idempotencyKey = view.intent.idempotencyKey;
        const receipt = facade.compensate(view.intent.rollbackIntentId, {
          idempotencyKey,
          releaseId: view.intent.releaseId,
          regionId: view.intent.regionId,
          compensation: view.intent.compensation,
        });
        return {
          rollbackIntentId: view.intent.rollbackIntentId,
          controllerId: view.controllerId,
          authorityEpoch: view.authorityEpoch,
          idempotencyKey,
          outcome: "compensated",
          controllerApplied: receipt.applied,
        };
      },
    },
    "recompute-current-authority": {
      run(view, facade) {
        const idempotencyKey =
          `rollback::${view.intent.rollbackIntentId}::${view.intent.releaseId}::authority-${view.authorityEpoch}`;
        const receipt = facade.compensate(view.intent.rollbackIntentId, {
          idempotencyKey,
          releaseId: view.intent.releaseId,
          regionId: view.intent.regionId,
          compensation: view.intent.compensation,
        });
        return {
          rollbackIntentId: view.intent.rollbackIntentId,
          controllerId: view.controllerId,
          authorityEpoch: view.authorityEpoch,
          idempotencyKey,
          outcome: "compensated",
          controllerApplied: receipt.applied,
        };
      },
    },
  };
  const control = typeof input.control === "string" ? controls[input.control] : undefined;
  const mod = control === undefined ? await import(modulePath) : { subject: control };
  if (!mod.subject || typeof mod.subject.run !== "function") {
    throw new Error("module must export subject.run(view, controller)");
  }
  for (currentView of scenario.views) reports.push(await mod.subject.run(currentView, controller));
  process.stdout.write(JSON.stringify({ reports, calls, effects }));
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message ?? err) }));
}
