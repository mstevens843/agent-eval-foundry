export function resolveTarget(event, api) {
  for (let retry = 0; retry < 8; retry++) {
    while (!api.settle({}).stable) {}
    const nodes = api.query({ step: event.step });
    for (const node of nodes) {
      const state = api.observe({ handle: node.handle });
      if (state.connected && state.ready && state.entity === event.entity && state.field === event.field)
        return node;
    }
  }
  throw Error("no usable form");
}
