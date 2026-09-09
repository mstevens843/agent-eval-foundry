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
