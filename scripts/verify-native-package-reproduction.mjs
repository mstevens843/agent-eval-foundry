/** No-provider reproduction proof: BUILD REPEAT_BUILD RECIPIENT. Run after export, before optional recipient revalidation. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [built, repeated, exported] = process.argv.slice(2);
if (!built || !repeated || !exported || process.argv.length !== 5)
  throw new Error("usage: node scripts/verify-native-package-reproduction.mjs BUILD REPEAT_BUILD RECIPIENT");
const digest = (b) => createHash("sha256").update(b).digest("hex");
const fileHash = async (p) => {
  const h = createHash("sha256");
  for await (const b of createReadStream(p)) h.update(b);
  return h.digest("hex");
};
const inventory = async (root, relative = "") => {
  const path = join(root, relative);
  const s = lstatSync(path);
  if (s.isSymbolicLink()) throw new Error("unexpected symlink");
  if (s.isFile())
    return [{ path: relative, size: s.size, executable: !!(s.mode & 0o111), hash: await fileHash(path) }];
  const rows = [];
  for (const name of readdirSync(path).sort()) rows.push(...(await inventory(root, join(relative, name))));
  return rows;
};
const read = (p) => JSON.parse(readFileSync(p));
const pointers = [built, repeated, exported].map((p) => read(join(p, "package.json")));
if (new Set(pointers.map((p) => p.packageDigest)).size !== 1)
  throw new Error("repeat/export identity mismatch");
const roots = await Promise.all(
  [built, repeated, exported].map((p) => inventory(join(p, "tasks/caa-revalidation-repair"))),
);
const taskDigests = roots.map((r) => digest(JSON.stringify(r)));
if (new Set(taskDigests).size !== 1) throw new Error("task graph bytes mismatch");
const runtimeHashes = await Promise.all(
  [built, repeated, exported].map((p) => fileHash(join(p, "runtime.tar"))),
);
if (new Set(runtimeHashes).size !== 1) throw new Error("runtime archive mismatch");
const before = await inventory(exported);
const observed = JSON.parse(
  execFileSync(process.execPath, ["dist/packages/local-cli.js", "inspect", exported], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  }),
);
const after = await inventory(exported);
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("inspection changed artifact bytes");
if (!observed.decision.stages["local-valid"].allowed) throw new Error("matching receipt not consumed");
for (const stage of ["trial-eligible", "trial-authorized", "hardness-observed", "release-eligible"])
  if (observed.decision.stages[stage].allowed)
    throw new Error("local controls promoted into external qualification");
const publicRows = await inventory(join(exported, "public"));
if (publicRows.some((r) => !r.path.startsWith("environment/") && r.path !== "instruction.md"))
  throw new Error("private path in public bundle");
console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      packageDigest: pointers[0].packageDigest,
      builds: [built, repeated],
      exported,
      repeatBuildIdentity: true,
      taskGraphDigests: taskDigests,
      runtimeArchiveHashes: runtimeHashes,
      readOnlyInspection: true,
      recipientFiles: before.length,
      recipientBytes: before.reduce((s, r) => s + r.size, 0),
      publicFiles: publicRows.length,
      recipientTreeDigest: digest(JSON.stringify(before)),
      decision: observed.decision,
      providerCallsMade: 0,
    },
    null,
    2,
  ),
);
