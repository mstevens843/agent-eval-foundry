import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
export const subject = {
  async run(v, api) {
    let nodes = [];
    for (const d of v.descriptors) {
      const result = await api.fetch({ url: d.url, digest: d.digest });
      let entries;
      try {
        const raw = Buffer.from(result.bytes, "base64"),
          plain = gunzipSync(raw, { maxOutputLength: 1048576 }),
          sha = (b) => createHash("sha256").update(b).digest("hex");
        if (raw.length !== d.size || sha(raw) !== d.digest || sha(plain) !== d.plainDigest)
          throw Error("commit");
        entries = JSON.parse(plain).entries;
      } catch {
        return await api.finish({ status: "unavailable", digests: [] });
      }
      const removals = entries.filter((e) => e.kind === "opaque" || e.kind === "remove");
      nodes = nodes.filter(
        (n) =>
          !removals.some(
            (e) => n.path.startsWith(e.path + "/") || (e.kind === "remove" && n.path === e.path),
          ),
      );
      for (const e of entries.filter((e) => e.kind === "file" || e.kind === "dir")) {
        const parts = e.path.split("/");
        for (let i = 1; i < parts.length; i++) {
          const path = parts.slice(0, i).join("/");
          if (!nodes.some((n) => n.path === path && n.kind === "dir")) {
            nodes = nodes.filter((n) => n.path !== path && !n.path.startsWith(path + "/"));
            nodes.push({ path, kind: "dir", mode: 493 });
          }
        }
        const preserve = e.kind === "dir" && nodes.some((n) => n.path === e.path && n.kind === "dir");
        nodes = nodes.filter((n) => n.path !== e.path && (preserve || !n.path.startsWith(e.path + "/")));
        nodes.push(e);
      }
    }
    const old = await api.list({});
    for (const path of Object.keys(old)) if (!path.includes("/")) await api.remove({ path });
    for (const n of nodes.sort((a, b) => a.path.split("/").length - b.path.split("/").length)) {
      const { path, ...entry } = n;
      await api.write({ path, entry });
    }
    return await api.finish({ status: "installed", digests: v.descriptors.map((d) => d.digest) });
  },
};
