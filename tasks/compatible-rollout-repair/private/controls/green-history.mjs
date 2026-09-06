export function healthy(samples, _service, _deployment) {
  return samples.some((s) => s.ok);
}
