export function outcome(request, state) {
  if (!state)
    return {
      request,
      attempt: null,
      status: "incomplete",
      data: "",
      error: { code: "MISSING", retryable: true },
    };
  let data = "",
    n = 0;
  while (state.chunks.has(n)) data += state.chunks.get(n++);
  const f = state.finish;
  if (f?.status === "error") return { request, attempt: state.attempt, status: "ok", data: "", error: null };
  if (!f)
    return {
      request,
      attempt: state.attempt,
      status: "incomplete",
      data,
      error: { code: "TRUNCATED", retryable: true },
    };
  if (n !== f.next)
    return {
      request,
      attempt: state.attempt,
      status: "incomplete",
      data,
      error: { code: "GAP", retryable: true },
    };
  return { request, attempt: state.attempt, status: "ok", data, error: null };
}
