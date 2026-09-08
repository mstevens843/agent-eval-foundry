import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      next: async (r) => {
        const step = await api.next(r);
        if (step.event?.kind === "purge") step.event.tiers = ["edge-a", "edge-b", "shield"];
        return step;
      },
    });
  },
};
