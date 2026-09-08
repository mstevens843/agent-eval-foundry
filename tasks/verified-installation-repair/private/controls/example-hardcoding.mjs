export const subject = {
  async run(v, api) {
    const old = await api.list({});
    for (const path of Object.keys(old)) if (!path.includes("/")) await api.remove({ path });
    for (const [path, entry] of Object.entries({
      etc: { kind: "dir", mode: 493 },
      "etc/old": { kind: "file", mode: 420, data: "cmV0aXJl" },
      app: { kind: "file", mode: 420, data: "djE=" },
      replace: { kind: "file", mode: 420, data: "bG93ZXI=" },
    }))
      await api.write({ path, entry });
    return api.finish({ status: "installed", digests: v.descriptors.map((d) => d.digest) });
  },
};
