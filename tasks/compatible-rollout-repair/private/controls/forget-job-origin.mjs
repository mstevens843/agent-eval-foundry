export function origin(view,api) {
  return {services:api.inventory({}),stages:api.stages({})};
}
