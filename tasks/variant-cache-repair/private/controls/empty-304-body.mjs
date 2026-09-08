import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    let conditional = false;
    return run(view, {
      ...api,
      next: async (r) => {
        conditional = false;
        return api.next(r);
      },
      origin: async (r) => {
        const x = await api.origin(r);
        conditional = x.status === 304;
        return x;
      },
      deliver: (r) => api.deliver(conditional ? { response: { ...r.response, body: "" } } : r),
    });
  },
};
