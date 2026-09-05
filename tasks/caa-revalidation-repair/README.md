# caa-revalidation-repair

## Difficulty explanation

`certd` ships complete. It builds, it vets clean, its six unit tests pass, and the five
scenarios under `/app/harness/scenarios/` all produce the report a reader would expect. It
is correct for an order naming one identifier, correct for an order whose stored
authorizations are all still current, and correct for a multi-identifier order whenever the
authority happens to answer the identifiers alike.

What it gets wrong is one thing, and the thing is not visible in any of those runs. The
revalidation planner starts one query per identifier that needs rechecking and then
collects the answers as they arrive. The answer type carries no identifier, so the collect
loop cannot say which answer belongs to which name; the assembly loop then walks the order's
identifiers and takes the next answer off the pile for each one. The count is always right —
N identifiers needed rechecking, N queries went out, N answers came back, N decisions were
emitted — and the correspondence is right only when the answers happen to come back in the
order they were asked. The authority serves queries concurrently and does not, so on an
order carrying two or more stale identifiers whose answers differ, `certd` attaches one
domain's authorization to another domain's name.

Three things make that hard to find rather than tedious to find.

The first is that the immediate damage is invisible. The order's outcome is a conjunction
over its identifiers, and permuting answers among them permutes a multiset, so the order
that carries the mistake is still decided correctly. Nothing goes wrong until the *next*
order: a recheck is what refreshes the store, so the mispaired answers are written back
against the wrong names, and an order arriving inside the freshness window is then decided
from a stored authorization that belongs to a different domain. The failure a reviewer can
actually see — a certificate issued for a name the authority forbids — is one order removed
from its cause.

The second is that the service's own test suite is built exactly the way the real world
built it. The unit test that covers multi-identifier rechecking asserts the *number* of
queries, and the test that checks a returned answer is applied uses a single identifier. A
reader who runs the shipped tests, or writes more in the same style, learns nothing. This is
not a trap invented for the task: it is the shape of the coverage gap that let this class of
bug reach production in a public CA.

The third is that the natural way to reproduce the problem locally does not reproduce it.
`/app/harness/` ships a development stand-in for the authority, and an engineer who reaches
for it writes a scenario, runs it, and sees the right answer, because a local stand-in
answers immediately and therefore in request order. The stand-in has a per-identifier delay
knob and the specification says the real authority answers concurrently and out of order,
but the two facts have to be put together before the failing condition can be built. An
agent that reproduces against the default harness gets a green run over a broken service —
the same false confidence the shipped unit tests give.

The repair itself is small once seen: keep the identifier attached to its answer instead of
reassembling the two by position afterwards. Getting there means noticing that the count is
not the correspondence, that the store is an output and not just an input, and that the
harness in front of you cannot express the condition the specification describes. There is a
second, independent obligation in the same function — an identifier the authority cannot
settle currently abandons the whole order instead of refusing it — that a repair focused
only on the pairing will leave in place.

In the real world this is the work of whoever owns issuance at a certificate authority. A
certificate issued for a name whose authorization records forbid it is a misissuance, and it
is the failure that costs the CA its trust.

## Solution explanation

Replace the reassembly in `Planner.Reconcile`. Instead of pushing bare answers onto a
channel and taking the next one off the pile for each stale identifier, keep the identifier
with its answer — either by writing into an indexed slice under a `WaitGroup` and rebuilding
a name-keyed map from the pending list, or by putting the name on the value that travels
over the channel. Then look each identifier's answer up by name.

The same function needs its error path changed. An authority error currently returns from
`Reconcile`, so `main` exits non-zero and writes neither a report nor an audit record. The
specification says an identifier the authority could not settle is indeterminate: it does
not permit issuance, and it does not abandon the order. Emit a decision with source
`INDETERMINATE` and no authorization, record nothing in the store for it, and let the
conjunction refuse the order.

Nothing else changes. The freshness window, the write-back of established authorizations,
the conjunctive decision, the report and audit shapes, and the concurrent fan-out are all
already correct, and a repair that serialises the queries to fix the pairing breaks the
round-trip obligation instead.

`solution/solve.sh` applies the corrected `planner.go` and then runs `gofmt`, `go vet`,
`go build` and `go test`.

## Verification explanation

The verifier runs in its own container after the agent's is gone, and the only thing that
crosses the boundary is `/app/certd/`. Everything else — the authority, the hidden
scenarios, the reference semantics, the Go toolchain, pytest — is baked into the verifier
image, so nothing is fetched at verify time and the build runs with `GOPROXY=off` against a
service that depends on the standard library alone.

Three roles at two privilege levels. The authority runs as root; it owns the current
authorization policy and an append-only log stamped with a tick only it increments. Its
public socket has exactly one verb, answering a query, and refuses everything else; `arm`,
`seal` and `dump` live on a second socket inside a `0700` directory that the unprivileged
service cannot traverse. The submitted service is compiled to a standalone binary and
executed once per order as `nobody`, in its own session, killed by process group afterwards.
The process that asserts never runs the service and never links it — it reads a finished
record. So the service's account of what it queried and the authority's account of what it
was asked are produced by different processes at different privileges, and the service can
lie about the first while being unable to reach the second.

Before the build, every file the specification declares read-only is restored byte for byte
from a baseline baked into the verifier image, so editing `go.mod`, the order contract, the
harness or the specification cannot help a submission pass. A `vendor/` tree, a `go.work`,
and `replace`/`exclude` directives are rejected outright.

Grading is ten obligations per scenario across twenty-four hidden scenarios, plus three
suite-level checks. Each obligation names the section of `SEMANTICS.md` it enforces, and one
of the suite-level checks asserts that correspondence mechanically, so a check that grades
something the specification does not say, or a published rule nothing grades, fails the run
rather than passing review. Another asserts that at least one graded scenario actually saw
the authority answer out of the order's own order — a suite in which the mechanism never
fired would grade nothing and is treated as a failure to measure. The expected check count
is derived from the check registry rather than written down, and the CTRF report is read
back to confirm that exactly that many checks ran and passed, so code that exits zero having
run nothing does not score.

The hidden scenarios were not chosen by hand. A deterministic search over the declared
parameter space ran the reference and four narrow mutants across nine hundred points,
discarded every point where the reference failed or where the mechanism could not fire —
fewer than two identifiers to recheck, or identifiers whose answers agree, or a latency
schedule that does not deterministically invert the document order — measured which
parameters actually control activation rather than assuming them, minimised each surviving
point, and spread the selection across the parameters that do not control it. The result was
then scored against six further mutants that had no part in choosing it and against a second,
independently structured correct implementation, both of which are shipped in the verifier
image. Four non-activation controls, on which an implementation whose only fault is the
pairing must pass, are graded alongside.

Reward is binary and is written by root before the artifact is touched: `0` first, `1` only
on the single path where every derived check ran and passed.

## Relevant professional experience

I build and operate SolPulse, a Solana trading platform, and Agentic, a multi-wallet
AI-agent signer whose approval pipeline turns policy decisions into wallet actions. The part
of that system I care most about getting right is the boundary where a decision made against
one principal's authority is applied to another's — fanning out per-principal authorization
checks and reassembling them is a pattern I have written, reviewed and broken, and the
failure it produces is silent in exactly the way this task's is.

## Development notes

`tests/` also carries the material this task was built and audited with, none of which the
agent ever sees: the reference and an alternative correct implementation, ten mutants, the
scenario fuzzer and selector, a twenty-four scenario balanced comparator frozen alongside the
graded suite, and `gate.py`, which asserts the integrity controls in one invocation —
reference and alternative pass, each mutant is independently fatal for the obligation it
violates, the narrow mutant respects every non-activation control, cheats fail, malformed
records are refused rather than graded, and every isolation claim trips its own canary.
`test.sh` grades the selected suite only; the balanced suite is a coverage instrument.
