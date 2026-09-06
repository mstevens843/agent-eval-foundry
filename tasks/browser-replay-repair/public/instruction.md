# Repair the recorded workflow player

The operations team records form workflows, then replays them after UI releases.
The application starts and its basic tests pass, but production playback does not
reliably preserve the recorded intent. Repair the service under `src/` and its
`entry.mjs` entry point. Preserve the public interface and satisfy `SEMANTICS.md`.

Run `node --test test/*.test.mjs` for useful local examples. Extend your checks as
needed. The immutable driver runs real Chromium; it supplies the `api` passed to
`subject.run(view, api)`. You may restructure the implementation and journal.
No model calls are needed at replay time. Do not edit the driver or contract.

This is a new professional package, not the historical synthetic replay task.
