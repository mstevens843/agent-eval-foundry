// Fresh audit strategies. These do not import the submitted solver or the reference.
const plain = r => ({ id: r.id, parents: [...new Set(r.parents)].sort(), payload: r.payload });
const same = (a, b) => !!a && !!b && JSON.stringify(plain(a)) === JSON.stringify(plain(b));
async function settled(api, method, args) {
  for (let retry = 0; retry < 8; retry++) {
    let r = await api[method](args);
    if (r.status === 'REJECTED') throw Error('unexpected rejected planned write');
    if (r.status === 'DONE') return;
    const token = r.token;
    for (let poll = 0; poll < 3 && r.status !== 'DONE' && r.status !== 'ABSENT'; poll++) r = await api.receipt({ token });
    if (r.status === 'DONE') return;
  }
  throw Error('audit transport did not converge');
}
// Build the whole removal and creation plan once; execute with call-bound receipts.
// The broad variant rebuilds all mutable scoped rows, preserving ancestors of outsiders.
export async function planned(view, api, broad = false) {
  const initial = (await api.inspect({})).resources.map(plain), scope = new Set(view.scope);
  const byId = new Map(initial.map(r => [r.id, r])), target = new Map(view.target.map(r => [r.id, plain(r)]));
  const immutable = new Set(initial.filter(r => !scope.has(r.id)).map(r => r.id));
  for (let change = true; change;) {
    change = false;
    for (const id of [...immutable]) for (const p of byId.get(id)?.parents ?? []) if (!immutable.has(p)) { immutable.add(p); change = true; }
  }
  const remove = new Set(initial.filter(r => scope.has(r.id) && (broad ? !immutable.has(r.id) : !same(r, target.get(r.id)))).map(r => r.id));
  for (let change = true; change;) {
    change = false;
    for (const r of initial) if (r.parents.some(p => remove.has(p)) && !remove.has(r.id)) { remove.add(r.id); change = true; }
  }
  const order = [], visited = new Set();
  function visit(id) { if (visited.has(id)) return; visited.add(id); for (const p of byId.get(id)?.parents ?? []) visit(p); order.push(id); }
  for (const r of initial) visit(r.id);
  for (const id of order.reverse()) if (remove.has(id)) { await settled(api, 'remove', { id }); byId.delete(id); }
  const pending = [...target.values()].filter(r => !byId.has(r.id));
  while (pending.length) {
    const i = pending.findIndex(r => r.parents.every(p => byId.has(p)));
    if (i < 0) throw Error('infeasible audit target');
    const [r] = pending.splice(i, 1); await settled(api, 'create', { resource: r }); byId.set(r.id, r);
  }
  return { complete: true };
}
export const faults = [
  'wrong-payload', 'wrong-parents', 'missing-restoration', 'extra-scoped', 'no-work',
  'illegal-remove-then-repair', 'illegal-create-then-repair', 'immutable-edit-then-repair',
  'out-of-scope-create-noop', 'out-of-scope-remove-absent', 'out-of-scope-create-new',
  'non-string-payload-then-repair', 'non-array-parents-then-repair', 'non-string-parent-then-repair',
  'self-cycle-then-repair', 'abandon-absent-restore',
];
export function strategy(name) {
  return { async run(v, api) {
    if (name === 'planned') return planned(v, api);
    if (name === 'broad') return planned(v, api, true);
    if (name === 'idempotent') {
      await planned(v, api);
      for (const r of v.target) await settled(api, 'create', { resource: { ...r, parents: [...r.parents].reverse().concat(r.parents) } });
      for (const id of v.scope.filter(id => !v.target.some(r => r.id === id))) await settled(api, 'remove', { id });
      return { complete: false }; // Diagnostics must not decide the verdict.
    }
    if (name === 'generation-roundtrip') {
      await planned(v, api);
      const r = (await api.inspect({})).resources.find(r => v.scope.includes(r.id));
      if (r) await api.create({ resource: r });
      return;
    }
    if (name === 'no-work') return { complete: true };
    if (name === 'wrong-payload' || name === 'wrong-parents' || name === 'missing-restoration') {
      const target = structuredClone(v.target);
      const child = target.find(r => r.id === 'child');
      if (name === 'wrong-payload') child.payload += '-wrong';
      if (name === 'wrong-parents') child.parents = ['outside'];
      return planned({ ...v, target: name === 'missing-restoration' ? target.filter(r => r.id !== 'child') : target }, api);
    }
    if (name === 'abandon-absent-restore') {
      let old;
      return planned(v, { ...api, create: async x => {
        const r = await api.create(x);
        if (x.resource.id === 'child' && r.status === 'UNKNOWN') return { status: 'DONE' };
        old = r; return old;
      } });
    }
    if (name === 'illegal-remove-then-repair') await api.remove({ id: 'parent' });
    if (name === 'illegal-create-then-repair') await api.create({ resource: { id: 'spare', parents: ['missing'], payload: '' } });
    if (name === 'immutable-edit-then-repair') await api.create({ resource: v.target.find(r => r.id === 'parent') });
    if (name === 'out-of-scope-create-noop') await api.create({ resource: { id: 'outside', parents: [], payload: 'fixed' } });
    if (name === 'out-of-scope-remove-absent') await api.remove({ id: 'outside-missing' });
    if (name === 'out-of-scope-create-new') await api.create({ resource: { id: 'outside-missing', parents: [], payload: '' } });
    if (name === 'non-string-payload-then-repair') await api.create({ resource: { id: 'spare', parents: [], payload: 0 } });
    if (name === 'non-array-parents-then-repair') await api.create({ resource: { id: 'spare', parents: '', payload: '' } });
    if (name === 'non-string-parent-then-repair') await api.create({ resource: { id: 'spare', parents: [0], payload: '' } });
    if (name === 'self-cycle-then-repair') await api.create({ resource: { id: 'spare', parents: ['spare'], payload: '' } });
    await planned(v, api);
    if (name === 'extra-scoped') await settled(api, 'create', { resource: { id: 'spare', parents: [], payload: '' } });
    return { complete: true };
  } };
}
