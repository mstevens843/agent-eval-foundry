# Findings

This is the source-backed learning record, not a list of task wins.

- `cases/<id>/000001.json`: immutable claim-level records and later numbered corrections.
- `transfers/<id>/000001.json`: exact-target, versioned infrastructure/invariant/hardness mappings with retained exposure history.
- `generated/`: ignored private readable views, never solver-package inputs.
- `durableoutbox/README.md`: earlier ignored author analysis, preserved unchanged; runtime uses primary records instead.

Open the corrected outbox with `pnpm package:local learning case durableoutbox-cc267` after building. Save the linked run views with `learning publish-case durableoutbox-cc267 .local/learning/outbox-01`.

The initial cases preserve six outbox zero rewards without asserting six fair capability failures, and the memory host-contract correction without calling a shared host defect a model weakness. The fifteen initial transfer mappings describe the five actual constructed package versions. None is proven target-model hardness or untouched held-out evidence.

See [the learning workflow](../docs/evidence-learning.md) for authorship, revision, review, privacy, evidence limits, selection and verification commands. Case JSON records are portable; generated absolute links should be regenerated in a supplied evidence checkout. Do not copy private findings into a solver workspace or task export.
