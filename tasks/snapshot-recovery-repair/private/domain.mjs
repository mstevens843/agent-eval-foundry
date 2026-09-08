import { session, checks, equal } from "./adapter.mjs";
import { createRequire } from "node:module";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
function database(path) {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE accounts(id INTEGER PRIMARY KEY,name TEXT NOT NULL); CREATE TABLE entries(id INTEGER PRIMARY KEY,account INTEGER NOT NULL REFERENCES accounts(id) DEFERRABLE INITIALLY DEFERRED,amount INTEGER NOT NULL); CREATE TABLE allocation(value INTEGER NOT NULL); INSERT INTO allocation VALUES(1); CREATE TABLE unrelated(id INTEGER PRIMARY KEY,value TEXT); INSERT INTO unrelated VALUES(91,'retained')",
  );
  return db;
}
function state(db) {
  return {
    accounts: db
      .prepare("SELECT * FROM accounts ORDER BY id")
      .all()
      .map((r) => ({ ...r })),
    entries: db
      .prepare("SELECT * FROM entries ORDER BY id")
      .all()
      .map((r) => ({ ...r })),
    nextId: db.prepare("SELECT value FROM allocation").get().value,
  };
}
const normalized = (s) => ({
  ...s,
  accounts: [...s.accounts].sort((a, b) => a.id - b.id),
  entries: [...s.entries].sort((a, b) => a.id - b.id),
});
export function expected(s) {
  const cp = s.catalog
    .filter((c) => c.tenant === s.tenant && c.branch === s.branch && c.at <= s.cutoff)
    .sort((a, b) => b.lsn - a.lsn)[0];
  const x = JSON.parse(Buffer.from(s.blobs[cp.digest], "base64"));
  // Deliberately separate from the submitted restore code and from its reads.
  for (const t of [...s.logs].sort((a, b) => a.lsn - b.lsn)) {
    if (t.tenant !== s.tenant || t.branch !== s.branch || t.lsn <= cp.lsn || t.at > s.cutoff) continue;
    for (const c of t.changes) {
      x[c.table] = x[c.table].filter((row) => row.id !== c.row.id);
      if (c.op === "put") x[c.table].push({ ...c.row });
    }
    x.nextId = t.nextId;
  }
  return normalized(x);
}
function put(db, table, row) {
  if (
    table === "accounts" &&
    Number.isSafeInteger(row.id) &&
    row.id > 0 &&
    typeof row.name === "string" &&
    Object.keys(row).sort().join() === "id,name"
  ) {
    db.prepare("INSERT OR REPLACE INTO accounts VALUES(?,?)").run(row.id, row.name);
    return;
  }
  if (
    table === "entries" &&
    Number.isSafeInteger(row.id) &&
    row.id > 0 &&
    Number.isSafeInteger(row.account) &&
    Number.isSafeInteger(row.amount) &&
    Object.keys(row).sort().join() === "account,amount,id"
  ) {
    db.prepare("INSERT OR REPLACE INTO entries VALUES(?,?,?)").run(row.id, row.account, row.amount);
    return;
  }
  throw Error("row schema");
}
function restoreBackup(path, archive) {
  const db = database(path);
  try {
    if (
      !Array.isArray(archive.accounts) ||
      !Array.isArray(archive.entries) ||
      archive.accounts.length > 200 ||
      archive.entries.length > 200
    )
      throw Error("backup rows");
    if (
      new Set(archive.accounts.map((r) => r.id)).size !== archive.accounts.length ||
      new Set(archive.entries.map((r) => r.id)).size !== archive.entries.length
    )
      throw Error("duplicate backup identity");
    db.exec("BEGIN");
    for (const table of ["accounts", "entries"]) for (const row of archive[table]) put(db, table, row);
    if (!Number.isSafeInteger(archive.nextId) || archive.nextId < 1) throw Error("allocation");
    db.prepare("UPDATE allocation SET value=?").run(archive.nextId);
    db.exec("COMMIT");
    return state(db);
  } finally {
    db.close();
  }
}
export async function runScenario(s, execute, storage) {
  const directory = mkdtempSync(join(tmpdir(), "foundry-restore-")),
    db = database(join(directory, "restore.sqlite"));
  const truth = expected(s),
    observations = [],
    publications = [],
    reports = [];
  let inTransaction = false,
    published = false,
    archive = null,
    legal = true,
    committed = state(db);
  const act = (fn) => (request) => {
    if (published) {
      legal = false;
      return { ok: false, error: "published" };
    }
    try {
      fn(request);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e.message) };
    }
  };
  try {
    await execute(
      session(
        { tenant: s.tenant, branch: s.branch, cutoff: s.cutoff, catalog: s.catalog, logs: s.logs, storage },
        {
          fetch: ({ digest }) => ({ bytes: s.blobs[digest] ?? "" }),
          cache: ({ digest }) => (s.cache[digest] ? { bytes: s.cache[digest] } : null),
          begin: act(() => {
            if (inTransaction) throw Error("transaction open");
            db.exec("BEGIN");
            inTransaction = true;
          }),
          put: act(({ table, row }) => {
            if (!inTransaction) throw Error("transaction required");
            put(db, table, row);
          }),
          allocate: act(({ nextId }) => {
            if (!inTransaction || !Number.isSafeInteger(nextId) || nextId < 1) throw Error("allocation");
            db.prepare("UPDATE allocation SET value=?").run(nextId);
          }),
          commit: act(() => {
            if (!inTransaction) throw Error("transaction required");
            try {
              db.exec("COMMIT");
              inTransaction = false;
              committed = state(db);
            } catch (e) {
              db.exec("ROLLBACK");
              inTransaction = false;
              throw e;
            }
          }),
          archive: act(({ bytes }) => {
            if (typeof bytes !== "string" || bytes.length > 350000) throw Error("archive limit");
            const raw = Buffer.from(bytes, "base64");
            archive = JSON.parse(raw);
            writeFileSync(join(directory, "backup.json"), raw);
          }),
          inspect: () => structuredClone(committed),
          publish: act(() => {
            if (inTransaction || !archive) throw Error("not staged");
            publications.push({ state: structuredClone(committed), archive: structuredClone(archive) });
            published = true;
          }),
        },
        (x) => reports.push(x),
        observations,
      ),
    );
    let restored = null,
      backupError = null;
    try {
      if (archive)
        restored = restoreBackup(
          join(directory, "independent.sqlite"),
          JSON.parse(readFileSync(join(directory, "backup.json"))),
        );
    } catch (e) {
      backupError = String(e);
    }
    const actual = committed;
    const identities =
      archive?.tenant === s.tenant && archive?.branch === s.branch && archive?.cutoff === s.cutoff;
    return {
      ...checks({
        completion: published && publications.length === 1 && !inTransaction,
        restored_rows: equal(actual.accounts, truth.accounts) && equal(actual.entries, truth.entries),
        allocation: actual.nextId === truth.nextId,
        portable_backup: !!restored && identities && equal(restored, truth),
        publication: publications.length === 1 && equal(publications[0].state, truth),
        legal_operations: legal,
        preservation: db.prepare("SELECT value FROM unrelated WHERE id=91").get()?.value === "retained",
      }),
      actual,
      expected: truth,
      backupError,
      publications,
      observations,
      reports,
      // Legitimate PROBLEM input for an independent checker, not the answer: this is exactly what
      // the candidate's own entry.mjs already receives as `view` (SEMANTICS.md's tenant/branch/
      // cutoff/catalog/logs), plus the raw checkpoint bytes reachable via api.fetch({digest}) for
      // any digest named in catalog -- the same content a candidate can fetch, not a summary or a
      // hint of it. A checker needs this to independently recompute the correct restore point
      // itself (checkpoint selection + journal replay, per SEMANTICS.md's stated rules), because
      // trusting only the candidate's own observed fetch/cache calls would miss exactly the class
      // of bug where a candidate never fetches the right blob at all -- e.g. blindly trusting a
      // stale, unverified cache entry instead.
      view: { tenant: s.tenant, branch: s.branch, cutoff: s.cutoff, catalog: s.catalog, logs: s.logs },
      blobs: s.blobs,
    };
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
}
