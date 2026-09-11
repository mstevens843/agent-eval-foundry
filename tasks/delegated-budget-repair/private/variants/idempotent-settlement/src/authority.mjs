export function describe(request, api) {
  return api.describe({ wallet: request.wallet });
}
