Work in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

Read `reports/pass-audits/partial-release-trial-three-2026-09-11.md` and its accompanying JSON. The independent audit retained Partial Release trial 3 as a valid pass. Trial 2 also remains a valid historical pass. Neither is null. No task or grading correction was needed.

The user explicitly requests **one additional fresh Codex confirmation trial, trial 4**, despite the retained pass. This is a specific exception to the earlier stop-on-first-pass policy for this one additional attempt. Preserve all historical outcomes and distinguish their package digests. Do not turn the history into a clean-failure streak or describe this as a retry of an invalid attempt.

Use the same validated `partial-release-repair` v2.0.2 package:

- Digest: `1422a83d7860f81e2bf9bdb52ce634887f2e8da4edcccbe8870cdcfebaadf897`.
- Build: `.local/partial-release-generation-correction-2026-09-11/build`.
- Assurance: `.local/partial-release-generation-correction-2026-09-11/assurance/assurance.json`.
- New prepared slot: `.local/partial-release-confirmation-2026-09-11/slots/trial-4/slot.json`.

The new slot has its own namespace; do not restart the stopped generation continuation or reuse its slots. Do not modify the task, checker bank, frozen runtime, slot configuration, READY files, or original evidence. Use the standard runner's isolated public workspace and instructions; do not expose audits, earlier submissions, private controls, or grader details to the solver.

Using the established subscription credential-broker/login-shell context, first verify:

```sh
node scripts/run-successor-trial-slot.mjs verify .local/partial-release-confirmation-2026-09-11/slots/trial-4/slot.json
```

Require `verified:true`, `trial:4`, `target:"codex"`, and `dispatched:false`. Confirm no other Partial Release trial is active. If this slot is already dispatched, monitor that existing attempt instead of launching again.

Launch exactly once:

```sh
node scripts/run-successor-trial-slot.mjs run .local/partial-release-confirmation-2026-09-11/slots/trial-4/slot.json --user-authorized-successor-slot
```

Subscription only; no paid API fallback and no automatic infrastructure retries. Monitor until the attempt finishes, then stop and report. Do not launch trial 5. An infrastructure or unresolved-grading incident is unscored. A recorded pass remains pending an independent false-pass audit.

Inspect and verify the actual completion, capture, grade, service case coverage, and required-checker details under:

`.local/partial-release-confirmation-2026-09-11/slots/trial-4/real-campaign-frozen/jobs/real-provider/records/partial-release-repair-attempt-1`

Report the exact digest, provider, service/checker results, combined reward or unscored incident, evidence path, and provider-call count. Derive calls from dispatch/completion evidence: the generic slot verifier's static `providerCallsMade:0` field is not post-dispatch accounting. Confirm no additional trial, automatic retry, or paid fallback occurred. Preserve the existing valid passes and leave all other package campaigns untouched.
