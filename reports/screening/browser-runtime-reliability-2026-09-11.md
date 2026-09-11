# Browser runtime mitigation and next five-trial preparation

The next five trials are prepared with every provider switched: Route and Browser on Codex; Calendar, Workflow and Budget on Claude. Browser gets 4 GiB of authoring memory. All five retain the exact 3.0.0 / coverage-v2 task and grader packages from Trials 4 and 5. This is historical **Trial 6**, the fourth model-attempt round on these successors. [Launch handoff](../../docs/hardened-next-five-trial-four-handoff.md) · [Preparation manifest](evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) · [Infrastructure evidence](evidence/2026-09-11-browser-runtime-reliability.json).

## What the interrupted attempt establishes

Browser's Trial 5 container exited 134 after 1,898,868 ms. It produced 970 events, 817,951 stdout bytes and no stderr. The largest recorded event line was 103,522 bytes, well below the capture limit of 4 MiB. Neither the event-line guard nor the total output quota fired. Docker recorded `OOMKilled:false` and an empty daemon error field.

That supports an infrastructure interruption, with no service/checker result and no counted failure. It does **not** establish the cause of the CLI abort. In particular, the earlier suggestion of a large base64 payload overwhelming the Foundry capture buffer is not supported by the retained bytes. Absence of a cgroup OOM kill does not exclude allocation failure inside a process. No resource samples or core dump establish that memory caused this incident.

Earlier wording that reading the capture code “definitively cleared” all Foundry code was too strong. The narrower verified finding is that the two capture quota guards did not fire. Historical raw records remain unchanged.

## Infrastructure changes

- Browser authoring memory increases from 2 GiB to 4 GiB in the new campaign's hashed execution profile. Other tasks remain at 2 GiB. This gives the solver and Chromium more room; it is a mitigation for a plausible resource cause, not a claim that the original cause was reproduced.
- The real-provider adapter now samples fixed cgroup memory/current/peak/limit/event counters, process-limit counters and temporary-filesystem usage every 15 seconds. Probe output is capped at 8 KiB, each probe times out after five seconds, probes do not overlap, and sampling stops after 1,440 samples or when capture ends.
- Resource evidence is written outside the solver workspace. The probe does not read task files, process arguments, environments or credentials. Diagnostic failures are recorded as unavailable and never substitute for a grading outcome. Sampling is stopped before container removal and also on exceptional return from capture.
- Core dumps are disabled for authoring containers, preventing an abort from writing a large core into a task workspace. Existing stdout/stderr, image/state inspection, publication and solver-submission limits remain intact.

The two changed execution modules are [real-provider.ts](../../src/execution/real-provider.ts) and [authoring-diagnostics.ts](../../src/execution/authoring-diagnostics.ts). All remaining source changes from the prior frozen runtime concern preparation or publication scripts. The new runtime was built in an independent frozen directory; live repository editing cannot change it during trials.

## Validation

An offline test used the actual pinned authoring image with the real sandbox flags and 4 GiB memory, without credentials or network access. Chromium completed repeated accessible-button interactions and screenshot capture while retaining a 2,304 MiB allocation. Recorded peak container memory was **2,474.8 MiB**, above the old allowance. Five JSON events totaling **6,625,585 bytes** were captured without truncation. A separate intentionally aborted Node process returned exit 134 and remained `process-error`; its resource evidence and exit state were retained. These checks validate the new envelope and diagnostics, not the stability of every future provider CLI session.

Validation passed: four diagnostic unit tests; ten existing lifecycle/capture/authorization tests; the offline Docker test covering successful Chromium work and deliberate abort; lint, typecheck and isolated runtime build. All five unchanged coverage-v2 exports were reverified. The new read-only controller verification checked 894 source/config files, 2,088 dependency entries, package/profile bindings, provider switches, and absence of a dispatch claim. Previous completion manifests verified 4,245 files, including Browser's interrupted attempt.

No new task or grading requirements were introduced. Existing native oracle/nop and integrity evidence still applies to the unchanged packages. No provider calls, commits or pushes occurred.

## Disk recovery

The host initially had about 6.35 GiB available, below the existing 8 GiB launch reserve. We SHA256-verified 136 duplicate runtime archives and replaced them atomically with APFS copy-on-write clones of byte-identical archives. Every logical path, byte content and digest was preserved; files remain ordinary files with link count one. No trial evidence, pinned images or task exports were deleted.

Consolidating the recent archives alone did not recover meaningful space. Consolidating the older retained archive copies brought available space to approximately **18.8 GiB**. The evidence JSON links both detailed receipts. Final Docker capacity was 10 CPUs and 15.6 GiB RAM, with no trial containers active. The new campaign reserves 12 GiB in total authoring limits and checks at least 2 GiB additional Docker capacity at dispatch.

## Accounting and next action

Trial 5 remains four scored reward-zero results and one unscored Browser interruption. No previous reward was regraded in this work. The preparation's `priorRecords.countsAsModelFailure` values preserve the raw framework adjudication flags; the prior campaign's published rewards and grading evidence remain the result record. Those flags are not a new benchmark counting rule.

The requested next campaign makes exactly five calls, all concurrently, on opposite providers. Browser's missing scored Claude attempt remains pending because its next attempt is Codex. The previously prepared standalone Claude retry has not launched; its old runtime/profile lacks these mitigations and it is deferred from this handoff. The existing five finalist results from the earlier program remain unchanged.
