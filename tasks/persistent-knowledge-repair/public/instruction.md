# Repair the durable knowledge consumer

The support export service stores source revisions and derived summaries between
jobs. Its ordinary ingestion tests pass, but restarted jobs can publish an outdated
or incorrectly attributed value. Repair `src/` and `entry.mjs` so legitimate
exports complete and restricted material does not acquire authority through storage
or derivation. `SEMANTICS.md` is normative. Run `node --test test/*.test.mjs`.

Use the existing serialization, revision, derivation, policy and publication layers
or replace them. Grading restarts Node between jobs and preserves only the writable
directory named by `view.storage`. No inference about the trust of a string is
required: authoritative metadata and grant versions are explicit task data.
