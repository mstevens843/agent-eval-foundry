import { createHash } from "node:crypto";
export const checkIds = [
  "completion",
  "restored_rows",
  "allocation",
  "portable_backup",
  "publication",
  "legal_operations",
  "preservation",
];
export function scenarios() {
  return Array.from({ length: 33 }, (_, i) => {
    const seed = i === 32 ? 0 : i + 1,
      tenant = "t" + (seed % 3),
      branch = "b" + (seed % 2),
      cutoff = seed ? 20 : 0,
      blobs = {},
      cache = {};
    function checkpoint(id, t, b, at, lsn, x) {
      const bytes = Buffer.from(JSON.stringify(x)),
        digest = createHash("sha256").update(bytes).digest("hex");
      blobs[digest] = bytes.toString("base64");
      return { id, tenant: t, branch: b, at, lsn, digest, size: bytes.length };
    }
    const initial = {
      accounts: [
        { id: 1, name: "alpha" },
        { id: 2, name: "beta" },
      ],
      entries: [{ id: 1, account: 1, amount: seed + 10 }],
      nextId: 2,
    };
    const catalog = [checkpoint("old", tenant, branch, 0, 0, initial)];
    const logs = [];
    if (seed) {
      logs.push({
        tenant,
        branch,
        lsn: 1,
        at: 10,
        changes: [
          { table: "entries", op: "put", row: { id: 2, account: 3, amount: -seed } },
          { table: "accounts", op: "put", row: { id: 3, name: "gamma" } },
        ],
        nextId: 3,
      });
      logs.push({
        tenant,
        branch,
        lsn: 2,
        at: 20,
        changes: [
          { table: "entries", op: "delete", row: { id: 1 } },
          { table: "entries", op: "put", row: { id: 2, account: 3, amount: 0 } },
        ],
        nextId: 30 + seed,
      });
      logs.push({
        tenant,
        branch,
        lsn: 3,
        at: 21,
        changes: [{ table: "entries", op: "put", row: { id: 99, account: 1, amount: 999 } }],
        nextId: 100,
      });
      logs.push({
        tenant: "other",
        branch,
        lsn: 8,
        at: 12,
        changes: [{ table: "accounts", op: "put", row: { id: 1, name: "foreign" } }],
        nextId: 2,
      });
      logs.push({
        tenant,
        branch: "other",
        lsn: 9,
        at: 13,
        changes: [{ table: "entries", op: "delete", row: { id: 2 } }],
        nextId: 2,
      });
      catalog.push(
        checkpoint("future", tenant, branch, 30, 4, { ...initial, nextId: 100 }),
        checkpoint("foreign", tenant, "other", 1, 7, { ...initial, entries: [] }),
      );
      if (seed & 1) catalog.reverse();
      if (seed & 2) logs.reverse();
      const correct = catalog.find((c) => c.id === "old");
      if (seed & 4)
        cache[correct.digest] = Buffer.from(
          JSON.stringify({
            ...initial,
            accounts: initial.accounts.map((a) => ({ ...a, name: "stale-" + a.name })),
            entries: [],
          }),
        ).toString("base64");
      if (seed & 8) {
        const advanced = {
          accounts: [...initial.accounts, { id: 3, name: "gamma" }],
          entries: [...initial.entries, { id: 2, account: 3, amount: -seed }],
          nextId: 3,
        };
        catalog.push(checkpoint("recent", tenant, branch, 10, 1, advanced));
      }
    }
    return { id: "case-" + String(i).padStart(3, "0"), tenant, branch, cutoff, catalog, logs, blobs, cache };
  });
}
