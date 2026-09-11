Work in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

Read `reports/pass-audits/ticket-consolidation-attempt-seven-2026-09-11.md` and its JSON disposition. Physical attempts 4–7 are audited benchmark false passes and count as null. Attempt 7's service passed, but its required checker wrongly rejected valid outer request metadata. Preserve every original reward-1 record, submission and ledger. There are three eligible historical Claude failures, zero eligible Codex outcomes and seven historical provider calls.

The correction is implemented and validated in v2.0.5, digest `186b34f818022cc0274c0fb684a665d5d86ffde2b146a1d0fb7076b6a712a3ed`, under `.local/ticket-request-schema-correction-protected-2026-09-11/`. Verify `READY.json` and the assurance receipt: 42 passing assurance checks and 39 checker candidates. Do not rebuild or modify the frozen correction, bank, runtime or prepared slots.

You are authorized to continue **Ticket Consolidation only**, sequentially, until its first recorded pass or six eligible counted outcomes. Three fresh Codex slots are already prepared under `.local/ticket-consolidation-continuation-v5-2026-09-11/`; inspect its `PREPARATION.json`. Physical attempts 8, 9 and 10 would be counted trials 4, 5 and 6. The four audited nulls are excluded from the counted-trial and provider limits; this explicitly supersedes generic slot wording that would treat their original reward-1 records as clean passes. Do not start any other task package.

Use the established subscription credential-broker/login-shell context. Before each dispatch, verify the slot and check the preceding actual records. Require the pinned digest, `target:"codex"`, matching physical attempt, `verified:true`, and `dispatched:false`. If already dispatched, monitor its existing record; never launch it again. Confirm no other Ticket Consolidation attempt is active.

Start physical attempt 8 exactly once:

```sh
node scripts/run-successor-trial-slot.mjs verify .local/ticket-consolidation-continuation-v5-2026-09-11/slots/attempt-8/slot.json
node scripts/run-successor-trial-slot.mjs run .local/ticket-consolidation-continuation-v5-2026-09-11/slots/attempt-8/slot.json --user-authorized-successor-slot
```

Monitor to completion and inspect `completion.json`, `capture.json`, `grade.json`, complete service case coverage and checker details in its own `real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1` directory. Require valid evidence and the pinned package identity before classifying any result. Do not use the verifier's static `providerCallsMade:0` field as post-dispatch accounting; count dispatch receipts and actual completion records.

- **Reward 1 with complete, valid grading:** stop immediately and report a recorded pass pending a separate false-pass audit. Do not claim universal correctness from 39/39, and do not launch the next slot.
- **Reward 0 with complete, valid grading:** count one clean failure and continue. After attempt 8 cleanly fails, use the same `verify` and `run` commands with `attempt-9/slot.json`. After both 8 and 9 cleanly fail, use `attempt-10/slot.json`. Never run these concurrently.
- **Infrastructure failure, incomplete execution, unresolved grading or conflicting evidence:** retain an unscored incident and stop. No automatic retry or replacement dispatch.

Stop after attempt 10 regardless of outcome. Never exceed six eligible counted outcomes or three Claude plus three Codex counted outcomes. Subscription credentials only; no paid API fallback. Keep audits, private controls, prior submissions and grader findings out of the solver's context; use the standard runner's isolated public workspace and instructions.

Write any continuation summary as a new artifact in this exclusively owned v5 directory, preserving all original and previous continuation evidence. Do not restart old controllers or write their slots/ledgers. Monitor until no provider process from your dispatch remains active.

Report each physical attempt and eligible counted-trial number separately, provider, exact package digest, service and checker results, reward or unscored incident, evidence path, total new provider calls, stop reason, and confirmation that no attempt followed a pass, no automatic retry or paid fallback occurred, and no other package was modified. Do not commit or push.
