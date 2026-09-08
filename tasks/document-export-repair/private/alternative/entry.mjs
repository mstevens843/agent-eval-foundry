import { gunzipSync, gzipSync } from "node:zlib";
function literal(text, p) {
  const escaped = [...p.literals]
    .sort((a, b) => b.length - a.length)
    .map((x) => x.replace(/[.*+?^{}$()|[\]\\]/g, "\\$&"));
  return text.replace(new RegExp(escaped.join("|"), "g"), () => "[REDACTED]");
}
function json(root, p) {
  const holder = { value: root },
    work = [[holder, "value", false]];
  while (work.length) {
    const [parent, k, field] = work.pop(),
      v = parent[k];
    if (typeof v === "string") parent[k] = field ? "[REDACTED]" : literal(v, p);
    else if (v && typeof v === "object")
      for (const key of Object.keys(v)) work.push([v, key, !Array.isArray(v) && p.fields.includes(key)]);
  }
  return holder.value;
}
function message(root, p) {
  const jobs = [{ message: root, after: false }];
  while (jobs.length) {
    const job = jobs.pop();
    if (job.after) {
      job.part.data = pack(Buffer.from(JSON.stringify(job.child)), job.part.encoding);
      continue;
    }
    const m = job.message;
    m.subject = literal(m.subject, p);
    for (const h of m.headers) h.value = literal(h.value, p);
    for (const part of m.parts) {
      part.name = literal(part.name, p);
      if (part.media === "application/octet-stream") continue;
      let bytes = part.encoding === "utf8" ? Buffer.from(part.data) : Buffer.from(part.data, "base64");
      if (part.encoding === "gzip-base64") bytes = gunzipSync(bytes);
      if (part.media === "message/support+json") {
        const child = JSON.parse(bytes);
        jobs.push({ after: true, part, child });
        jobs.push({ message: child, after: false });
      } else {
        const text =
          part.media === "text/plain"
            ? literal(bytes.toString(), p)
            : JSON.stringify(json(JSON.parse(bytes), p));
        part.data = pack(Buffer.from(text), part.encoding);
      }
    }
  }
  return root;
}
function pack(bytes, enc) {
  return enc === "utf8"
    ? bytes.toString()
    : (enc === "gzip-base64" ? gzipSync(bytes) : bytes).toString("base64");
}
export const subject = {
  async run(view, api) {
    for (const id of [...view.ticketIds].reverse()) {
      const { ticket } = await api.read({ id });
      await api.publish({
        id,
        data: Buffer.from(JSON.stringify(message(ticket, structuredClone(view.policy)))).toString("base64"),
      });
    }
    return { complete: true };
  },
};
