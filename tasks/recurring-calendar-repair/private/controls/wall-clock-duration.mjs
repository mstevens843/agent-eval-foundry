import { run } from "./src/service.mjs";
import { utc, minute, civil } from "./src/time.mjs";
export const subject = {
  run: (view, api) =>
    run(view, {
      ...api,
      commit: (r) =>
        api.commit({
          ...r,
          events: r.events.map((e) =>
            e.startUTC === null
              ? e
              : {
                  ...e,
                  endUTC: utc(
                    civil(minute(e.startLocal) + (e.endUTC - e.startUTC)),
                    view.zones.find((z) => z.id === e.zone),
                  ),
                },
          ),
        }),
    }),
};
