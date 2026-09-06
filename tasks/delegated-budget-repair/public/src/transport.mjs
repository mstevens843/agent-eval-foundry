export function settle(request, job, api) {
  const response = api.debit({ ...request, key: `${job}:${request.id}` });
  return response.status === "ACCEPTED" ? response.receipt : null;
}
