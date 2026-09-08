# Reconciliation contract
## Sources and population
view contains {tenant,from,to,storage}; timestamps are integer minutes, with from < to.
fetch({table,cursor}) returns {rows,next}; table is customers, accounts, usage or credits.
Start each table with cursor:null, continue until next:null, including through empty
pages. Pages may interleave tenants, arrive in arbitrary row order and duplicate exact
rows. A cursor is opaque and table-specific. Invalid cursors/tables return {error:"cursor"}.
Read-only sources are stable for the job; all necessary facts are available.
Customers are uniquely identified by (tenant,id), with name and active fields.
Accounts are uniquely identified by (tenant,id), with customerId and price:{n,d}.
They map to exactly one existing customer in that tenant. n/d is microcents per
microsecond of billable usage, n nonnegative and d positive integer strings.
Exactly one row is required for each active customer in view.tenant, including customers
with no usage/credits. Inactive/foreign customers must not appear.

## Metering and credits
Usage records have {tenant,id,revision,accountId,at,quantity,unit,state}. Select the
greatest revision for each (tenant,id) before applying any other filter. Exact repeated
rows are duplicates, not new work; two distinct rows never tie at the same revision.
state is posted or void. Only posted records in [from,to), belonging to an account
mapped to a required customer, contribute. A revision can change time, account or state.
quantity is a nonnegative decimal string with at most three digits after the decimal.
unit is ms, s or min: convert exactly to microseconds (1000, 1000000, 60000000 per unit).
Credits are a distinct fact population: {tenant,id,revision,customerId,at,microcents,state}.
Select each credit's latest revision independently with the same scope/time/state rules.
microcents is a nonnegative integer string. Credits are subtracted once each, never
multiplied by the count of usage rows or accounts.

## Rows and arithmetic
record({row}) records one JSON row and returns {stored:true}; malformed bounded JSON
returns {error:"row"}. Each required row contains exactly
{customerId,name,usageUs,chargeMicrocents,creditMicrocents,balanceMicrocents,usageIds,creditIds}.
Amounts and usageUs are canonical signed integer strings (zero is "0").
Compute charge as the sum of usageUs * account.price.n/account.price.d over all
qualifying usage for this customer, THEN round once to the nearest integer with exact
halfway ties to even. Do not round each event/account separately. Credits are integer
sums; balance is rounded charge minus credits and can be negative.
usageIds and creditIds list contributing logical IDs, each once, sorted in JS string
code-unit order. Output row order is irrelevant. Preserve each customer's catalog name.
No extra or duplicate rows; submitting a report object without record calls does no work.
Recoverable API errors may be retried. All operations are async and take one object.

## Bounds
0–12 customers/tenant, up to 3 tenants, 30 accounts, 100 logical usage records and
50 logical credits, revisions 1–8, pages 0–20 rows, 300 pages/table maximum.
Quantities may be as large as 1000000000000; price numerator/denominator at most 1000000.
Use exact arithmetic where needed. IDs are case-sensitive opaque strings; they may
repeat across tenants or tables, never within a compound identity at the same revision.
Node 24 and built-ins available offline. 128 regular source files/8 MiB/depth16 maximum.
No network, external business conventions or hidden identity mapping is required.
The provided storage directory is writable; private grader files are not inputs.

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
