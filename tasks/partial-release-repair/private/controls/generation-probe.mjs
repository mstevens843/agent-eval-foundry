import { perform } from './transport.mjs';

// These probes run after the reference migration and use only public graph data.
export async function probe(mode, view, api) {
  const resources = (await api.inspect({})).resources;
  const scoped = resources.filter(resource => view.scope.includes(resource.id));
  if (mode === 'roundtrip') {
    for (const resource of scoped) {
      // The create is already satisfied even if its response is UNKNOWN/ABSENT.
      await api.create({ resource });
      await api.create({ resource: { ...resource, generation: resource.generation + 1000,
        parents: [...resource.parents].reverse() } });
    }
    return;
  }
  if (mode === 'recreation') {
    const leaf = scoped.find(resource => !resources.some(other => other.parents.includes(resource.id)));
    if (!leaf) return;
    await perform(api, 'remove', { id: leaf.id });
    // Deliberately stale caller bookkeeping must neither be stored nor set the new generation.
    await perform(api, 'create', { resource: { ...leaf, generation: leaf.generation + 1000 } });
    await api.create({ resource: leaf });
    return;
  }
  const chosen = mode === 'outside' ? resources.find(resource => !view.scope.includes(resource.id)) : scoped[0];
  if (!chosen) return;
  const resource = { ...chosen, generation: chosen.generation + 1000 };
  if (mode === 'wrong-payload') resource.payload += '-illegal-change';
  if (mode === 'missing-parent') {
    let missing = 'absent-parent';
    while (resources.some(row => row.id === missing)) missing += '-other';
    resource.parents = [...resource.parents, missing];
  }
  // Return normally after a forbidden attempt so a semantic failure remains observable.
  await api.create({ resource });
}
