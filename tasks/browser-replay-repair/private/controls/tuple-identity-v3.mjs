const id = (view, event) => JSON.stringify([view.traceId, event.step]);
export async function run(view, api, { fillProof = false, retry = false, recover = false } = {}) {
  if (recover) await api.submit({ handle: "missing", expected: {} });
  for (const e of view.events) {
    const operationId = id(
      view,
      view.events.find((x) => x.entity === e.entity && x.field === e.field && x.value === e.value),
    );
    for (;;) {
      const status = await api.operation({ operationId });
      if (status.status === "COMMITTED") break;
      if (status.status === "PENDING") {
        await api.settle({});
        continue;
      }
      const location = await api.location({});
      if (location.path !== e.path) {
        await api.navigate({ path: e.path });
        continue;
      }
      if (!location.authenticated) {
        await api.renew({});
        continue;
      }
      const dialogs = await api.dialogs({});
      const dialog = dialogs.find(
        (d) =>
          d.operationId === operationId &&
          d.entity === e.entity &&
          d.field === e.field &&
          d.value === e.value,
      );
      if (dialog) {
        await api.confirm({ id: dialog.id, operationId, session: dialog.session });
        continue;
      }
      const candidates = await api.query({});
      let acted = false;
      for (const c of candidates) {
        const seen = await api.observe({ handle: c.handle });
        if (
          !seen.connected ||
          !seen.ready ||
          seen.operationId !== operationId ||
          seen.entity !== e.entity ||
          seen.field !== e.field
        )
          continue;
        const fill = await api.fill({ handle: c.handle, value: e.value });
        if (!fill.ok) continue;
        const current = fillProof ? fill.state : await api.observe({ handle: c.handle });
        if (!current.connected || current.value !== e.value) continue;
        await api.submit({ handle: c.handle, expected: current });
        if (retry) await api.submit({ handle: c.handle, expected: current }); // stale or idempotent: both legal
        acted = true;
        break;
      }
      if (!acted) await api.settle({});
    }
  }
  return { traceId: view.traceId, steps: view.events.map((e) => ({ step: e.step, status: "completed" })) };
}
