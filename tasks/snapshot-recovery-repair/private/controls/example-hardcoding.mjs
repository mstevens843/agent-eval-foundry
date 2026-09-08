export const subject = {
  async run(v, api) {
    await api.archive({
      bytes: Buffer.from(
        JSON.stringify({
          tenant: v.tenant,
          branch: v.branch,
          cutoff: v.cutoff,
          accounts: [],
          entries: [],
          nextId: 1,
        }),
      ).toString("base64"),
    });
    await api.begin({});
    await api.allocate({ nextId: 1 });
    await api.commit({});
    return api.publish({});
  },
};
