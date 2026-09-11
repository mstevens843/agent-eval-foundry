// Independent read-only verification for the single browser-replay-repair retry, before
// loading the campaign runtime. Makes no provider calls.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, lstatSync, readFileSync, readlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const retryRoot = join(root, ".local/hardened-next-five-trial-three-browser-retry-2026-09-11");
const trial5Root = join(root, ".local/hardened-next-five-trial-three-2026-09-11");
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

function inventory(directory, prefix = "") {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const file = join(directory, name);
      const path = join(prefix, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) return [{ path, link: readlinkSync(file) }];
      if (stat.isDirectory()) return inventory(file, path);
      assert(stat.isFile());
      return [{ path, sha256: hash(file) }];
    });
}

// 1. The retry's frozen-source is byte-identical to Trial 5's own frozen-source -- no rebuild,
// no task/checker/host change. Compared file-by-file, not just the top-level bundle hash.
const retryInventory = inventory(join(retryRoot, "frozen-source"));
const trial5Inventory = inventory(join(trial5Root, "frozen-source"));
assert.deepEqual(retryInventory, trial5Inventory, "Retry frozen-source differs from Trial 5's frozen-source bytes");

// 2. Bundle hash matches the pinned value both controllers assert before importing.
const bundleSha256 = hash(join(retryRoot, "frozen-source/dist/index.js"));
assert.equal(bundleSha256, "04cd21bb17982ed40cdbd2adbb8bbd75becd4963c769ca91ba22d08c84253d81");

// 3. The evidence.json used to select the task export is byte-identical to Trial 5's.
assert.equal(hash(join(retryRoot, "evidence.json")), hash(join(trial5Root, "evidence.json")));

// 4. READY.json: exactly one Claude attempt, on the exact package/profile digests the
// interrupted Trial 5 attempt used -- no substitution, no task change.
const ready = read(join(retryRoot, "real-campaign-frozen/READY.json"));
assert.equal(ready.packages.length, 1);
assert.equal(ready.concurrency, 1);
assert.equal(ready.maxProviderCalls, 1);
assert.equal(ready.automaticRetries, false);
const plan = ready.packages[0];
assert.equal(plan.id, "browser-replay-repair");
assert.equal(plan.target, "claude");
assert.equal(plan.packageDigest, "712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31");
assert.equal(plan.profileDigest, "d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794");

// 5. Package/profile digests match the interrupted Trial 5 attempt's own recorded result.json
// exactly -- this retry cannot silently substitute a different package or profile.
const interrupted = read(
  join(trial5Root, "real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1/result.json"),
);
assert.equal(interrupted.outcome, "invalid-execution");
assert.equal(interrupted.countsAsModelFailure, false);
assert.equal(plan.packageDigest, interrupted.packageDigest);
assert.equal(plan.profileDigest, interrupted.profileDigest);

// 6. No dispatch claim exists yet for the retry campaign.
const dispatchClaimExists = existsSync(join(retryRoot, "real-campaign-frozen/DISPATCH-CLAIM"));

// 7. Delegate to the controller's own verify mode (source digest, evidence digest, runner
// digest, package re-verification against the live evidence.json).
execFileSync(process.execPath, [join(retryRoot, "campaign.mjs"), "verify"], {
  cwd: retryRoot,
  stdio: "inherit",
  timeout: 60000,
});

console.log(
  JSON.stringify({
    preparedPackages: 1,
    concurrency: 1,
    maxProviderCalls: 1,
    frozenSourceFilesVerified: retryInventory.length,
    frozenSourceByteIdenticalToTrial5: true,
    packageDigestMatchesInterruptedAttempt: true,
    profileDigestMatchesInterruptedAttempt: true,
    dispatchClaimExists,
    providerCallsMade: 0,
    pass: true,
  }),
);
