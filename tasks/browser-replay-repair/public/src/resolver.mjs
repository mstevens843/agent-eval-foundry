export function resolveTarget(event, api) {
  const candidates = api.query({ step: event.step });
  return candidates.find((node) => node.selector === event.selector) ?? candidates[0];
}
