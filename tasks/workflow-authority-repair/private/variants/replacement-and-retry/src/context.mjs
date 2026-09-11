export function principal(job, jobs) {
  const map = new Map(jobs.map((j) => [j.id, j]));
  while (job.parent !== null) job = map.get(job.parent);
  return job.principal;
}
