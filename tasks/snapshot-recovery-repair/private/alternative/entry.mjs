import { createHash } from "node:crypto";
export const subject = {
  async run(v, api) {
    const candidates = v.catalog.filter(
      (c) => c.tenant === v.tenant && c.branch === v.branch && c.at <= v.cutoff,
    );
    const cp = candidates.reduce((a, b) => (a.lsn > b.lsn ? a : b)),
      raw = Buffer.from((await api.fetch({ digest: cp.digest })).bytes, "base64");
    if (raw.length !== cp.size || createHash("sha256").update(raw).digest("hex") !== cp.digest)
      throw Error("bytes");
    const state = JSON.parse(raw),
      journal = v.logs
        .filter((t) => t.tenant === v.tenant && t.branch === v.branch && t.lsn > cp.lsn && t.at <= v.cutoff)
        .sort((a, b) => a.lsn - b.lsn);
    for (const t of journal) {
      for (const c of t.changes) {
        state[c.table] = state[c.table].filter((r) => r.id !== c.row.id);
        if (c.op === "put") state[c.table].push(c.row);
      }
      state.nextId = t.nextId;
    }
    await api.begin({});
    // Deferred relationships allow this independent child-first restoration strategy.
    for (const table of ["entries", "accounts"])
      for (const row of state[table]) await api.put({ table, row });
    await api.allocate({ nextId: state.nextId });
    await api.commit({});
    await api.archive({
      bytes: Buffer.from(
        JSON.stringify({ tenant: v.tenant, branch: v.branch, cutoff: v.cutoff, ...state }),
      ).toString("base64"),
    });
    return await api.publish({});
  },
};
