import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      commit: (r) =>
        api.commit({
          ...r,
          bookings: r.bookings.map((b) => {
            const e = r.events.find((e) => JSON.stringify([e.uid, e.rid]) === b.key);
            return e ? { ...b, key: JSON.stringify([e.uid, e.startLocal]) } : b;
          }),
        }),
    });
  },
};
