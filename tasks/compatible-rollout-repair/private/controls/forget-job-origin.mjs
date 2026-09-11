export async function origin(view,api) {
  return {services:await api.inventory({}),stages:await api.stages({})};
}
