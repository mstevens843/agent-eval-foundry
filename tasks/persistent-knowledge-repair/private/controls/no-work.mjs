export const subject = {
  run(view) {
    return {
      job: view.job,
      decisions: view.requests.map((r) => ({ id: r.id, outcome: "blocked", lineage: [] })),
    };
  },
};
