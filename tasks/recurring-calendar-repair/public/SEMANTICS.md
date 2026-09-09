# Recurrence and reconciliation
## Time and recurrence
Civil strings use YYYY-MM-DDTHH:mm; dates use YYYY-MM-DD. Treat these as coordinates
in the named zone, never the process's timezone. UTC values are integer Unix minutes.
A zone has {id,initialOffset,transitions:[{at,offset}]}; offsets are minutes east of UTC.
Transitions are sorted; a transition's new offset applies at its exact UTC minute.
No zone information beyond these complete tables is needed.
A civil time can have zero, one or two UTC realizations. Choose the earlier UTC instant
when repeated; a nonexistent original recurrence is omitted. A moved occurrence that
lands in a gap remains as status skipped with startUTC/endUTC:null and no booking.
Duration is positive ELAPSED minutes from the chosen UTC start, not wall-clock subtraction.

A series has uid, start (civil), until (inclusive civil DATE), zone, duration, room,
attendees, rule, excluded, exceptions. rule is {frequency:"daily"|"weekly",interval,
weekdays}. Generate days from start's date through until, retaining start's time.
For daily, retain day distances divisible by interval. For weekly, weeks start on
start's date (not an ISO week boundary); retain floor(distance/7) divisible by interval
and days whose Gregorian weekday (Sunday=0) is in weekdays. Never generate before start.
Each generated civil time is the ORIGINAL recurrence ID rid. excluded is a list of
original rid strings to omit. The identity of an occurrence is (uid,rid) forever.

## Exceptions and requested changes
An exception names rid and may override start, zone, duration, room, attendees or
cancelled. It does not change rid. Apply it only to an existing non-excluded, realizable
original recurrence. Exceptions not naming such an occurrence have no effect.
Then apply changes in supplied order. Each names uid, rid, scope single or future,
and action cancel or move. Match by ORIGINAL rid: equality for single, rid >= boundary
for future. Never affect another uid. A cancel leaves a cancelled history record.
A move adds delta minutes to the current civil start; if zone or room is supplied,
replace that field. Moves targeting an already-cancelled occurrence leave its scheduled fields unchanged. Changing display time
or zone does not change rid. Missing targets are valid no-ops. Attendees and their
response values are preserved unless overridden by a source exception.

## Publication
Commit exactly once with commit({events,bookings}). Events contain exactly
{uid,rid,startLocal,zone,startUTC,endUTC,status,room,attendees}; status is active,
cancelled or skipped. Cancelled rows retain their scheduled startUTC/endUTC (or null
when their current civil start is nonexistent). All generated, non-excluded rows remain,
including cancelled/skipped ones. Sort order of events, bookings and attendees is
irrelevant; attendee identities and responses must match. An active occurrence with
a non-null room has exactly one booking
{key:JSON.stringify([uid,rid]),room,startUTC,endUTC}.
Preserve every externalBookings row exactly. These keys cannot overlap generated keys.
No extra or duplicate event/booking/attendee identities. No overbooking policy is
invented here: the request is to reconcile these records, not solve room allocation.
commit returns {stored:true} for bounded arrays, otherwise {error:"shape"}.
Failed calls can be corrected, but multiple successful commits violate the contract.
Return values alone are not publication. All APIs are asynchronous and take one object.

## Bounds
0–6 series, each spanning at most 28 days, intervals1–4, up to7 distinct weekdays,
12 exceptions/series, 12 changes, 6 zones with at most4 transitions/zone, offsets
between -720 and +840, durations1–1440, at most8 distinct attendees/series and
20 external bookings. Transition gaps/repeats are at most120 minutes. Inputs are valid.
Series UIDs are unique, and duplicate attendee IDs are absent in source lists.
Node 24/built-ins offline; use supplied zone data rather than the machine tzdb.
128 regular source files/8MiB/depth16, no lingering subprocesses. storage is writable.

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
