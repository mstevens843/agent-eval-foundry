// The container must be able to read its own bind mount.
//
// Same class as clone-fidelity: a defect that cannot exist on the machine that wrote it.
//
// `mkdtempSync` creates a directory at 0700, owned by whoever ran the process. The container is
// deliberately forced to `--user=1000:1000` so nothing runs as root, and on a Linux host that uid is
// almost never the one that staged the files — GitHub's ubuntu runners are uid 1001. uid 1000 then
// cannot traverse into the mount, and node reports the staged script as MODULE_NOT_FOUND: a
// permission error wearing a missing-file error's clothes, which is how it was first misread as
// "probe.mjs was never created".
//
// It does not reproduce on macOS at all. Docker Desktop shares the host filesystem through a VM
// layer that remaps ownership, so every uid inside the container reads the mount whatever its mode.
// Green locally, red on CI, and the docker command in the failure log is byte-identical to the one
// that works.
//
// Verified against native Linux semantics: a 0700 directory owned by 1001, read as uid 1000, fails
// at `node:internal/modules/cjs/loader:1433` — the exact line CI reported. At 0755 it loads.
//
// This test asserts the mode rather than the symptom, because the symptom needs a Linux host with a
// mismatched uid and this must fail on the machine most likely to reintroduce it.

import { existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { containerDryRun } from "../src/trials/runners.js";

const mode = (path: string): number => statSync(path).mode & 0o777;

describe("a container can read what was staged for it", () => {
  it("mkdtempSync alone is not readable by another uid — the defect this guards", () => {
    // Pinned so the guard below is understood as compensating for a real default, not decoration.
    const raw = mkdtempSync(join(tmpdir(), "staging-mode-baseline-"));
    expect(mode(raw)).toBe(0o700);
  });

  it("the dry run stages a directory a non-root container uid can traverse", () => {
    const dry = containerDryRun();
    // The staging directory is named in argv whether or not docker is present, so this asserts the
    // mode on a machine with no container runtime at all.
    const bind = dry.argv
      .find((a) => a.startsWith("--mount=type=bind,source="))
      ?.replace("--mount=type=bind,source=", "")
      .replace(/,target=.*$/, "");

    expect(bind).toBeDefined();
    if (bind === undefined || !existsSync(bind)) return;

    expect(mode(bind) & 0o055).toBe(0o055);
    for (const file of ["probe.mjs", "bundle-marker.txt"]) {
      const staged = join(bind, file);
      if (existsSync(staged)) expect(mode(staged) & 0o044).toBe(0o044);
    }
  });
});
