export function healthy(samples, service, deployment) {
  const current = samples
    .filter(
      (s) =>
        s.service === service.id &&
        s.release === deployment.release &&
        s.generation === deployment.generation,
    )
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, 2);
  return current.length === 2 && current.every((s) => s.ok);
}
