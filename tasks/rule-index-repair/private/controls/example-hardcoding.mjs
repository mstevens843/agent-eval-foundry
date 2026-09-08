export const subject = {
  run(v, api) {
    return api.publish({
      program: {
        entry: 0,
        code: [
          { op: "char", value: "a", fold: false, next: 1 },
          { op: "char", value: "b", fold: false, next: 2 },
          { op: "char", value: "c", fold: false, next: 3 },
          { op: "accept", ruleId: "one", tag: "plain", slots: 0 },
        ],
      },
    });
  },
};
