export function authorized(request, grants, result) {
  return !!result?.approved && !!grants.find((g) => g.destination === request.destination && g.allowed);
}
