export function resolveTarget(event, api) {
  for (let i = 0; i < 8; i++) {
    api.settle({});
    const first = api.query({ step: event.step })[0];
    if (first && api.observe({ handle: first.handle }).connected) return first;
  }
  throw Error("unavailable");
}
