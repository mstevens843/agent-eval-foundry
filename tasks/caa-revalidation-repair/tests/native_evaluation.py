"""Typed native outcome; a zero reward is never sufficient failure evidence."""
import json
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
import checks


def evaluate(data):
    expected_ids = sorted(json.load(open('/tests/scenarios/selected/' + n))['id']
                          for n in os.listdir('/tests/scenarios/selected') if n.endswith('.json'))
    rows = [r for r in data['results'] if r['scenario']['suite'] == 'selected']
    observed = [r['scenario']['id'] for r in rows]
    if sorted(observed) != expected_ids:
        raise ValueError('scenario population mismatch')
    errors = []
    cells = []
    for row in rows:
        for order in row['orders']:
            if order.get('status', 'completed') != 'completed' or order['exit_code'] != 0:
                errors.append({'scenario': row['scenario']['id'], 'order': order['order_id'],
                               'status': order.get('status', 'process-error')})
            if any(isinstance(order.get(k), dict) and '__unreadable__' in order[k]
                   for k in ['report', 'audit', 'store_after']):
                errors.append({'scenario': row['scenario']['id'], 'order': order['order_id'], 'status': 'artifact-invalid'})
        verdict = checks.evaluate_scenario(row)
        cells.append({'scenarioId': row['scenario']['id'],
                      'failures': [{'check': k, 'detail': d} for k, (ok, d) in verdict.items() if not ok]})
    mechanism = any(checks.completion_inverted(r) for r in rows)
    failed = any(c['failures'] for c in cells) or not mechanism
    kind = 'artifact-failure' if errors else 'semantic-fail' if failed else 'semantic-pass'
    return {'schemaVersion': 1, 'kind': kind, 'complete': not errors,
            'scenarioIds': observed, 'checkIds': list(checks.CHECK_IDS), 'cells': cells,
            'mechanismObserved': mechanism, 'errors': errors,
            'countsAsModelFailure': False, 'note': 'Local artifact evaluation, no model attempt or adjudication.'}


if __name__ == '__main__':
    with open(sys.argv[1]) as f:
        data = json.load(f)
    with open(sys.argv[2], 'w') as f:
        json.dump(evaluate(data), f, sort_keys=True)
