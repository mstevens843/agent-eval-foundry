export function principal(job, jobs) {
  const index = new Map(jobs.map((j) => [j.id, j]));
  while (job.parent !== null) job = index.get(job.parent);
  return job.principal;
}
