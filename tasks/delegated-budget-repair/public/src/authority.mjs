export function describe(request, api, cache) {
  cache[request.wallet] ??= api.describe({ wallet: request.wallet });
  return cache[request.wallet];
}
