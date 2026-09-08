# Index and checkpoint contract
api.next({}) returns the next event, or null. Events are assignment {kind,partition,generation}
or callback {kind,partition,generation,offset,eventId,record:{entity,version,body}}.
view.partitions is the complete allowed partition set. Initial generation is zero and
checkpoint -1. Offsets are contiguous nonnegative log positions but callbacks may arrive
out of order and repeat. An eventId has immutable partition, offset and record. Distinct
partitions can share entity names and offsets. Only callbacks matching the most recent
assignment generation are authorized; ignore older callbacks without writing, completing
or checkpointing on their behalf. Non-scoped partitions cannot be changed.
Index identity is (partition,entity). A higher record.version supersedes a lower one;
versions are positive integers and equal versions have identical bodies. Never write a
lower version over a higher durable version. Processing an older event still completes
its log position if the index already has a strictly newer version. Index writes use
api.put({partition,generation,entity,version,body}). api.read({partition,entity}) returns
the current row or null. api.complete({partition,generation,offset,eventId}) records
completion of an authorized delivered callback ONLY after its required effect is durable
(or superseded). Duplicate completion of the same immutable event is harmless.
api.commit({partition,generation,offset}) advances the durable checkpoint. It must not
regress or skip any not-yet-completed position. Advance through every contiguous completed
position by the end of input. Completed positions and durable index effects survive
generation changes. New assignments do not undo already-completed work.
Operations are synchronous and durable and return {stored:true}; the independent grader
checks their legality, not the acknowledgments. api.next is finite, at most 200 events;
every scoped position that needs completion is redelivered at a valid generation before
end-of-input. Process the whole input, preserve unrelated partition state, and leave the
latest authorized entity version in the index. Merely returning a completion claim does
not perform work. No unknown outcome or external payment behavior is involved.
# Execution envelope

The submitted program has 45 seconds per invocation and up to 4000 API operations.
These are generous execution limits, not the human repair time budget. The public
API and hidden data obey the bounds below; no delay or starvation is used for hardness.
