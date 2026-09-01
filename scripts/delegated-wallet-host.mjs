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

const facade = () => ({
  currentPolicy(id) {
    seq += 1;
    calls.push({ seq, attempt, method: "currentPolicy", id, actionId: null });
    return scenario.currentPolicy?.id === id ? scenario.currentPolicy : null;
  },
  currentDelegation(id) {
    seq += 1;
    calls.push({ seq, attempt, method: "currentDelegation", id, actionId: null });
    return scenario.currentDelegation?.id === id ? scenario.currentDelegation : null;
  },
  currentToken(id) {
    seq += 1;
    calls.push({ seq, attempt, method: "currentToken", id, actionId: null });
    return scenario.currentToken?.id === id ? scenario.currentToken : null;
  },
  remainingBudget(walletId, owner) {
    seq += 1;
    calls.push({ seq, attempt, method: "remainingBudget", id: `${walletId}:${owner}`, actionId: null });
    return scenario.currentPolicy?.walletId === walletId && scenario.currentPolicy?.owner === owner
      ? scenario.remainingBudget
      : null;
  },
  executeSpend(actionId, effect) {
    seq += 1;
    calls.push({ seq, attempt, method: "executeSpend", id: effect.idempotencyKey, actionId });
    seq += 1;
    effects.push({ seq, attempt, actionId, effect: { actionId, ...effect } });
    return {
      ok: true,
      effectId: `spend:${effect.idempotencyKey}:${effect.walletId}:${effect.amount}`,
    };
  },
});

try {
  const mod = await import(modulePath);
  if (!mod.subject || typeof mod.subject.run !== "function") {
    throw new Error("module must export subject.run(view, authority)");
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
