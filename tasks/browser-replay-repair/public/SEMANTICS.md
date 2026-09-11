# Replay against Meridian Records — successor 3.0
The supplied app/ directory is a working local application, its server protocol and
Chromium bridge. Run node dev.mjs [port] to inspect it and node replay.mjs to exercise
your entry.mjs against fixture.json. Playwright is preinstalled in the native author
image. npm install uses the pinned public package if developing elsewhere.
The demo fixtures contain application facts, not grading answers. /debug shows
actual server operations, effects, sessions and actions. app/driver.mjs implements
the same bridge used during evaluation. Public application copies are byte-identical
to verifier application code; private recordings and expected outcomes are separate.

## Recorded intent and operation identity
view is {traceId,events,attempt,storage}. Events are {step,entity,field,value,selector,
path}, with unique integer steps in recorded order. path is a /records/ path.
The business operation ID is JSON.stringify([traceId,step]). Distinct steps can have
identical entity/field/value and selectors; they are still distinct operations.
Complete all effects once in recorded order, preserving unrelated work. Independent
delivery and process restart must not add effects. Selectors are hints, not identity.
The application deduplicates by operation ID and exact payload. Repeating that same
operation is legal; using its key with a different payload returns CONFLICT.

## Browser and server interface
All APIs are asynchronous and take one object. Handles belong to a DOM mount and
may become disconnected after query or fill; navigation invalidates old handles.
Query lists ALL forms on the current page, including decoys and other steps.
There is no step-filtered search. Sessions can expire when entering a different page.
location({}) returns {path,authenticated,session}; navigate({path}) changes pages;
renew({}) renews the session and remounts the current page.
query({}) returns form records with handle plus the fields below.
observe({handle}) returns {connected,operationId,entity,field,generation,ready,value,
session}, or {connected:false}. fill({handle,value}) returns {ok:true,state} (the
post-fill form state), or {ok:false,code}. A later remount may invalidate that state.

submit({handle,expected}) uses a REAL conditional UI precondition: expected must
match the current connected, ready form's operationId,entity,field,value,generation,
session. The bridge checks and dispatches in one browser JS turn, returning
{ok:true,pending:true} or {ok:false,code:"STALE"|"SESSION"|"CONFLICT"|...}.
No specific observe-after-fill call sequence is required. A returned fill state or
other current observation is equally valid evidence for the conditional request.
Only intended entity/field/value/operation combinations may be submitted, including
when a later correction could repair the final visible value.

dialogs({}) lists ALL visible confirmations {id,operationId,entity,field,value,
session,stale?}. Stale/competing dialogs may share entity/field/value with another
step. confirm({id,operationId,session}) conditionally clicks that dialog; success
is {ok:true,pending:true}, stale/session/conflict responses are recoverable.
Required confirmations bind to operation ID; a dialog from another step cannot
authorize this one. Repeated same-operation confirmation is idempotent.

operation({operationId}) returns {status:"ABSENT"}, {status:"PENDING"}, or
{status:"COMMITTED",receipt:{operationId,entity,field,value}}. PENDING spans queued
work and already committed work whose receipt is not visible. It is not absence.
settle({}) advances deterministic background work and remounts the page, returning
{stable}. An admitted operation commits by the first settle; its receipt is visible
by the third. Form readiness stabilizes within two settles. UI success/navigation
may precede receipt visibility. There are no wall-clock races or sleeps to guess.
Error results permit recovery; successful dispatch alone is not proof of completion.

Return {traceId,steps:[{step,status:"completed"}]} once per event, in event order,
on every completed attempt. Reports must agree with real effects at that boundary.
A process may be killed after an operation completes before its response arrives;
the same attempt is redelivered with DOM, server state and storage retained.
Independent later deliveries may start on another page; server identity remains.
At most one interruption per trace. No disk/journal strategy is prescribed.

## Bounds
1–4 events,1–3 attempts, <=4 intended forms and4 decoys/page, <=8 dialogs,
strings<=256 characters. Node24 built-ins;128 regular files/8 MiB/depth16, storage
writable and code read-only.45 seconds/process,4000 protocol frames,64 KiB/frame,
16 MiB/channel. Supplied views and compact correct calls fit48 KiB. Authoring has
internet access; deterministic local browser evaluation requires no outside network.
