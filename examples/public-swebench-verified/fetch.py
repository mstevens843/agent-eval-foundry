#!/usr/bin/env python3
"""Rebuild swebench-verified.raw.json from public sources.

Two networked sources, both public and both cited in PROVENANCE.md:

  1. The canonical 500 instance ids of SWE-bench Verified, from the HuggingFace
     datasets-server rows API for princeton-nlp/SWE-bench_Verified.
  2. Every leaderboard submission under evaluation/verified/ in the
     SWE-bench/experiments GitHub repository, specifically each submission's
     results/results.json and metadata.yaml.

What this script deliberately does NOT do is decide what a cell means. It records
`resolved` and `no_logs` verbatim and leaves the pass / fail / not-measured
mapping to the TypeScript importer, where it is a documented decision with a test
around it rather than a silent transformation buried in a fetch script.

Output is interned: instance ids appear once in a list, and each system stores
integer indices into it. That keeps the checked-in artifact around 200 KB instead
of a multi-megabyte dense matrix, and it round-trips exactly.

Usage:  python3 fetch.py [output.json]
"""

from __future__ import annotations

import concurrent.futures
import json
import sys
import urllib.request

import yaml

HF_ROWS = (
    "https://datasets-server.huggingface.co/rows"
    "?dataset=princeton-nlp%2FSWE-bench_Verified&config=default&split=test"
    "&offset={offset}&length=100"
)
GH_LIST = "https://api.github.com/repos/swe-bench/experiments/contents/evaluation/verified?per_page=200"
GH_RAW = "https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/verified/{name}/{path}"
UA = {"User-Agent": "agent-eval-foundry/swebench-import"}


def _get(url: str, raw: bool = False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = resp.read()
    return body.decode("utf-8") if raw else json.loads(body)


def canonical_instances() -> list[dict[str, str]]:
    """The 500 SWE-bench Verified instances, in dataset order."""
    out: list[dict[str, str]] = []
    for offset in range(0, 500, 100):
        page = _get(HF_ROWS.format(offset=offset))
        for row in page["rows"]:
            r = row["row"]
            out.append({"instance_id": r["instance_id"], "repo": r["repo"]})
    seen = {i["instance_id"] for i in out}
    if len(out) != 500 or len(seen) != 500:
        raise SystemExit(f"expected 500 unique instances, got {len(out)} / {len(seen)} unique")
    return out


def _tags(meta_text: str | None) -> dict[str, object]:
    if not meta_text:
        return {}
    try:
        doc = yaml.safe_load(meta_text) or {}
    except yaml.YAMLError:
        return {}
    tags = doc.get("tags") or {}
    info = doc.get("info") or {}
    model = tags.get("model")
    if isinstance(model, list):
        model = model[0] if model else None
    return {
        "display_name": info.get("name"),
        "org": tags.get("org"),
        "agent": tags.get("agent"),
        "model": model,
        "model_org": tags.get("model_org"),
        "open_source_system": tags.get("os_system"),
    }


def fetch_submission(name: str) -> tuple[str, dict[str, object] | None, str | None]:
    try:
        results = _get(GH_RAW.format(name=name, path="results/results.json"))
    except Exception as exc:  # noqa: BLE001 - reported, not swallowed
        return name, None, f"results.json: {exc}"
    try:
        meta_text = _get(GH_RAW.format(name=name, path="metadata.yaml"), raw=True)
    except Exception:
        meta_text = None
    return name, {"results": results, "tags": _tags(meta_text)}, None


def main() -> int:
    out_path = sys.argv[1] if len(sys.argv) > 1 else "swebench-verified.raw.json"

    instances = canonical_instances()
    index = {inst["instance_id"]: i for i, inst in enumerate(instances)}

    names = sorted(entry["name"] for entry in _get(GH_LIST) if entry["type"] == "dir")
    print(f"instances: {len(instances)}   submissions listed: {len(names)}", file=sys.stderr)

    systems: dict[str, object] = {}
    errors: list[tuple[str, str]] = []
    with concurrent.futures.ThreadPoolExecutor(16) as pool:
        for name, payload, err in pool.map(fetch_submission, names):
            if err is not None or payload is None:
                errors.append((name, err or "unknown"))
                continue
            res = payload["results"]

            def keep(key: str) -> list[int]:
                return sorted(index[i] for i in res.get(key, []) if i in index)

            systems[name] = {
                "resolved": keep("resolved"),
                "no_logs": keep("no_logs"),
                "tags": payload["tags"],
            }

    for name, err in errors:
        print(f"  SKIPPED {name}: {err}", file=sys.stderr)

    doc = {
        "source": "swe-bench/experiments",
        "split": "verified",
        "instances": [i["instance_id"] for i in instances],
        "repos": [i["repo"] for i in instances],
        "systems": systems,
        "fetch_errors": [{"submission": n, "error": e} for n, e in errors],
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=1, sort_keys=True)
        fh.write("\n")
    print(f"wrote {out_path}: {len(instances)} instances x {len(systems)} systems", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
