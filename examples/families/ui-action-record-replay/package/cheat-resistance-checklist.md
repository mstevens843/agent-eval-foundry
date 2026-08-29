# Cheat-resistance checklist

Three real bypasses were found in the source project's own verifier, two of them by writing the
exploit and running it rather than by inspection. Assume yours has some too.

- [ ] An implementation can serialize all work behind one global lock, making staleness unreachable while destroying the concurrency the task exists to exercise, so the grader needs an independent progress property.
- [ ] If the fencing token is supplied by the implementation, it can emit a constant and satisfy any check that only compares tokens against themselves.
- [ ] A grader asserting on retry counts rather than on committed effects rewards defensive retrying that never actually validates.
- [ ] An agent can report success without acting, so the grader must read the application's own data layer rather than the agent's account of what it did.
- [ ] If the fixture and the live surface come from the same generator, an agent can overfit to the generator instead of to semantic identity.
- [ ] Grading on screenshots invites pixel matching, which a no-op passes whenever the initial and final screens are similar.
- [ ] An implementation can vendor the entire environment into the artifact, passing a fresh-container check while defeating the property being measured, so the grader needs a size or declaration constraint alongside it.
- [ ] Grading on 'the build succeeded' rewards a build that does nothing, so it must be paired with a functional check executed inside the fresh container.
- [ ] If the fresh container is derived from the authoring image, the check is circular and passes unconditionally.

## Structural requirements

- [ ] Ground truth lives in a process the implementation under test cannot reach.
- [ ] The grading process never imports the implementation's code.
- [ ] Scenario inputs are regenerated from the seed, not taken from the implementation's own report.
- [ ] A deliberately empty run (no external calls at all) scores zero.
- [ ] An implementation that rebinds or monkeypatches the ground-truth accessor scores zero, and
      fails identically to the plain no-op so the tampering is provably inert.
- [ ] The reward channel is writable only by the grader.
