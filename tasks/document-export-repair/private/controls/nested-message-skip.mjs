import { decode, encode } from "./codec.mjs";
import { filter, jsonValue } from "./policy.mjs";
export function transform(input, policy) {
  const ticket = structuredClone(input);
  ticket.subject = filter(ticket.subject, policy);
  ticket.headers = ticket.headers.map((h) => ({ ...h, value: filter(h.value, policy) }));
  for (const part of ticket.parts) {
    part.name = filter(part.name, policy);
    if (part.media === "text/plain")
      part.data = encode(Buffer.from(filter(decode(part).toString("utf8"), policy)), part.encoding);
    if (part.media === "application/json") {
      const value = JSON.parse(decode(part).toString("utf8"));
      part.data = encode(Buffer.from(JSON.stringify(jsonValue(value, policy))), part.encoding);
    }
  }
  return ticket;
}
