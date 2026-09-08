import { reconcile } from "./src/service.mjs";
export const subject = {
  run(v, a) {
    return reconcile({ ...v, documents: [...v.documents, "untouched"] }, a);
  },
};
