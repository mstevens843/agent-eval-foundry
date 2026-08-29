# SWE-bench Verified — external validation corpus

The internal example (`examples/durable-outbox/`) has a known weakness: its ten subjects were all
produced against that one task, and six of its twenty-four instances were *selected* against seven of
those subjects. Any axis count from it is an upper bound on self-deception. This corpus exists to
answer the obvious objection — does the method say anything when the bank is genuinely independent?

## Source

| | |
|---|---|
| results | [`SWE-bench/experiments`](https://github.com/swe-bench/experiments), `evaluation/verified/*/results/results.json` and `metadata.yaml` |
| canonical instance ids | HuggingFace `princeton-nlp/SWE-bench_Verified`, split `test`, 500 rows |
| retrieved | 2026-08-28, `main` branch |
| instances | 500 |
| systems | 134 leaderboard submissions, 2023-10 → 2025-12 |
| fetch errors | 0 |

Regenerate with `python3 fetch.py`. The script needs network access and `pyyaml`; it writes
`swebench-verified.raw.json` (~360 KB, instance ids interned as integers).

## Licence and usage

`SWE-bench/experiments` declares **no SPDX licence file**. Its README states the submission records
are published so that: *"These logs are publicly accessible and meant to enable greater
reproducibility and transparency of the experiments conducted on the SWE-bench task."* Re-measuring
published pass/fail outcomes is squarely that use.

What is checked in here is a **derived boolean matrix** — which submission resolved which instance —
not the submissions themselves. No patches, trajectories, execution logs, or model outputs are copied
into this repository. Anyone re-running `fetch.py` gets the same file from the same public sources.
The SWE-bench benchmark itself is MIT-licensed; `princeton-nlp/SWE-bench_Verified` is distributed on
HuggingFace under CC-BY-4.0, and only instance identifiers are used from it.

If the maintainers would prefer this derived artifact not be redistributed, deleting
`swebench-verified.raw.json` and running `fetch.py` reproduces it exactly.

## How a cell is decided

`results.json` publishes `resolved` and, on 121 of 134 submissions, `no_logs`. It does not publish a
failure list — the leaderboard score is `|resolved| / 500`, so anything unresolved counts against a
system.

| condition | cell |
|---|---|
| in `resolved` | **pass** |
| in `no_logs` | **not measured** (`null`) — 216 cells across 41 submissions |
| anything else | **fail**, recorded as the single check `unresolved` |

The middle row is the only real decision. `no_logs` means the evaluation produced no log at all, so
scoring it as a failure would credit the benchmark with a discrimination it never made. Folding those
216 cells into failures would enlarge catch sets by up to 90 entries on a single submission, and
larger catch sets nest less often — which moves the axis count *up*, in the flattering direction.
`test/import-swebench.test.ts` pins this behaviour.

`no_generation` (the system produced no patch) **is** counted as a failure: it is a failure to solve,
not a gap in measurement.

## Limitations of this dataset

Stated plainly, because they bound what the number means.

- **One bit per instance.** SWE-bench grades resolved / not resolved with no check-level detail, so
  catch sets here are coarser than the internal example's, where a failure names which invariant broke.
- **Single unreplicated runs.** Every cell is one attempt. Two instances measuring the same underlying
  weakness can differ by a few systems through ordinary run variance, and exact subset nesting is
  unforgiving of that. This is precisely why the report carries a null-model calibration rather than
  quoting the width bare.
- **Submissions are not a random sample.** Teams submit when they have a good result; there is
  survivorship pressure toward the top of the leaderboard, and the bank is dominated by 2024–2025
  scaffold-plus-frontier-model systems.
- **Heterogeneous effort.** A 2023 RAG baseline and a 2025 agent with a large inference budget are
  both one column. The bank spans 2/500 to 396/500 resolved, which is a feature for the decay curve
  and a confound for anything else.
- **Instance difficulty is confounded with repository.** 231 of the 500 instances come from
  `django/django`. Instances that fail together may do so because they share a codebase rather than a
  capability.
- **`no_logs` is not missing-at-random.** It concentrates in a few submissions (90 in one, 47 in
  another), so those columns are measured on less of the corpus than the rest.

## What it does and does not establish

It establishes that the method runs on an independent public corpus at 500×134 and returns a number
that is not an artifact of scale: **215 axes measured against 500 under a null model that preserves
every system's resolve count and destroys only the relationship between instances.**

It does not establish that 215 is the "right" number of capabilities in SWE-bench Verified. The axis
count is a property of this corpus paired with this bank, it is coarsened by one-bit grading, and it
is inflated to an unknown degree by run noise. The defensible claim is comparative: 500 tasks, 474
distinct co-failure patterns, 215 that cannot be explained as one difficulty seen at different
sensitivities — against a chance baseline of 500.
