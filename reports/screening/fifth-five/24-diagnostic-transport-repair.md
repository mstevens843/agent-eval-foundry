# 24 — Diagnostic transport repair

## Outcome

Claude, requested Opus 5 / max, completed in **12 minutes 43 seconds**, with **reward 1**.
The service passed **28/28 protected scenarios** and its checker passed **13/13
candidates**, accepting both correct implementations and rejecting all eleven controls
with an actually violated obligation named. Repeated checker execution was deterministic.
There was no recorded execution error or retry.

## What the task was, in plain English

A gateway receives interleaved byte fragments from several transport channels. It
must reassemble each channel into newline-delimited JSON records, then interpret those
records by logical request and attempt. A channel is not a request: one attempt can
arrive through multiple channels, and a record or even a UTF-8 character can span frames.

For each requested ID, the gateway selects the newest attempt seen anywhere, even if
an earlier attempt succeeded and the newer one never finished. It preserves the
contiguous chunk prefix from sequence zero. A terminal error remains an error with
its original code and retryable flag, while an unfinished attempt, a gap and a wholly
missing request have different specified outcomes. Successful empty output is also
legitimate; absence of error text is not proof of success.

After draining input, it records exactly the requested population. Returning a flattering
summary is not publication. This is a bounded fictional wire protocol with complete
public definitions, not unspecified behavior of a real provider API.

## What was in the package

The starter separated decoding, attempt selection, outcome construction and service
orchestration. It included public semantics, API definitions and one visible test.
The separate checker received complete original raw wire chunks and requested IDs,
actual recorded rows and observed API calls. It did not have to infer missing requests
from another candidate's output.

Protected grading used 28 service scenarios and thirteen checker candidates—two
correct implementations and eleven negative controls. The checker ran separately,
without access to service helpers or the private verdict channel. Correct alternate
decoding strategies and row/property ordering were allowed.

## What the agent actually did

There are 22 captured shell calls. Claude modified the decoder, outcome constructor
and service loop, added a standalone checker and grew the retained tests from one
to **54 passing tests**.

1. It replaced per-frame decoding with byte buffering per channel. The old decoder
   converted and split each frame separately and swallowed JSON parse errors, silently
   losing fragmented records. The repair concatenates each channel's bytes before
   UTF-8 decoding and record splitting. Under the small declared bounds, whole-channel
   buffering is a valid solution; streaming decoding is not required.
2. It corrected the terminal-error branch, which had returned successful empty output.
   The repaired result preserves the actual error code/retryability and all available
   contiguous prefix data instead of erasing both the failure and partial content.
3. It deduplicated requested IDs before publication. The public list's duplicate-ID
   interpretation was not completely explicit, so this is defensive handling rather
   than an independently established planted defect. The attempt-selection module was
   already correct and remained unchanged.
4. It wrote a checker that independently decodes the original wire, reconstructs each
   request's expected outcome and compares actual effects. It also checks input
   exhaustion from observations and separates missing publication from self-reporting.

The final tests cover one-byte fragments, CRLF and blank lines, a final record without
a newline, retransmissions, unfinished later attempts, empty success, gaps, truncation,
missing requests, and terminal errors with useful prefix data. Its alternative-correct
implementation uses streaming decoding and different output ordering.

Its retained property tests generate **300 randomized wires** and derive expected
outcomes from the generator's logical plan, rather than obtaining the oracle by parsing
the same bytes with the same decoder. They check both correct implementations and
seventeen deliberately wrong variants. Final captured output reports all 54 tests
passing, including the property and mutant tests, plus deterministic, non-mutating
checker behavior on frozen inputs.

The agent also measured a large synthetic checker workload: ten candidates with twelve
cells each, about 9.2 MiB of base64 wire per candidate, judged twice in 306 ms at about
221 MiB RSS. That is its local benchmark, not a protected scenario count or proof of
all future memory behavior.

## Why it solved, and what remains uncertain

The starter's two real defects were direct contradictions of clear public rules:
frames were not complete records, and terminal errors were not successful empty output.
Correct attempt selection and most outcome distinctions already worked. Bounded input
allowed the agent to choose a simple buffered design and invest in checking it.

The strongest practice to transfer is its independent test construction: derive the
expected logical outcome before splitting it into wire fragments, then compare both
buffered and streaming implementations. That is more informative than comparing two
parsers that could share the same framing assumption.

The checker makes explicit leniency choices for duplicate requested IDs and empty-wire
exhaustion. Those should be clarified in a successor contract before using narrow
controls to reject one interpretation. Its parser also retains a catch-and-skip path
for malformed records, but the public contract guarantees valid complete JSON after
reassembly. That path is not a demonstrated in-contract failure and must not be turned
into an unfair hidden malformed-input test.

This run provides no evidence that the package currently defeats the target model.
A larger transport workload alone would mostly test buffering limits already made
generous for fairness. Any genuinely stronger workflow would need additional natural,
fully stated obligations and new reference/control validation, while keeping simple
correct buffering legal where the product requirements permit it.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) retains original
results, exact reason policy, timing, source deltas and capture hashes. The submitted
tests and original command output substantiate the verification account; they were
not executed unprotected during analysis. This is a single exploratory pass, not
universal correctness, official qualification or a backend attestation. Observable
actions are described, not private internal reasoning.
