# Window publication contract

A run has width W (positive integer), lateness L (nonnegative integer) and a complete
partition list. Each partition starts active with watermark -1000. Events arrive in
the order returned by next({}); null means input exhausted. Event kinds:
data {partition,id,time,key,delta}, watermark {partition,value}, idle {partition},
resume {partition}, end {partition}. Data identity is (partition,id); repeated identities
are byte-identical. A duplicate, including a repeated late event, has no further effect.
Different partitions may use the same id. All timestamps and deltas are integers.

Data belongs to [floor(time/W)*W, floor(time/W)*W+W). The frontier starts -1000.
After every control event, advance it to max(previous frontier, minimum watermark of
ACTIVE, non-ended partitions). Idle and ended partitions are excluded. If all remaining
partitions are idle, hold the frontier. If all partitions ended, frontier is Infinity.
Resume retains that partition's last watermark and cannot move the frontier backward.
End is permanent. No later data comes from ended partitions. Watermarks of each partition
never regress, but data may arrive behind them; late handling below is authoritative.

On a first data identity, if its window end + L <= current frontier, send it to
late({event}) exactly once, unchanged. Otherwise add delta and count one event in the
window/key accumulator. An accumulator remains real even if its total becomes zero.
At every frontier advance publish all newly closed accumulators, once each, using
emit({row:{start,key,total,count}}). A window closes when end + L <= frontier.
Finish these publications before requesting the next input event; consumers rely on
that boundary. Ordering between distinct rows closed at the same boundary is immaterial.
Never emit a tentative or duplicate final row. Late side output also precedes next input.
All accepted data must be included, and the input ends with every partition ended.

emit and late store submitted bounded JSON and return {stored:true}; they do not judge
semantic correctness. Malformed shapes return {error:"shape"} with no effect. next always
advances, even if required output was omitted. Returning a summary is not publication.
No extra output is allowed. Empty streams require no invented window or late event.

Bounds: 1–4 partitions, up to 100 events, W=1–20, L=0–20, time -40–200,
watermarks -1000–500, delta -1000–1000, at most 12 keys. IDs are exact strings.

## Execution environment

Node 24 and built-ins are available offline during grading. Entry point: entry.mjs
exports subject.run(view, api). All API methods are asynchronous and take one object.
Submitted return values are diagnostic only; required outputs must be published.
Any correct algorithm or module layout is allowed. The workspace may contain at most
128 regular files, 8 MiB total and depth 16; no lingering subprocesses.
There are 45 seconds per service invocation, not per human/agent repair. Transport:
4000 frames including begin/report/finish (3997 API calls maximum), 64 KiB UTF-8 JSON
per frame, 16 MiB per channel and combined diagnostics. Supplied views/responses and
compact correct request payloads fit 48 KiB jointly with the domain bounds; independent
maxima need not occur together. No timeout-only difficulty or unknown API is intended.

