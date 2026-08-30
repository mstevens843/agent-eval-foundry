# Clean-Room Human Review Packet

Use this folder for one human attempt against one challenge package hash.

Allowed:

- Read only the public challenge package: `README.md`, `SPEC.md`, `types.ts`, `MANIFEST.json`,
  `starter/`, and `examples/`.
- Record start time, end time, elapsed time, questions, ambiguity findings, notes, transcript, and
  verifier output.
- Ask clarifying questions only if the answer can be quoted from the public package.

Forbidden for counted evidence:

- Do not read `src/families/*/reference.ts`, `verify.ts`, `mutants.ts`, scenario generators,
  hidden scenarios, answer matrices, verifier source, preserved agent submissions, or generated
  reports before submitting.
- Do not use private hints, author memory, or answers that are not in the public package.
- Do not count an author or collaborator solve as clean-room evidence.
- Do not count a solve if the package hash reviewed differs from the package hash graded.

Workflow:

1. Copy this folder to `human-reviews/<review-id>/`.
2. Fill `metadata.json` before opening the package, including `reviewedChallengeHash`.
3. Write notes in `notes.md` and transcript in `transcript.md`.
4. Record any questions in `questions.md` and ambiguity findings in `ambiguity.md`.
5. Put the submitted files under `submission/`.
6. Run the verifier through the normal import/grading path and preserve output as
   `verifier-output.json`.
7. Set `countsAsCleanRoomSolve: true` only when every clean-room condition is satisfied and the
   verifier passed against the current hash.

A contaminated, assisted or timed-out attempt should still be preserved. It just does not count.
