# Historical capacity contract
All intervals are integer, half-open [from,to), with -32 <= from < to <= 64.
Each record has series, key, revision (positive integer), knownAt, from, to and value.
value is a nonnegative decimal integer string or null (retraction). Values may exceed
JavaScript's exact Number range. Records for a (series,key) have unique revisions and
strictly increasing knownAt with revision. A revision replaces that key's ENTIRE previous
record, including interval; it is not merely an overlapping patch. Null removes the key.
For each query, first select the greatest revision of each matching-series key known at
or before query.knownAt. Integrate the sum of surviving key values over query [from,to).
Keys are additive even where their intervals overlap. Return the exact decimal integer
integral as a canonical decimal integer string (no leading zero except "0"), including
zero, for EVERY requested query, once each. Other series are unrelated.
No inference from arrival order or page boundaries is valid.
API (synchronous): api.fetch({cursor:null|string}) returns {rows,next:null|string};
next cursors are opaque. Exhaust all pages. api.record({id,total}) persists a report row
and returns {stored:true}. view.queries contains unique query IDs and the query fields.
At most 200 records, 20 queries and 50 pages; all fetches finish. No timeouts are part of
the task. Duplicate/extra report rows are invalid; merely returning a report does not
persist it. Return any diagnostic summary after writing the reports.
# Execution envelope

The submitted program has 45 seconds per invocation and up to 4000 API operations.
These are generous execution limits, not the human repair time budget. The public
API and hidden data obey the bounds below; no delay or starvation is used for hardness.
