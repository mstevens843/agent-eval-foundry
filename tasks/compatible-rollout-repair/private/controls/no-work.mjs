export const subject = {
  run(view) {
    return {
      job: view.job,
      results: view.requests.map((r) => ({ service: r.service, status: "deployed", release: "target-a" })),
    };
  },
};
