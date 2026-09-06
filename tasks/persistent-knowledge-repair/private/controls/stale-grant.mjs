export function authorized(request, grants, result) {
  return !!result?.approved && grants.some((g) => g.destination === request.destination && g.allowed);
}
