export async function perform(api, method, args) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await api[method](args);
    if (response.status === "DONE") return;
    if (response.status !== "UNKNOWN") throw Error("release rejected");
    for (let poll = 0; poll < 3; poll++) {
      const r = await api.receipt({ token: response.token });
      if (r.status === "DONE") return;
      if (r.status === "ABSENT") break;
    }
  }
  throw Error("unresolved release");
}
