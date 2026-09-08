import { plan } from "./plan.mjs";
export async function change(view, api) {
  const config = plan(view);
  return await api.publish({ config });
}
