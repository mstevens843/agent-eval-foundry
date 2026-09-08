# Diagnostic transport contract

next({}) returns {channel,bytes} (base64 bytes) or null. Chunks from channels interleave.
Within a channel their order is stable; a UTF-8 code point, JSON record, CRLF or newline
may span chunks. The concatenation in each channel is valid UTF-8 newline-delimited JSON.
LF and CRLF delimit records; blank lines are ignored. A final complete JSON record need
not have a trailing newline. There is no partial malformed JSON record.
Channel identity is transport identity, not request or attempt identity.

Records have request (exact string), attempt (integer 1–4), and kind:
- start: {request,attempt,kind:"start"}
- chunk: {request,attempt,kind:"chunk",seq,value}; seq is a nonnegative integer, value text.
- finish: {request,attempt,kind:"finish",next,status,code,retryable}.
  status is ok or error. An error has a nonempty code and boolean retryable.
  An ok finish has code:null and retryable:false. next is the number of expected chunks.
Records for a logical attempt may appear in any order or on multiple channels.
Exact retransmissions are valid. A chunk identity is (request,attempt,seq), not seq alone.
Repeated identities have identical values. Multiple finish records for one attempt are
identical. Chunks never have seq >= finish.next when a finish exists. All records have
the documented fields; object property order is irrelevant.

view.requests is the complete requested ID list. Ignore records for other requests.
For each request select the greatest attempt number OBSERVED in any record, regardless
of whether it finished successfully. Earlier attempts cannot supply content or status.
Build data from that attempt's contiguous chunk prefix starting at seq zero, each once.
A terminal error remains status error and carries its exact {code,retryable}, even if
some chunks are absent; preserve the available contiguous prefix as data.
A terminal ok with every expected chunk is status ok, error:null; zero chunks is valid.
A terminal ok with a hole is status incomplete, error:{code:"GAP",retryable:true}.
No finish is status incomplete, error:{code:"TRUNCATED",retryable:true}.
No observed attempt is status incomplete, attempt:null, data:"",
error:{code:"MISSING",retryable:true}. Do not infer success from missing error text.

After exhausting input, publish exactly one row per requested ID:
{request,attempt,status,data,error} via record({row}). Output row order is irrelevant.
record persists bounded JSON and returns {stored:true}, or {error:"shape"} for malformed
outer shapes; it does not fix incorrect interpretation. No duplicate or foreign rows.
Input exhaustion and requested-population completion are obligations. A return value
is not a recorded result. Empty request lists require no records.

Bounds: 0–12 requests, up to 6 channels, 200 logical records, 400 chunks, <=32 chunks per
attempt, value strings <=256 UTF-8 bytes. Individual byte chunks may be empty.
All fields fit the joint wire guarantee below. The task is an original bounded protocol,
not an assertion that all external APIs use this envelope.

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

