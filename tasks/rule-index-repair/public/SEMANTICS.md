# Juniper matching and plan format v1

view.rules is an ordered array of {id,pattern,tag,fold:boolean}. Match the ENTIRE document.
Patterns and documents use printable ASCII (space through ~). Pattern ? matches one byte;
* matches zero or more bytes and captures that substring. Backslash escapes the next byte
as a literal, including *, ?, and backslash. A dangling escape is invalid input and never
supplied. Every unescaped star has its own capture slot, left to right; adjacent stars are
distinct. fold=true compares literal ASCII letters without case, but returns captures
with their original case. No other normalization. Among matching rules choose the first
in the input array, not the longest pattern. Among matches of that rule choose the
lexicographically smallest vector of star lengths (earlier stars shortest first).
Output is null or {ruleId,tag,captures:string[]}. Empty captures must be retained.

api.publish({program}) installs one complete plan {entry:number,code:Instruction[]}.
Each instruction contains exactly op and the fields listed below:
- char {value:one ASCII byte,fold:boolean,next}: consume that byte if equal, else fail.
- any {next}: consume any single byte, or fail at end.
- split {first,second}: push a copy of current position/capture state for second, then first.
- jump {next}: continue without consuming.
- mark {slot,edge:"start"|"end",next}: store the current input offset for a capture boundary.
- memo {next}: if (THIS program counter,current input offset) has been visited earlier in
  this document evaluation, fail this branch; otherwise record it and continue.
- accept {ruleId,tag,slots:number}: succeed only at end of document, returning captures
  from slots 0..slots-1. Missing, reversed or out-of-range boundaries make that branch fail.
- fail {}: fail this branch.
On failure pop the most recent saved branch, or return null if no branch remains.
A new document starts at entry, offset zero, empty captures, empty stack and empty memo.
The first successful accept wins. The interpreter does not execute arbitrary JS.

Each dispatched instruction costs one step, including failed checks and memo visits.
Work must be <= 8*(document.length+1)*(T+rules.length+1)+32, where T is the total number
of parsed pattern tokens (escaped byte counts as one token) in the ORIGINAL rule set.
Budget is independent of submitted code size. Exceeding it is a semantic work failure,
not a wall-time timeout. A published program has at most 8192 instructions and slot
indices 0..7; each rule has <=8 stars, <=64 tokens, <=32 rules; documents <=96 bytes.
Pointers must be integer in-bounds instruction indices; invalid programs return
{ok:false,error:string} and do not install. Only one successful publish; no fake summary.
The ordinary outer execution allowance is 4000 calls and 45 seconds.
