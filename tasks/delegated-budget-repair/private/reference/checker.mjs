import { equal, verdicts } from "./checker-utils.mjs";
function check(cell) {
  const wallets = structuredClone(cell.input.wallets);
  const receipts = [], reports = [];
  if (cell.prefixes.length !== cell.input.jobs.length) return false;
  for (const [job, input] of cell.input.jobs.entries()) {
    for (const update of input.grants) {
      const wallet = wallets.find((w) => w.id === update.wallet);
      const grant = wallet.grants.find((g) => g.id === update.id);
      const { wallet: _wallet, ...fields } = update;
      Object.assign(grant, fields, { spent: grant.spent });
    }
    const decisions = [];
    for (const r of input.requests) {
      let receipt = receipts.find((e) => e.id === r.id) ?? null;
      if (!receipt) {
        const wallet = wallets.find((w) => w.id === r.wallet);
        const grant = wallet?.grants.find((g) => g.id === r.grant);
        const eligible = wallet?.owner === r.owner && grant?.delegate === r.delegate && grant?.version === r.grantVersion
          && grant.allowed && r.credits <= grant.limit - grant.spent;
        if (eligible) {
          receipt = { ...r, key: r.id }; receipts.push(receipt); grant.spent += r.credits;
        }
      }
      decisions.push({ id: r.id, status: receipt ? "accepted" : "rejected", receipt });
    }
    reports.push({ job, decisions });
    const prefix = cell.prefixes[job];
    if (!equal(prefix.actual, receipts) || !equal(prefix.actualState, wallets.map((w) => [w.id, w]))) return false;
    if (!prefix.calls.every((call) => receipts.some((r) => equal(r, call)))) return false;
  }
  return equal(cell.reports, reports) && equal(cell.effects, receipts) && equal(cell.actual, wallets.map((w) => [w.id, w]));
}
export const run = ({ cases }) => verdicts(cases, check);
