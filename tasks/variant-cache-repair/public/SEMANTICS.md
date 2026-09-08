# Bounded cache service
## Protocol and authority
This is an original bounded cache API, not a complete HTTP proxy. All operations are
async and take one object. next({}) yields {event} or {done:true}. Complete the current
event with deliver({response}) or acknowledge({}) before requesting the next.
A get event has {kind:"get",id,tier,path,headers,now}; tier is edge-a or edge-b, headers
have lowercase names and exact string values, path is an opaque exact cache key.
A purge has {kind:"purge",id,path,tiers,now}. Time is monotonic integer seconds.
origin({ifNoneMatch?}) requests the active get's path/headers and returns
{status:200|304,etag,body?,vary,maxAge,age,noStore}. A matching validator yields304
without body. Otherwise200 includes the complete UTF-8 body. There are no origin
errors or ambiguous effects. Tags are opaque; only equality has meaning.
No-store and private responses are represented by noStore:true.

## Stored entries and reuse
read({tier}) returns {entries}. write({tier,entries}) replaces that tier's entries.
There is one shield shared by both edges. All three tiers are empty at job start.
Entries have exactly
{path,headers,vary,etag,body,maxAge,age,storedAt,noStore}.
storedAt is when an origin response was received; age is that response's age.
Copying entries between tiers preserves their age and storedAt.
A stored representation matches a request if path matches and every header named by
vary has equal value (absent header means empty string). vary may be empty or ["*"];
a wildcard is never reusable. Current age = age + now - storedAt; fresh iff strictly
less than maxAge. noStore entries must not be stored or reused.
A get with headers["cache-control"] equal to "no-cache" requires an origin validation
during that get even if a matching cache entry is fresh.
Choose a fresh matching edge or shield entry when available to meet the product load
bound. If neither is fresh, an old matching entry may supply the validation tag.
A304 retains that entry's body but replaces response metadata (etag,vary,maxAge,age,
noStore), records now as storedAt and uses the current request headers for matching.
A200 supplies a new body. Never synthesize a body from an etag or a completion report.
Return deliver({response:{body,etag}}) exactly once/get.
Additional origin calls and different correct caching strategies are allowed within
the visible limits, and a newly fetched correct representation is always acceptable.

## Updates and purges
Store only representations obtained from an origin response or legitimate tier copy.
Use the latest response metadata after validation. A copy is not a new validation.
There is enough capacity: do not evict unrelated entries. When storing a representation,
replace prior entries for that path matching the CURRENT request according to their
old vary fields; keep other variants. A purge removes all representations for exactly
its path in exactly its named tiers. Preserve other paths and other tiers.
Acknowledge each purge once; return values from subject.run are only diagnostics.
The host records storage and delivery; it does not enforce these semantic rules for you.

## Errors, bounds and budget
Unknown tiers or malformed entries return {error:"shape"} without a write. Wrong event
operations return {error:"event"}; callers may recover. Advancing without completion
does not advance and returns {error:"unfinished"}. End requires all events completed.
view.limits declares maxOriginRequests and maxOriginBytes (UTF-8 body bytes of200s).
These product limits are graded from actual origin calls, not supplied counters.
Within this service's finite working set, indiscriminately bypassing/flushing the cache
does not meet its product requirement. HTTP itself does not require caching.
Up to30 events, 8 paths, 4 representation variants/path, 3 header names in vary, body
up to1024 UTF-8 bytes, maxAge0–120, age0–30, 40 entries/tier, 100 total origin calls
as an execution bound. No background requests or simultaneous active events.
Node 24/built-ins offline, 128 regular source files/8MiB/depth16. storage is writable.

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
