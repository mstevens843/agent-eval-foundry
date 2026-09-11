# Five successor contracts — September 10, 2026

Implementation plan, recorded before task edits. These are new business contracts,
not regrades or alleged defects in the successful Trial 2 submissions. No model
trials, external messages, commits or pushes are authorized by this work.

1. Verify the maintained sources against frozen Trial 2 exports; record preservation
   hashes for historical exports, submissions and the five successful finalists.
2. Implement package-local authorities, empty public interfaces, complete private
   services and validators, legal alternatives and meaningful negative controls.
3. Validate affected packages, execution/transport bounds and new semantics; build
   reproducible Foundry and native Harbor exports in a fresh staging tree. Run native
   static checks and oracle/nop jobs, then affected regression/lint/type checks.
4. Publish actual evidence, full digests, a consolidated report and append-only
   engineering updates to the five original analyses. Comprehensive adversarial
   grading review and new model trials follow independently.

## Revised contract decisions

| Task | New contract and correctness boundary |
| --- | --- |
| Workflow authority | Admission creates a pending authorization, without an effect. Dispatch is conditional on the current policy revision and the admitted revision; a stale authorization can be superseded. Authority must hold at admission and at dispatch. External operation identity is the job ID; pending/committed outcome observation is durable and bounded. Denials and completed effects are terminal; delivery completion is separate. Multiple valid paths and arbitrarily chosen valid paths are legal. |
| Delegated budget | Ordered reserve/capture/release requests use immutable request and reservation identities. Allowance is lifetime captured credits plus all outstanding reserved remainder across versions. Capture converts a hold into spending without freeing allowance; release frees only the named reservation's remainder. New holds require current authority; settlement of existing holds survives version changes/revocation. Revision-aware decisions, raw reservation/settlement records and bounded pending outcomes make recovery attainable. |
| Recurring calendar | Versioned source records arrive in duplicate/out-of-order deliveries and merge by per-record revision, including tombstones. Persistent materialization and bookings publish together under a generation compare-and-swap. A publication window selects original recurrence coordinates; moves preserve identity. Retroactive updates replace stale owned rows while preserving external bookings. Full recomputation and different staging strategies are valid. |
| Route policy | Source calls/returns migrate into first-match flat rules over original input regions and community predicates. Each terminal rule supplies an accumulated attribute transformation. Target has no calls or mutable intermediate matching. The scoped preference change applies only to originally accepted routes. Capacity is a public deployment limit and every generated instance must have a reference compilation within it. |
| Browser replay | A public local application and replay/debug bridge expose the same DOM and server protocol used by evaluation. Navigation/session renewal, competing dialogs, remounts and delayed receipts are explicit. Stable operation identity is trace plus step, including repeated entity/field/value tuples. Atomic UI preconditions and idempotent server operations replace the old prescribed observe-after-fill sequence. |

The implementation may choose smaller coherent details where necessary, documenting
them in the final report. Existing recurrence anchoring, cancellation, gap/fold and
elapsed-duration rules remain. Reasons remain diagnostic. Helpers, recomputation,
self-testing and alternative recovery strategies remain permitted. Solver internet
access stays available; verifier-only expected results stay outside author images.

Build and evidence root: `.local/next-five-successors-2026-09-10/`.
Historical roots dated September 9 and frozen campaign runtimes are read-only inputs.
