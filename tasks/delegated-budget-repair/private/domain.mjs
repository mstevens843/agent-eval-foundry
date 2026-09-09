import { deliver } from "./restart.mjs";
import { session, equal, checks } from "./adapter.mjs";
export async function runScenario(s, execute, storage) {
  const actual = new Map(s.wallets.map((w) => [w.id, structuredClone(w)])),
    expectedState = new Map(s.wallets.map((w) => [w.id, structuredClone(w)]));
  const effects = [],
    calls = [],
    observations = [],
    reports = [],
    expected = [],
    expectedReports = [],
    pending = new Map(),
    attempted = new Set(),
    prefixes = [],
    interruptions = [];
  const describe = ({ wallet }) => structuredClone(actual.get(wallet) ?? null);
  const lookup = ({ key }) => {
    const p = pending.get(key);
    if (p && p.left-- > 0) return { status: "PENDING" };
    const receipt = effects.find((e) => e.key === key);
    return receipt ? { status: "ACCEPTED", receipt: structuredClone(receipt) } : { status: "ABSENT" };
  };
  const debit = (request) => {
    calls.push(structuredClone(request));
    const known = effects.find((e) => e.key === request.key);
    if (known) return { status: "ACCEPTED", receipt: structuredClone(known) };
    const first = !attempted.has(request.key);
    attempted.add(request.key);
    // One documented lost/unexecuted attempt is resolved by ABSENT, then a legal same-key retry.
    if (first && s.unknown === 2) {
      pending.set(request.key, { left: 1 });
      return { status: "UNKNOWN" };
    }
    const receipt = structuredClone(request);
    effects.push(receipt);
    const wallet = actual.get(request.wallet),
      grant = wallet?.grants.find((g) => g.id === request.grant);
    if (grant) grant.spent += request.credits;
    if (first && s.unknown === 1) {
      pending.set(request.key, { left: 1 });
      return { status: "UNKNOWN" };
    }
    return { status: "ACCEPTED", receipt };
  };
  for (const [job, input] of s.jobs.entries()) {
    for (const update of input.grants)
      for (const state of [actual, expectedState]) {
        const grant = state.get(update.wallet).grants.find((g) => g.id === update.id);
        const spent = grant.spent;
        Object.assign(grant, update, { spent });
        delete grant.wallet;
      }
    const decisions = [];
    for (const r of input.requests) {
      let receipt = expected.find((e) => e.id === r.id) ?? null;
      const w = expectedState.get(r.wallet),
        g = w?.grants.find((g) => g.id === r.grant);
      if (
        !receipt &&
        w?.owner === r.owner &&
        g?.delegate === r.delegate &&
        g.version === r.grantVersion &&
        g.allowed &&
        g.spent + r.credits <= g.limit
      ) {
        receipt = { ...r, key: r.id };
        expected.push(receipt);
        g.spent += r.credits;
      }
      decisions.push({ id: r.id, status: receipt ? "accepted" : "rejected", receipt });
    }
    expectedReports.push({ job, decisions });
    await deliver(
      execute, () => session(
        { job, storage, requests: input.requests },
        { describe, lookup, debit },
        (r) => reports.push(r),
        observations,
      ),
      input.crashAfterDebit ? { method: "api.debit", count: input.crashAfterDebit, observations } : null,
      interruptions, { job },
    );
    prefixes.push({
      actual: structuredClone(effects),
      expected: structuredClone(expected),
      calls: structuredClone(calls),
      actualState: structuredClone([...actual]),
      expectedState: structuredClone([...expectedState]),
    });
  }
  return {
    ...checks({
      completion: expected.every((e) => effects.some((a) => a.id === e.id)),
      ownership: effects.every((e) =>
        expected.some(
          (a) =>
            a.id === e.id &&
            a.owner === e.owner &&
            a.delegate === e.delegate &&
            a.grantVersion === e.grantVersion,
        ),
      ),
      aggregate_budget: prefixes.every((p) => equal(p.actualState, p.expectedState)),
      payload: prefixes.every((p) => p.calls.every((c) => p.expected.some((e) => equal(c, e)))),
      receipt_history: prefixes.every((p) => equal(p.actual, p.expected)),
      decisions: equal(reports, expectedReports),
      preservation: effects.every((e) => expected.some((a) => a.id === e.id && a.wallet === e.wallet)),
    }),
    effects,
    calls,
    reports,
    observations,
    input: { wallets: s.wallets, jobs: s.jobs.map(({ grants, requests }) => ({ grants, requests })) },
    interruptions,
    actual: [...actual],
    prefixes: prefixes.map(({ actual, calls, actualState }) => ({ actual, calls, actualState })),
  };
}
