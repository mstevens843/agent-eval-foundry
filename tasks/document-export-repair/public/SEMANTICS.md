# Support export contract
## Inputs and useful work
The view contains ticketIds, policy and storage. Each ticket ID is unique. Read all
requested tickets through read({id}) and publish exactly one valid export for each
using publish({id, data}), where data is base64 of UTF-8 JSON. No other ticket may be
published. A submitted return value is diagnostic only. An empty ticket list is valid.
read returns {ticket}; an unknown ID returns {error:"not-found"}. publish returns
{stored:true} for a bounded base64 payload, otherwise {error:"payload"}. Calls may be
serialized or parallel. Failed calls may be recovered; successful duplicates are not
allowed. All calls take one object and are asynchronous.

## Document structure
A message is {id, subject, headers:[{name,value}], tags:string[], related:string[],
parts:[Part]}. A Part is {id,name,media,encoding,data,links:string[]}.
media is text/plain, application/json, message/support+json or application/octet-stream.
encoding is utf8, base64 or gzip-base64. data decodes accordingly; text is UTF-8,
JSON is any JSON value, and message/support+json is another message of this shape.
Binary parts use base64 or gzip-base64 and represent arbitrary bytes.
Part IDs, message IDs, header names, tags, related and links are structural metadata:
preserve them exactly, including order. They contain no policy literals.
Preserve part order, media, encoding and every node, even empty ones.
You may change JSON whitespace/key order or gzip metadata. Decoded content, not
serialization byte choices, determines correctness.

## Policy
policy.literals is a nonempty array of distinct, nonempty strings. In every subject,
header value, part name, text part and JSON string value, replace literal occurrences
with [REDACTED]. At each input position consume the longest matching literal; matches
are case-sensitive and non-overlapping, scanning the ORIGINAL input left to right.
Do not interpret literals as regular expressions or reprocess replacement text.
policy.fields lists JSON object keys whose string value must be entirely replaced
with [REDACTED]. This rule applies at any JSON nesting depth, even when the value
does not contain a literal. Non-string values under these keys are traversed normally.
Object keys are preserved. JSON strings outside these fields receive literal filtering.
Nested messages follow the message rules, not a blanket walk over structural IDs.
Binary content is copied without redaction. A part's name is filtered regardless of media.
All other characters, values, fields and relationships must remain unchanged.
Filtering applies to decoded values before encoding output.

## Bounds and environment
0–8 tickets; at most 40 parts/message, message nesting depth 4 and JSON depth 8 within each part, 2000
JSON leaves/ticket, at most 256 KiB decoded content/ticket, 16 literals (1–80 characters)
and 8 field names. JSON has no duplicate object keys; inputs are valid. No external
lookup, OCR, file-format guessing or interpretation of unstated private information
is required. Runtime Node 24; built-in modules are available offline. Any correct
architecture is allowed. 128 regular source files, 8 MiB total, depth 16; no lingering
processes. storage is the writable job directory. Private grading assets are not inputs.

## Execution envelope
The submitted service has 45 seconds per invocation. This is an execution limit,
not the human or agent repair-time budget. The transport allows 4000 protocol frames
including begin, report and finish (at most 3997 API calls), 64 KiB UTF-8 JSON per
request/response frame, and 16 MiB total per channel and for combined diagnostics.
All provided views/responses and compact correct API request payloads fit within
48 KiB UTF-8 JSON, in addition to the domain bounds above. This includes base64
wrappers where used; it is a joint size guarantee, not an assumption that every
independent maximum is exercised simultaneously. Keep submitted serialization within
the 64 KiB transport envelope. Correct compact output is always attainable.
These generous limits bound execution rather than create timeout-only difficulty.
