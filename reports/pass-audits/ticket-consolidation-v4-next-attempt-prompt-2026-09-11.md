Work in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

Read `reports/pass-audits/ticket-consolidation-attempt-six-2026-09-11.md` and its accompanying JSON. Ticket Consolidation physical attempts 4, 5, and 6 are audited benchmark false passes and count as null. Attempt 6's service passed, but its required checker rejected a valid two-stage migration, and the previous bank failed to catch that. Keep all original reward-1 evidence and ledgers unchanged. There are three eligible historical Claude failures and six total historical provider calls. Keep historical package digests distinct from fresh results.

The corrected v2.0.4 package is validated and frozen at `.local/ticket-marker-correction-2026-09-11/build`, digest `6d8179c6d01c8bbd4def8e1537292b34325691c8320f321faa07bb2e65191729`. Verify it against that correction's `READY.json` and assurance receipt: 37 passing assurance checks, 34 checker candidates. Use only the new exclusively owned slot below. Do not regenerate or modify task bytes, the bank, frozen runtime, prepared slot, or old controllers. Do not expose audits, private controls, earlier submissions, or grader findings to the solver; use the standard runner's isolated public workspace and instructions.

You are authorized to run **one fresh Codex attempt, physical attempt 7**. A scored result would be eligible counted trial 4. The audited nulls are excluded from the six-counted-trial limit and provider allocations; this explicitly supersedes any generic wording that would treat their historical reward-1 records as clean passes. No model has been launched from this slot by the preparation work.

Using the established subscription credential-broker/login-shell context, first run:

```sh
node scripts/run-successor-trial-slot.mjs verify .local/ticket-consolidation-continuation-v4-2026-09-11/slots/attempt-7/slot.json
```

Require `verified:true`, `target:"codex"`, `trial:7`, and `dispatched:false`. Confirm no other Ticket Consolidation attempt is active. If this slot is already dispatched, monitor its existing record instead of launching again.

Then launch exactly once:

```sh
node scripts/run-successor-trial-slot.mjs run .local/ticket-consolidation-continuation-v4-2026-09-11/slots/attempt-7/slot.json --user-authorized-successor-slot
```

Subscription only, no paid API fallback, no automatic retries. Monitor until this attempt finishes, then stop and report; do not launch attempt 8. An infrastructure or unresolved-grading result is unscored. A recorded pass remains pending a separate false-pass audit. Do not declare a genuine pass merely from its candidate-bank score.

Inspect and verify actual `completion.json`, `capture.json`, `grade.json`, service case coverage, and required-checker details under:

`.local/ticket-consolidation-continuation-v4-2026-09-11/slots/attempt-7/real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1`

Report physical attempt and eligible counted-trial numbers separately; exact package digest; service and checker results; combined reward or unscored incident; evidence path; provider calls from dispatch/completion evidence; and confirmation that no additional trial, automatic retry, or paid fallback occurred. The generic verifier's `providerCallsMade:0` field is static and must not be used as post-dispatch accounting. Leave all other package campaigns untouched.
