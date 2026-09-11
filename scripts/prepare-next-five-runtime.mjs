import { readFileSync, mkdirSync, writeFileSync, copyFileSync, constants } from "node:fs";
import { join } from "node:path";
const source = ".local/next-five-implementation-2026-09-09/release-ready/workflow-authority-repair/export";
const target = ".local/next-five-successors-2026-09-10/runtime";
mkdirSync(target, { recursive: false });
const digest = JSON.parse(readFileSync(join(source, "package.json"))).packageDigest;
const record = JSON.parse(readFileSync(join(source, "store/records", digest + ".json")));
const runtime = record.components.dependencies.files.find((f) => f.path === "runtime.json");
writeFileSync(join(target, "runtime.json"), readFileSync(join(source, "store/blobs", runtime.sha256)), {
  flag: "wx",
});
copyFileSync(join(source, "runtime.tar"), join(target, "runtime.tar"), constants.COPYFILE_FICLONE);
console.log(JSON.stringify({ source, target, runtimeManifestSha256: runtime.sha256, providerCallsMade: 0 }));
