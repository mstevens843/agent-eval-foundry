# What belongs in Git, and when

Important work becomes reviewable as it is completed, not only after a benchmark win. Source, tests, useful negative results, corrections and design decisions are deliverables. Scratch conversations and runtime debris are not.

| Artifact | Maintained location | Publication rule |
| --- | --- | --- |
| Task service, public contract, private verifier/reference/controls | `tasks/<id>/` | Track after review and checks; label unmeasured or blocked status honestly |
| Assembly, execution and analysis infrastructure | `src/`, `scripts/`, `test/` | Track implementation with regression tests |
| Candidate rationale and scenario selection | `docs/`, `data/` | Preserve sources, uncertainty and exposure; avoid machine-specific paths |
| Trial analysis and vetted result fields | `reports/screening/` | Verify frozen evidence; preserve exclusions and corrections |
| Raw captures, credentials, private keys, runtime/browser archives and workspaces | `.local/` or credential store | Keep out of Git; share separately only after review |
| Explicitly private research and agent handoff prompts | Existing exact ignore rules | Remain private unless the owner deliberately changes that decision |

Private grading materials are private **from solving agents**, not necessarily repository reviewers. The verifier and reference can be reviewed in Git; an executing agent only receives the approved public assembly. A public repository itself can contaminate future benchmarks, so choose repository visibility and task-release policy deliberately before pushing unpublished challenges publicly.

## Promotion procedure

1. Identify source and base version. Reconcile overlapping snapshots instead of moving whole trees over each other. Preserve original evidence.
2. Bring over implementation, tests and applicable construction records. An author's green report is not sufficient assurance.
3. Publish an allowlist of result fields and check manifest-listed files against hashes. Exclude credentials, machine paths and private reasoning transcripts.
4. Run merged-source checks; label failed or unavailable runtime coverage incomplete. New source produces new package/execution identities.
5. Link a readable status page from README. Distinguish built, locally validated, screened, reviewed and officially qualified.
6. Review tracked changes, new files and the secret scan. The owner stages, commits and pushes deliberately; moving files or making a local commit does not update a remote repository.

No blanket `.local/` unignore, forced add or archive dump is needed. Hashes identify restricted raw artifacts but do not by themselves make a historical trial independently reproducible. The September 8 publication follows this boundary: finished source and edited screening records have maintained paths; research and implementation prompts remain ignored as requested.
