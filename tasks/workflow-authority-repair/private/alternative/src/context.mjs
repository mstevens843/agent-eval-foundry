export function principal(job, jobs) {
  if (job.parent === null) return job.principal;
  return jobs.find((j) => j.id === job.parent).principal;
}
