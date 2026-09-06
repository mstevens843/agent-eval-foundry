export function eligible(request, wallet) {
  const grant = wallet?.grants.find(
    (g) => g.id === request.grant && g.delegate === request.delegate && g.version === request.grantVersion,
  );
  return wallet?.owner === request.owner && !!grant?.allowed && grant.spent + request.credits <= grant.limit;
}
