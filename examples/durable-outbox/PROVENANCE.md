# Where `matrix.json` came from

Extracted from the Terminal-Bench 3 task repository
`github.com/mstevens843/terminal-bench-durable-outbox` at artifact commit `c0e04eb`, task sha256
`dbca1f37e6b3bc4297b59a14fbae7d81c71eeb731220722f48cbe020ddabfc02`. Nothing here is generated or
estimated; every cell is a recorded outcome.

## Sources

| part | source |
|---|---|
| the 24 instance ids | `tasks/durable-approval-outbox/tests/collect.py:30` (`SCENARIOS`), verbatim |
| every result cell | `prototype/screenM/matrix.txt` — a complete sweep of all ten preserved engines against the shipped 267-check verifier |

`matrix.txt` records only failures, as `<scenario>-<seed>-<keys>-<check>` lines under each engine; a
scenario absent from an engine's block is a pass. The extraction preserves that by writing
`{"failed": []}` rather than omitting the cell.

**The parse is self-checking.** Each engine's block in `matrix.txt` carries its own header total
(`fhc3 reward=0 261 passed 6 failed`), and the reconstructed per-engine failing-check counts
reproduce every header exactly: e1 23, opus1 2, opus2 8, opus3b 6, fhc1 3, fhc2 8, fhc3 6, codex1 12,
codex2b 12, codex3b 14. The reference `v2ref` passes 267/267 at reward 1 and is declared as
`reference_subject`, not graded as a subject.

**240 of 240 cells are measured.** There are no nulls in this matrix.

> An earlier version of this file built the matrix from `floor.json` + `select.json` instead, which
> left 54 cells unmeasured and made `fhc1` look as though the suite could not catch it. It can:
> `fh-claude-1` scores 264/267 with three `completion` failures. `matrix.txt` was the right source
> all along and was sitting in the same directory. Recorded here because the whole point of the tool
> is that unmeasured cells must not be mistaken for passes, and the first draft made exactly that
> mistake at the data-entry layer rather than in the code.

## Subject bank

| id | what it is |
|---|---|
| `e1` | the **as-shipped defective engine** from `environment/app/engine/`. Not an agent product — it carries the planted defects, so an instance catching only `e1` tests the starting bugs, not any agent's reasoning. |
| `opus1`, `opus2`, `opus3b` | Opus 5 max, the v2 matrix. `opus3b` scored 201/201 on the older suite and was recorded as a solve; it carried `ACKED -> REVOKED`. |
| `fhc1`, `fhc2`, `fhc3` | Opus 5 max, the hardening round. `fhc3` scored 245/245 and was likewise a false positive. |
| `codex1`, `codex2b`, `codex3b` | GPT-5.6-sol xhigh, the v2 matrix. |

Note what this bank is: ten engines, every one produced against *this* task, containing roughly two
defect families between them. The axis count it yields is a statement about the suite paired with
this bank, and a bank this narrow bounds the answer from above regardless of how good the suite is.

## The selection caveat, in full

The six `revoke-after-ack` instances were **not** sampled independently of this bank. They were
chosen by `prototype/screenM/diversify.py`, which at line 11 fixes

```python
SUBJ = ["fhc3", "fhc2", "opus3b", "opus2", "codex1", "codex2b", "codex3b"]
```

— exactly the seven engines then known to carry the `ACKED -> REVOKED` bug, excluding the three that
did not — and at line 46 admits a candidate only when `len(catch) >= 6`. A point could survive
selection only by making that single bug fire in at least six of seven engines.

Five of the six land on nearly identical catch sets. That is what the selection rule guarantees, not
something the sweep discovered, and it is why the axis count for this suite should be read as an
upper bound.

## Reproducing the extraction

Some archived `result.json` copies under `runs/` contain literal `[REDACTED]` tokens inside numeric
fields and will not parse; the run-level records used for the cost figures in `MEMO.md` are clean.
The matrix here depends on none of them — only on `matrix.txt` and `collect.py`.
