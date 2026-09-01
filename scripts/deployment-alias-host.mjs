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
const reports = [];
const calls = [];
const effects = [];
let seq = 0;
let attempt = 0;

const effectId = (request, decision) =>
  `rollout:${request.idempotencyKey}:${request.alias}:${decision}`;

const facade = () => ({
  currentAlias(alias) {
    seq += 1;
    calls.push({ seq, attempt, method: "currentAlias", id: alias, actionId: null });
    return scenario.currentAlias?.alias === alias ? scenario.currentAlias : null;
  },
  rolloutLedger(alias) {
    seq += 1;
    calls.push({ seq, attempt, method: "rolloutLedger", id: alias, actionId: null });
    return (scenario.rolloutLedger ?? []).filter((entry) => entry.alias === alias);
  },
  evalStream(alias) {
    seq += 1;
    calls.push({ seq, attempt, method: "evalStream", id: alias, actionId: null });
    return (scenario.evalStream ?? []).filter((sample) => sample.alias === alias);
  },
  baseline(version) {
    seq += 1;
    calls.push({ seq, attempt, method: "baseline", id: version, actionId: null });
    return scenario.baseline?.version === version ? scenario.baseline : null;
  },
  applyRolloutDecision(actionId, effect) {
    seq += 1;
    calls.push({ seq, attempt, method: "applyRolloutDecision", id: effect.idempotencyKey, actionId });
    seq += 1;
    effects.push({ seq, attempt, actionId, effect: { actionId, ...effect } });
    return {
      ok: true,
      effectId: effectId(scenario.view.request, effect.decision),
    };
  },
});

try {
  const mod = await import(modulePath);
  if (!mod.subject || typeof mod.subject.run !== "function") {
    throw new Error("module must export subject.run(view, deployment)");
  }
  for (attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
    reports.push(
      await mod.subject.run(
        {
          ...scenario.view,
          attempt,
        },
        facade(),
      ),
    );
  }
  process.stdout.write(JSON.stringify({ reports, calls, effects }));
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message ?? err) }));
}
