export function settle(request, _job, api) {
  for (let retry = 0; retry < 4; retry++) {
    let response = api.lookup({ key: request.id });
    if (response.status === "ACCEPTED") return response.receipt;
    if (response.status === "ABSENT") response = api.debit({ ...request, key: request.id });
    if (response.status === "ACCEPTED") return response.receipt;
    for (let poll = 0; poll < 3; poll++) {
      response = api.lookup({ key: request.id });
      if (response.status === "ACCEPTED") return response.receipt;
      if (response.status === "ABSENT") break;
    }
  }
  throw Error("transport contract did not settle");
}
