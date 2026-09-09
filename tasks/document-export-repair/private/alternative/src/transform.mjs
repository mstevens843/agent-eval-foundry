import { decode, encode } from "./codec.mjs";
import { filter, jsonValue } from "./policy.mjs";
export function transform(input, policy) {
  const ticket = structuredClone(input);
  ticket.subject = filter(ticket.subject, policy);
  ticket.headers = ticket.headers.map((h) => ({ ...h, value: filter(h.value, policy) }));
  for (const part of ticket.parts) {
    part.name = filter(part.name, policy);
    if (part.media === "application/octet-stream") continue;
    const text = decode(part).toString("utf8");
    const data =
      part.media === "text/plain"
        ? filter(text, policy)
        : JSON.stringify(
            part.media === "message/support+json"
              ? transform(JSON.parse(text), policy)
              : jsonValue(JSON.parse(text), policy),
          );
    part.data = encode(Buffer.from(data), part.encoding);
  }
  return ticket;
}
