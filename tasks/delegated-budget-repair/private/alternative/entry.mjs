// Current-authority allocation table; no persistent receipt or authority cache.
export const subject = {
  run(view, api) {
    const wallets = new Map();
    for (const r of view.requests)
      if (!wallets.has(r.wallet)) wallets.set(r.wallet, api.describe({ wallet: r.wallet }));
    const decisions = [];
    for (const r of view.requests) {
      let result = api.lookup({ key: r.id });
      for (let poll = 1; result.status === "PENDING" && poll < 3; poll++) result = api.lookup({ key: r.id });
      if (result.status === "PENDING") throw Error("receipt resolution bound");
      if (result.status !== "ACCEPTED") {
        const w = wallets.get(r.wallet),
          g = w?.grants.find((g) => g.id === r.grant);
        const allowed =
          w?.owner === r.owner &&
          g?.delegate === r.delegate &&
          g?.version === r.grantVersion &&
          g.allowed &&
          g.spent + r.credits <= g.limit;
        if (allowed) {
          for (let i = 0; i < 12 && result.status !== "ACCEPTED"; i++) {
            result = result.status === "ABSENT" ? api.debit({ ...r, key: r.id }) : api.lookup({ key: r.id });
          }
          if (result.status !== "ACCEPTED") throw Error("unsettled");
          g.spent += r.credits;
        }
      }
      decisions.push({
        id: r.id,
        status: result.status === "ACCEPTED" ? "accepted" : "rejected",
        receipt: result.status === "ACCEPTED" ? result.receipt : null,
      });
    }
    return { job: view.job, decisions };
  },
};
