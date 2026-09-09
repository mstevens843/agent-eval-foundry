# Separate package engineering from live trials

Different task IDs do not fully isolate agents sharing one Foundry checkout.
`authoritySourceDigest()` fingerprints every file under `src/`, `scripts/` and
`data/`, plus the package/lock/build configuration files. It deliberately catches
stale execution builds. Task-package directories are excluded, but a general
packaging-script edit still changes the fingerprint. A shared `dist/` rebuild is
another mutable dependency. Neither implies that a frozen task export changed.

Before a campaign, create a dedicated source snapshot with
`scripts/candidate-snapshot.mjs DESTINATION assemble`. Give it an independent,
lockfile-compatible dependency installation or verified private copy; build its
own `dist/`. Point the controller's imports, source-fingerprint checks and working
directory at that snapshot. Continue consuming the verified frozen package exports,
and write campaign results to a dedicated directory. Keep the same signed JobStore
authorization, package checks and attempt limits.

Verify source/build digest equality and that dependency links remain inside the
snapshot. Prepare the campaign only after those inputs are fixed, then leave them
unchanged throughout execution and grading. Making the critical paths read-only
also guards against accidental edits. Main-checkout task, tool and build work can
continue independently. A source snapshot is an uncommitted candidate snapshot,
not a claim about the contents of a Git commit.

Source isolation does not reserve machine resources. Coordinate Docker capacity:
pause heavy engineering validation during a campaign using all available CPUs,
or run it on another host. Do not stop containers belonging to the trial agent.

The September 9 first-group Trial 2 campaign ultimately launched with
`.local/round-two-top-five-2026-09-09/campaign.mjs` importing its own `frozen-source/`
build and writing to `real-campaign-frozen/`. The alternate prepared
`campaign-isolated.mjs`/`ISOLATED-RUNNER.md` handoff was not dispatched. See the
[audited execution record](../reports/screening/round-two-top-five-2026-09-09.md).
Source isolation does not create an additional model-attempt allowance, and platform
permission requirements remain in effect.
