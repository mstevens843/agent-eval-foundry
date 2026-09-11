# Persistent calendar synchronization — successor 3.0
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


## Source updates and persistent generations
The view is {deliveryId,updates,storage}. Each update is {kind,id,revision,value};
kind is series, zone, changes or window. A series value has the schema above and
id=uid; zone id matches its value; changes value is the ordered array for that
series uid. The sole window record has id publication and value {from,through},
inclusive civil coordinates. It selects ORIGINAL rid, not moved display time.
value:null is a tombstone; all records, including tombstones, must be retained.
For each (kind,id), highest revision wins. Equal revisions have identical contents.
Old/duplicate records have no effect. A tombstone can be superseded by a higher
revision. Deliveries are valid; live series always reference available zones,
and the complete merged source contains one live publication window.
A replacement changes record replaces its whole ordered change list.
Amendments can alter already materialized ranges; they are not append-only.

read({}) returns persistent {generation,records,events,bookings,externalBookings}.
Initially records/events are empty; bookings contains unrelated external bookings.
Merge the delivered updates with records by revision, then publish the materialization
of the resulting source and original-rid window. Source records, events and bookings
must describe one consistent generation. Every publication, not just the final one,
must be correct. Full recomputation is allowed. Event and attendee order is irrelevant.
Remove every stale task-owned event/booking; retain cancelled/skipped rows within the
window and preserve ALL externalBookings exactly. External keys never overlap owned
keys. Active rows with a non-null room have booking
{key:JSON.stringify([uid,rid]),room,startUTC,endUTC}. No duplicate identities.

publish({baseGeneration,records,events,bookings}) atomically replaces the materialized
generation if baseGeneration equals the current generation, returning
{stored:true,generation:newGeneration}; otherwise {stale:true} leaves it untouched.
It checks shape/fence only, not semantic correctness. A malformed bounded shape
returns {error:"shape"}; corrected retries are legal. Correct repeated publications
are permitted. A concurrent external booking may arrive once before a delivery's
first publication; this advances generation and causes that old fence to fail.
It does not modify source records. Re-read to discover authoritative external rows.

ack({deliveryId,generation}) acknowledges this delivery against the current
consistent generation. It returns {stored:true}, or {error:"request"} if identifiers
do not match; repeated ack is idempotent. Duplicate/old updates still need ack.
Each delivery runs in a fresh process, and may also be interrupted after publish
or ack commits but before its response arrives. It is redelivered with persistent
state retained. Any persistence/reconciliation strategy is allowed.

## Event schema and bounds
Events contain exactly {uid,rid,startLocal,zone,startUTC,endUTC,status,room,attendees}.
status is active, cancelled or skipped. Cancelled rows retain scheduled UTC fields
(or null for a gap). Duration is omitted from published rows.
0–6 series spanning at most28 days each, interval1–4, at most12 exceptions/series,
12 changes,6 zones and4 transitions/zone. Offsets -720..840; gaps/folds <=120 minutes;
durations1..1440; <=8 attendees/series and20 external bookings. <=8 deliveries,
32 merged source records,200 events,220 bookings. Values are valid and IDs exact.
Node 24 built-ins; source128 regular files/8 MiB/depth16; storage writable.
45 seconds/process,4000 protocol frames,64 KiB/frame,16 MiB/channel. The joint
48 KiB bound applies to all supplied views/responses and compact correct publications.
Authoring internet is available; replay uses supplied zones and needs no network.
