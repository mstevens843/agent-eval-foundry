export function settle(request, _job, api) {
  const response = api.debit({ ...request, key: request.id });
  return response.status === "ACCEPTED" ? response.receipt : null;
}
