"""Build-time native manifests derived from the same registry used in grading."""
import json
import os
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import checks


def manifest():
    root = Path(__file__).parent
    selected = [json.loads(p.read_text()) for p in sorted((root / 'scenarios/selected').glob('*.json'))]
    ids = [s['id'] for s in selected]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('empty or duplicate native scenario identity')
    text = (root / 'baseline/spec/SEMANTICS.md').read_text()
    sections = set(re.findall(r'^## (\d+)\.', text, re.M))
    links = {c: s.split(',') for c, s in checks.CHECK_SECTIONS.items()}
    if set(links) != set(checks.CHECK_IDS) or any(not set(s) <= sections for s in links.values()):
        raise ValueError('contract/check traceability mismatch')
    return {'scenarioIds': ids, 'checkIds': list(checks.CHECK_IDS),
            'traceability': links, 'suiteChecks': ['every_scenario_ran', 'every_obligation_is_checked', 'mechanism_fired_somewhere'],
            'gradedSuite': 'selected', 'comparisonSuites': ['balanced', 'controls']}


if __name__ == '__main__':
    print(json.dumps(manifest(), sort_keys=True))
