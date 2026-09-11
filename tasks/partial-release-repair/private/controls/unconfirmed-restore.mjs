// Correctly waits out a remove's own receipt (poll, then reissue on the next attempt when the
// poll shows the first attempt did not land) but, for a create, treats ANY resolved receipt --
// DONE or ABSENT alike -- as proof the create landed. A receipt that resolves ABSENT means
// exactly the opposite: this specific attempt did NOT land and the create must be reissued.
// On a remove-then-recreate-same-id sequence whose restore create is itself uncertain, this
// confirms the removal correctly, then abandons the restore the moment its first attempt's own
// receipt resolves -- leaving that id's later incarnation never actually created, even though a
// receipt was dutifully read. Never throws on a downstream REJECTED (a dependent create that
// can no longer find its now-uncreated parent), so the run always completes and the final graph
// -- not an exception -- is what's wrong.
export async function perform(api, method, args) {
  if (method === "remove") {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await api.remove(args);
      if (response.status === "DONE") return;
      if (response.status !== "UNKNOWN") return;
      for (let poll = 0; poll < 3; poll++) {
        const r = await api.receipt({ token: response.token });
        if (r.status === "DONE") return;
        if (r.status === "ABSENT") break;
      }
    }
    return;
  }
  const response = await api.create(args);
  if (response.status !== "UNKNOWN") return;
  for (let poll = 0; poll < 3; poll++) {
    const r = await api.receipt({ token: response.token });
    // BUG: any terminal resolution is treated as "the restore landed", including ABSENT -- which
    // actually means this attempt did not land and a correct implementation must reissue
    // api.create here instead of returning.
    if (r.status !== "PENDING") return;
  }
}
