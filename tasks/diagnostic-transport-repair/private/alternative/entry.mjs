export const subject = {
  async run(v, api) {
    const buffers = new Map();
    for (let c; (c = await api.next({})) !== null; ) {
      const old = buffers.get(c.channel) ?? [];
      old.push(Buffer.from(c.bytes, "base64"));
      buffers.set(c.channel, old);
    }
    const records = [...buffers.values()].flatMap((bs) =>
      Buffer.concat(bs)
        .toString("utf8")
        .split("\n")
        .filter((s) => s.trim())
        .map((s) => JSON.parse(s)),
    );
    for (const request of v.requests) {
      const own = records.filter((r) => r.request === request).sort((a, b) => b.attempt - a.attempt),
        attempt = own[0]?.attempt ?? null;
      const active = own.filter((r) => r.attempt === attempt),
        end = active.find((r) => r.kind === "finish"),
        parts = active.filter((r) => r.kind === "chunk");
      let data = "",
        n = 0;
      for (;;) {
        const part = parts.find((r) => r.seq === n);
        if (!part) break;
        data += part.value;
        n++;
      }
      let status = "ok",
        error = null;
      if (attempt === null) {
        status = "incomplete";
        error = { code: "MISSING", retryable: true };
      } else if (end?.status === "error") {
        status = "error";
        error = { code: end.code, retryable: end.retryable };
      } else if (!end) {
        status = "incomplete";
        error = { code: "TRUNCATED", retryable: true };
      } else if (n !== end.next) {
        status = "incomplete";
        error = { code: "GAP", retryable: true };
      }
      await api.record({ row: { request, attempt, status, data, error } });
    }
    return { complete: true };
  },
};
