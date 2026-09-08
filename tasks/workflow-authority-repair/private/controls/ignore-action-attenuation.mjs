export function pathFor(policy, job, origin) {
  const start = policy.owners[job.resource],
    queue = [{ principal: start, path: [], seen: new Set([start]) }];
  while (queue.length) {
    const current = queue.shift();
    if (current.principal === origin) return current.path;
    for (const g of policy.grants)
      if (
        g.from === current.principal &&
        g.active &&
        g.resources.includes(job.resource) &&
        !current.seen.has(g.to)
      ) {
        queue.push({
          principal: g.to,
          path: [...current.path, g.id],
          seen: new Set([...current.seen, g.to]),
        });
      }
  }
  return null;
}
