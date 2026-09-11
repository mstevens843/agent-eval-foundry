# Publish the latest records

Repair `entry.mjs`. Export `subject` with an async `run(view, api)` method.
The input is `view.records`. Publish exactly one row per distinct key, selecting
the greatest revision for that key, with `await api.publish({ rows })` exactly once.
Return any JSON object. Read `SEMANTICS.md` for the complete contract.

You may add local modules. The evaluator supplies the input and API; do not implement a replacement API.
