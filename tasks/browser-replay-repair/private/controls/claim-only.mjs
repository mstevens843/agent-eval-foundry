export const subject = {
  run(view) {
    return { traceId: view.traceId, steps: view.events.map((e) => ({ step: e.step, status: "completed" })) };
  },
};
