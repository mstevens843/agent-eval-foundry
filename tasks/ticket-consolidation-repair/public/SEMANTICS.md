# Ticket migration contract
view contains tenants (allowed tenant IDs), team (target team name) and marker.
api.page({cursor:null|string}) reads a frozen snapshot population and returns
{status:"OK",rows,next:null|string} or {status:"EXPIRED",resume:string}.
Cursors are opaque. EXPIRED.resume is a fresh continuation at the same unread position.
An empty page with non-null next is valid. Pages can overlap: identity is (tenant,id),
not id alone. Snapshot rows have tenant,id,status,revision,owner,labels,note.
The migration population is exactly snapshot rows whose tenant is allowed and status is
"open". Closed and unrelated-tenant tickets must not be written. Directory resolution is
tenant-specific: api.resolve({tenant,team}) returns {owner:string}.
For every selected ticket, set owner to its tenant's resolved target and add view.marker
to its labels, preserving all other labels and every other field. At completion the marker
occurs once (labels are sets). api.read({tenant,id}) returns the current row.
api.batch({updates:[{tenant,id,revision,patch:{owner,labels}}]}) returns
{results:[{tenant,id,status:"APPLIED"|"CONFLICT"|"MISSING"}]}; results may be reordered.
Each update is independent; an HTTP/batch success is not all-row success. A stale revision
causes CONFLICT with no effect. Refresh and settle conflicts. A selected row is never
deleted; concurrent edits affect labels and note, not owner/status. At most two conflicts
per selected row; after that a current-revision patch succeeds. Do not overwrite notes,
status, revision or other columns. Already-complete rows need no write.
All operations are synchronous and finish. At most 100 rows, 30 pages and 4 tenants.
Returning a claim does not migrate anything; grader reads its own backing state and log.
Repeated equivalent updates are allowed but do not justify any collateral field changes.
# Execution envelope

The submitted program has 45 seconds per invocation and up to 4000 API operations.
These are generous execution limits, not the human repair time budget. The public
API and hidden data obey the bounds below; no delay or starvation is used for hardness.
