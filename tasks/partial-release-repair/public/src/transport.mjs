export function perform(api, method, args) {
  let result = api[method](args);
  if (result.status === "REJECTED") return result;
  if (result.status === "UNKNOWN") {
    for (let i = 0; i < 3; i++) {
      result = api.receipt({ token: result.token });
      if (result.status !== "PENDING") break;
    }
    if (result.status === "ABSENT") return perform(api, method, args);
  }
  return result;
}
