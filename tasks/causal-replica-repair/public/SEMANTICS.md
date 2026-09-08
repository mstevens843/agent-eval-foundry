# Causal document snapshots
A document state is {context:{site:nonnegativeInteger},values:[{site,n,payload}]}.
(site,n) is a unique edit identity, n>=1. Its payload is immutable. A context entry records
that this replica has observed all edit identities at that site through that number.
Missing entries mean zero. Every stored value is observed by its own context.
An observed identity absent from values was removed (including by a later edit). Thus an
absent value is not necessarily an absent observation. Concurrent surviving identities
remain separate even if payloads happen to match.
For the snapshots participating in one reconciliation, an identity survives exactly if
it occurs somewhere AND every participating snapshot either contains it or has NOT
observed it. Result context is the componentwise maximum, including sites with no live
values. Preserve all surviving identities and their exact payloads. Order of values and
object keys is immaterial; zero clock entries may be omitted.
view.replicas lists distinct replica IDs; view.documents lists scoped document IDs.
api.read({replica}) returns {documents:{id:state}} including unrelated documents.
A missing document is empty context/values. api.replace({replica,document,state}) writes
one document, returning {stored:true}. Every scoped document must be reconciled onto
every replica, including an all-deleted document. Unrelated documents cannot be written.
Reads and writes are synchronous, successful and bounded. Capture participating snapshots
before changing them; no concurrent external updates happen within an invocation.
Multiple invocations may follow with new offline observations; they use the same API and
must converge again. At most 5 replicas, 12 documents, 100 values per invocation.
Return diagnostics freely; only independently collected writes and resulting state count.
# Execution envelope

The submitted program has 45 seconds per invocation and up to 4000 API operations.
These are generous execution limits, not the human repair time budget. The public
API and hidden data obey the bounds below; no delay or starvation is used for hardness.
