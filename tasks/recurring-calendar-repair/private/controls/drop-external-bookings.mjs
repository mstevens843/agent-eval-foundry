import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run({ ...view, externalBookings: [] }, api);
  },
};
