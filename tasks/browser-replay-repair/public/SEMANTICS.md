# Workflow playback contract, version one

Submission directory bounds: at most 256 directories and 16 nested path components.

The input is a recorded form workflow: `{traceId, events, attempt, storage}`.
Events contain `{step, entity, field, value, selector}`. Step and trace identities
are stable over repeated attempts. Each event requires one form submission with
that entity, field and exact string value. All requested events must complete in
recorded order. Repeating the trace must not submit its effects again. Unrequested
forms and previously completed effects must remain untouched.

The driver runs a real DOM with input/button pairs, possible locator decoys,
remounts, enabled-state changes and confirmation dialogs. Recorded selectors are
location hints, not enduring entity identities. `aria-busy` is advisory. DOM
generation and actual input values are observable. A live handle may become
disconnected after a query; recoverable API results are not execution failures.
Render work advances only on `settle`, except a single possible remount immediately
after a query. Remounts may discard unsubmitted form values. After at most four
settle calls the current page is stable; opening a confirmation may add one more.
Settling does not itself submit anything. There are no wall-clock race deadlines.

All API methods take one object and return JSON:

- `query({step})`: candidate `{handle, entity, field, selector}` records, including
  plausible decoys. Only candidates for the current recorded step are returned.
- `observe({handle})`: `{connected, entity, field, generation, ready, value}`.
- `act({handle, kind:'fill', value})`: fills that form. `kind:'submit'` dispatches
  its real button click. Returns `{ok, pending}` or `{ok:false, code}`. A successful
  dispatch is not proof of a committed effect.
- `settle({})`: advances render work; returns `{stable}`.
- `dialog({})`: null or `{handle, entity, field, value, generation}` for the current
  confirmation. `confirm({handle})` clicks that actual dialog's confirmation.
- `receipts({})`: committed `{traceId, step, entity, field, value}` records for this
  trace, including earlier attempts. These records are durable.

Before each submission, observe its current connected, ready form and exact value
after the last fill/remount. Before confirmation, observe the dialog and ensure it
still represents the intended event. Never submit an action for the wrong entity
or value, even if a later action corrects it. Confirmations are required only when
present. Retrying a stale handle is allowed; repeating a committed effect is not.

Return `{traceId, steps:[{step, status:'completed'}]}` covering every event exactly
once on each attempt, in event order. Reports must agree with real effects by the end of that attempt.

The process may be interrupted after an API operation has completed externally
but before its response arrives. The same trace and attempt are then redelivered
to a fresh process; DOM state, effects and storage survive. At most one such
interruption occurs per trace. Local files are not interrupted during writes.

Bounds: one to four events, one to three attempts, finite noncyclic render work,
strings up to 256 characters. Node ESM, `entry.mjs` exports `subject` with `run`.
Public modules can use normal Node APIs and write under `view.storage`; code is
read-only while grading. At most 128 regular single-link files, 8 MiB total; no
symlinks or special files. Each process has 45 seconds and 4000 RPC requests;
each JSON frame is at most 64 KiB and each channel at most 16 MiB. The enclosing
container has 2 CPUs, 2 GiB RAM, 256 PIDs and no external network during replay.
These execution errors are invalid results, not semantic difficulty evidence.
