# Meridian layer format v1

This small documented format borrows filesystem changeset concepts; it is NOT full OCI.
view contains release, descriptors in base-to-top order, initial (the active tree), storage.
Each descriptor is {url,digest,size,plainDigest}. The requested bytes are gzip-compressed
UTF8 JSON {entries:[...]}. digest is SHA256 of compressed bytes; size counts compressed
bytes; plainDigest is SHA256 of uncompressed bytes. api.cache({url}) returns null or
{bytes:base64}; a cache response has no freshness guarantee. api.fetch({url,digest})
returns {bytes:base64} or null. A layer is available if EITHER the cache or the origin
provides bytes satisfying all descriptor checks; neither source has precedence over a
verified copy from the other. Only when neither does is the release unavailable.
Never install uncommitted bytes. URLs can be reused across layers.
All committed, available layers are valid JSON.

A tree maps safe relative paths to {kind:"file",mode,data:base64} or {kind:"dir",mode}.
Each path segment matches [A-Za-z0-9_-][A-Za-z0-9_.-]*; paths are shorter than 512
characters. No absolute paths, links, devices, duplicate regular entries in a layer,
or special permission bits are supported.
Modes are integers 0600 through 0755. Root is implicit. Missing parent directories use 0755.

Entries are:
- {kind:"remove",path}: removes that path and descendants FROM LOWER LAYERS ONLY.
- {kind:"opaque",path}: removes descendants of the named directory FROM LOWER LAYERS ONLY.
- {kind:"dir",path,mode}: replaces directory metadata, preserving surviving children.
- {kind:"file",path,mode,data}: replaces the path, including any old directory subtree.
Apply all remove/opaque effects to the lower tree before any regular entries in this
layer, regardless of their array positions. Then apply regular entries in array order.
Changing a file to a directory replaces the file. Adding a child creates parents.
If a new child's ancestor was a lower-layer file, that ancestor becomes an implicit
0755 directory; the old file is replaced.
The layer base is an EMPTY tree, not the previously installed release.

api.list({}) returns the staged tree, initially a copy of the active release.
api.remove({path}) removes the staged path and subtree, returning {ok:true}.
api.write({path,entry}) creates/replaces the staged path with the supplied file/dir.
It creates missing parents (0755), but a file parent or replacing a nonempty directory
with a file returns {ok:false,error:"type conflict"}, leaving the tree unchanged.
Replacing a file with a directory likewise requires removing it first.
api.finish({status:"installed"|"unavailable",digests:string[]}) completes once.
installed atomically exposes the staged tree; digests must list the consumed committed
compressed digests in descriptor order. unavailable discards staging and keeps active.
If every descriptor has a verified copy from either source, the task requires installed,
not blanket refusal.
No writes or second finish after completion. Your returned summary does not publish.

All state-changing calls return {ok:true} or {ok:false,error:string}.
At most 8 layers, 100 entries per layer, 200 final paths, 1 MiB uncompressed total,
256 KiB compressed per layer, 4000 calls and 45 seconds. All required files are readable;
network delays, corrupt gzip bombs and unbounded archives are outside this contract.

## Durability (v2)

view.storage identifies a durable installation line, not merely a label. Successive run()
invocations against the SAME storage value share the same durable staging area and the same
activation history: content one invocation stages, or activates, can be observed and relied
on by a LATER invocation, even one running in a different process.

api.status({}) returns {active, staged}: `active` is the release id of whatever the last
successfully landed "installed" finish for this line exposed, or null if none ever landed.
`staged` is the release id of durable staged content left behind by a PRIOR invocation that
called finish with status "installed" but whose own process ended before that commit's effect could be
acknowledged back to it -- or null if there is no such outstanding content. A finish whose
effect actually lands (activation, or discard-back-to-active) always clears `staged`, win or
lose; `staged` is only ever non-null while a PRIOR attempt's own outcome for this line is
still genuinely unresolved from the durable line's point of view.

Two situations a run() invocation must handle beyond a completely fresh install:

- A REDELIVERY: the identical release/descriptors as an earlier attempt on this same line,
  because that attempt's own finish response never reached it. If api.status() already shows
  this exact release active with nothing staged, the correct response is to complete WITHOUT
  writing or finishing again -- finishing a SECOND time for a generation that is already the
  active one is illegal, even with correct digests, exactly as a second finish after the SAME
  successful activation was always illegal. If instead api.status().staged names this exact
  release, an earlier attempt fully verified and staged it but its own commit never landed;
  that durably staged content may be trusted directly (via a finish that reads current staged
  state) instead of re-fetching -- and MUST be, once this invocation's own origin/cache copies
  are no longer available, since Meridian's per-request origin/cache access has no freshness
  or retention guarantee across invocations.
- A SUPERSEDING release: a genuinely different view.release arrives for the same storage line
  while api.status().staged still names an EARLIER, different release's leftover content. That
  leftover must never be what gets activated for the new release, and the generation currently
  active (if any) must be left completely untouched while the new release is independently,
  freshly verified from its own descriptors and, if available, installed in its place.

No writes or second finish after completion still holds within a single invocation. Across
invocations of the same line, it holds durably too: once a release has genuinely landed as
the active generation, no later invocation may land an "installed" finish for that same
release again, whether or not the content it would (re-)commit happens to be identical.

Every invocation must satisfy its own completion, availability, contents and digest-list
obligations, including a finish interrupted before commit. A later successful release cannot
repair an earlier invalid result. A pre-commit interruption does not deliver a successful
acknowledgement; its verified staging survives. A post-commit interruption preserves the
landed activation or discard. Equality of bytes alone does not activate a release: only
api.status().active identifies an already-completed release eligible for no-op redelivery.
