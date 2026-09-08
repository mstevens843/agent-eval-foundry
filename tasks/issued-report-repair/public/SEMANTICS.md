# Issued-report contract

The service owns an immutable publication history and delivery receipts. Source readings
are {id,version,value}; value is an integer or null for withdrawn. New versions replace
the entire reading, and reading versions strictly increase. A definition is
{id,op:"sum"|"difference",inputs:[{kind:"reading"|"report",id}]}.
Definitions form a complete acyclic graph; inputs are ordered, and repeated inputs count
repeatedly. difference has exactly two inputs; sum has one or more.
A report payload is {status:"available"|"unavailable",value,sources}.
sources is the ordered list {kind,id,version} of direct inputs used. An available value
is the sum or ordered difference of available input values. If ANY input is unavailable,
status is unavailable and value:null, but all direct source versions still appear.
A reading is unavailable exactly when value:null. A report's direct source version is
that input report's current publication version, not an underlying reading's version.

next({}) returns {id,requests:[{report,recipient}],queries:[{id,report,version}]} or null.
Before returning a step, the source service applies that step's new reading versions.
snapshot({}) returns {readings,definitions,history,receipts}; history records are
{report,version,supersedes,payload}, receipts are {report,version,recipient,kind,payload}.
All existing history and receipts are legitimate and complete at run entry.

Before next is called again, reconcile ALL definitions in dependency order:
- If a report has no prior publication, issue version 1 with supersedes:null.
- If its newly computed payload differs in status, value OR ordered source versions
  from its latest issued payload, issue next version (previous+1), supersedes:previous.
- If the payload is identical, issue no new version.
Use publish({record}) to append the immutable version. Existing versions cannot be
changed, renumbered, removed or reused. Multiple new versions of one report in a step
are unnecessary and invalid. Independent reports may be processed in any order.
A source-version change can require an amendment even when the numerical value is unchanged.

For every new version, deliver it to EVERY recipient who previously received any version
of that report. Also satisfy all step.requests with the latest version. Deliver at most
once for each (report,version,recipient), including across steps. kind is correction if
that recipient has any older receipt for the report, otherwise initial.
Use deliver({report,version,recipient,kind}); the host records the actual issued payload
that this version names. A recipient of another report is not automatically in scope.
There are no implicit subscriptions, inaccessible recipients, or unknown delivery outcomes.

For every query, answer({id,payload}) with that EXACT historical version's issued payload,
never a recomputation against current readings. Query versions always exist before the
step starts. One answer per query and no extra answers.

publish/answer accept bounded outer shapes and return {stored:true}, otherwise
{error:"shape"}. Wrong version chains or content are captured, not fixed by the host.
deliver returns {stored:true} when the named version exists; otherwise {error:"version"}
without a receipt. next advances even when required work was omitted.
All expected changes, deliveries and answers precede the next step. Return values alone
do not perform publication or delivery. Ordering among independent outputs is irrelevant.

Bounds: 1–8 readings, 1–6 definitions, dependency depth <=4, <=4 inputs/definition,
1–5 steps, up to 8 recipients, 12 requests and 12 queries per run, reading values
-10000–10000, versions 1–30. IDs are exact strings. All graphs/references are valid.
This task concerns forward amendments and issued artifacts, not medical interpretation.

## Execution environment

Node 24 and built-ins are available offline during grading. Entry point: entry.mjs
exports subject.run(view, api). All API methods are asynchronous and take one object.
Submitted return values are diagnostic only; required outputs must be published.
Any correct algorithm or module layout is allowed. The workspace may contain at most
128 regular files, 8 MiB total and depth 16; no lingering subprocesses.
There are 45 seconds per service invocation, not per human/agent repair. Transport:
4000 frames including begin/report/finish (3997 API calls maximum), 64 KiB UTF-8 JSON
per frame, 16 MiB per channel and combined diagnostics. Supplied views/responses and
compact correct request payloads fit 48 KiB jointly with the domain bounds; independent
maxima need not occur together. No timeout-only difficulty or unknown API is intended.

