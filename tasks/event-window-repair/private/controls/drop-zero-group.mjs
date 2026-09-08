import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      emit: (r) => (r.row.total === 0 ? Promise.resolve({ stored: true }) : api.emit(r)),
    });
  },
};
