export function eligible(request, wallet) {
  const grant = wallet?.grants.find((g) => g.id === request.grant && g.delegate === request.delegate);
  return wallet?.owner === request.owner && grant?.allowed && request.credits <= grant.limit;
}
