import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      commit: (r) =>
        api.commit({
          ...r,
          events: r.events.map((e) => ({
            ...e,
            attendees: e.attendees.map((a) => ({ ...a, response: "accepted" })),
          })),
        }),
    });
  },
};
