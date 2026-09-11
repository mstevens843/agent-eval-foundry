import { existsSync, readFileSync, statfsSync } from "node:fs";
import { join, resolve } from "node:path";
import { localProcess } from "./local-process.js";
import { readSnapshotFile, resolvePackage } from "./record.js";

interface Check {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  fix?: string;
}

/** Explicit, bounded local probes. No installs, image pulls, credentials or provider calls. */
export async function doctor(root: string, packageDirectory?: string) {
  const checks: Check[] = [];
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  checks.push({
    name: "node",
    status: (major === 22 && minor >= 13) || (major > 22 && major < 25) ? "pass" : "fail",
    detail: process.version,
    fix: "Use Node 22.22.1 (the version pinned in .node-version).",
  });
  if (!packageDirectory) {
    checks.push({
      name: "source-checkout",
      status: existsSync(join(root, "tasks/portfolio-runtime/Dockerfile")) ? "pass" : "fail",
      detail: root,
      fix: "Run from the Foundry repository root; recipients can use doctor --package PACKAGE_DIRECTORY.",
    });
    try {
      const actual = (await localProcess("pnpm", ["--version"], { timeoutMs: 10000 })).stdout.trim();
      const expected = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).packageManager?.replace(
        "pnpm@",
        "",
      );
      checks.push({
        name: "pnpm",
        status: actual === expected ? "pass" : "warn",
        detail: actual,
        fix: `Install pnpm ${expected ?? "10.33.0"}; see docs/quickstart.md.`,
      });
    } catch (e) {
      checks.push({ name: "pnpm", status: "fail", detail: String(e), fix: "Install pnpm 10.33.0." });
    }
  }
  const workspace = packageDirectory ? resolve(packageDirectory) : root;
  try {
    const disk = statfsSync(workspace);
    const freeGiB = (disk.bavail * disk.bsize) / 1024 ** 3;
    checks.push({
      name: "workspace-disk",
      status: freeGiB >= 4 ? "pass" : "warn",
      detail: `${freeGiB.toFixed(1)} GiB available`,
      fix: "Allow at least 4 GiB for one example, plus Docker's own storage. Full integration requires much more; see docs/testing.md.",
    });
  } catch (e) {
    checks.push({ name: "workspace-disk", status: "fail", detail: String(e) });
  }
  let images = ["foundry-portfolio-runtime:v1"];
  let native = false;
  if (packageDirectory) {
    try {
      const pointer = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
      const snapshot = resolvePackage(join(packageDirectory, "store"), pointer.packageDigest);
      const runtime = JSON.parse(
        Buffer.from(readSnapshotFile(snapshot, "dependencies", "runtime.json")).toString(),
      );
      native = !!runtime.images;
      images = native ? [runtime.images.environment, runtime.images.verifier] : [runtime.image];
      if (images.some((image) => typeof image !== "string" || !/^sha256:[a-f0-9]{64}$/.test(image)))
        throw Error("Package runtime does not contain pinned image identities");
      checks.push({
        name: "package",
        status: "pass",
        detail: `${snapshot.record.id}: ${snapshot.record.digest}; runtime ${runtime.platform}`,
      });
    } catch (e) {
      checks.push({
        name: "package",
        status: "fail",
        detail: String(e),
        fix: "Pass the export root containing package.json and store/.",
      });
    }
  }
  try {
    const version = (
      await localProcess("docker", ["info", "--format", "{{.ServerVersion}}"], { timeoutMs: 10000 })
    ).stdout.trim();
    checks.push({ name: "docker", status: "pass", detail: version });
    for (const image of images)
      try {
        const id = (
          await localProcess("docker", ["image", "inspect", image, "--format", "{{.Id}}"], {
            timeoutMs: 10000,
          })
        ).stdout.trim();
        checks.push({ name: "runtime-image", status: "pass", detail: id });
      } catch {
        checks.push({
          name: "runtime-image",
          status: "warn",
          detail: `${image} is not cached`,
          fix: packageDirectory
            ? native
              ? "Run pnpm foundry validate PACKAGE_DIRECTORY from a Foundry checkout to verify and load the native archive."
              : "Run the bundled CLI: portfolio load-runtime PACKAGE_DIRECTORY."
            : "docker build --provenance=false -t foundry-portfolio-runtime:v1 tasks/portfolio-runtime",
        });
      }
  } catch (e) {
    checks.push({
      name: "docker",
      status: "fail",
      detail: String(e),
      fix: "Install/start Docker and allow this process to access its daemon; rerun doctor.",
    });
  }
  return {
    ok: checks.every((c) => c.status !== "fail"),
    checks: checks.map(({ fix, ...check }) =>
      check.status === "pass" ? check : { ...check, ...(fix ? { fix } : {}) },
    ),
    providerCallsMade: 0,
  };
}
