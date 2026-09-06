// Receipt-first state interpreter: no durable handle or journal cache.
export const subject = {
  run(view, api) {
    for (const event of view.events) {
      for (let round = 0; round < 12; round++) {
        if (api.receipts({}).some((r) => r.traceId === view.traceId && r.step === event.step)) break;
        api.settle({});
        const modal = api.dialog({});
        if (modal && modal.entity === event.entity && modal.value === event.value) {
          api.confirm({ handle: modal.handle });
          continue;
        }
        const candidates = api.query({ step: event.step });
        const target = candidates
          .map((n) => ({ ...n, state: api.observe({ handle: n.handle }) }))
          .find(
            (n) =>
              n.state.connected &&
              n.state.ready &&
              n.state.entity === event.entity &&
              n.state.field === event.field,
          );
        if (!target) continue;
        if (target.state.value !== event.value)
          api.act({ handle: target.handle, kind: "fill", value: event.value });
        const current = api.observe({ handle: target.handle });
        if (current.connected && current.ready && current.value === event.value)
          api.act({ handle: target.handle, kind: "submit" });
      }
    }
    return { traceId: view.traceId, steps: view.events.map((e) => ({ step: e.step, status: "completed" })) };
  },
};
