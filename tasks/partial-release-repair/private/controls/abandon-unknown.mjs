export function perform(api, method, args) {
  return api[method](args);
}
