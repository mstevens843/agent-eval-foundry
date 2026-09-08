# Archive contract v1

This is a bounded fictional archive protocol, not a PostgreSQL compatibility task.
view contains tenant, branch, cutoff (integer commit time), catalog, logs and storage.
Each catalog entry is {id,tenant,branch,at,lsn,digest,size}. It names a complete snapshot
at at and lsn. Choose the highest lsn checkpoint with matching tenant and branch and
at <= cutoff. There is always one. catalog order is not meaningful; lsn is unique per
branch and increasing with commit time. Equal timestamps are ordered by lsn.

api.fetch({digest}) returns {bytes:base64}; api.cache({digest}) returns null or the same
shape but cached bytes may be stale. size and SHA256 of the decoded bytes describe the
authoritative JSON snapshot {accounts,entries,nextId}. Accounts are {id,name}; entries
are {id,account,amount}. IDs and amounts are safe integers; IDs positive. nextId is the
next entry ID, greater than every present entry ID. Values including zero are meaningful.

logs is an unordered array of {tenant,branch,lsn,at,changes,nextId}. For the chosen
branch replay transactions whose lsn exceeds the checkpoint and at <= cutoff, in lsn
order. Each changes array contains {table:"accounts"|"entries",op:"put"|"delete",row}.
put replaces the whole row by its id, delete removes row.id if present. A transaction
is atomic; its internal order need not satisfy foreign keys, but its final state does.
nextId replaces allocation state at that transaction, even when high-ID rows were deleted.
Transactions from other branches or tenants never affect this recovery.

Publish exactly one successful recovery:
- api.archive({bytes}) persists a portable JSON backup with fields
  {tenant,branch,cutoff,accounts,entries,nextId}; bytes is UTF8 JSON encoded as base64.
- api.begin({}) opens a transaction in a fresh SQLite database.
- api.put({table,row}) inserts/replaces a row. Only accounts and entries are allowed.
- api.allocate({nextId}) sets allocation state.
- api.commit({}) atomically commits; foreign keys must hold on commit.
- api.publish({}) exposes the restore and backup. At publication both must represent
  exactly the requested point, including relationships and allocation state. No incomplete
  publication, out-of-scope writes, or subsequent changes to published data are legal.

Operations return {ok:true} or {ok:false,error:string}; errors perform no partial write
except a failed commit, which rolls back its transaction. archive replaces a prior staged
archive before publication; begin/put/allocate/commit may be retried if needed.
Only one transaction at a time. api.inspect({}) returns the committed restore rows and
nextId; it is available for self-checking. Your return value is informational, not evidence.
At most 30 checkpoints, 120 transactions of 12 changes, 200 rows per table, 256 KiB per
blob, 4000 calls, 45 seconds. Fixtures are recoverable without delays or network access.
