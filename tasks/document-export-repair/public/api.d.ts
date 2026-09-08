export type Encoding = "utf8" | "base64" | "gzip-base64";
export interface Part {
  id: string;
  name: string;
  media: "text/plain" | "application/json" | "message/support+json" | "application/octet-stream";
  encoding: Encoding;
  data: string;
  links: string[];
}
export interface Message {
  id: string;
  subject: string;
  headers: { name: string; value: string }[];
  tags: string[];
  related: string[];
  parts: Part[];
}
export interface Policy {
  literals: string[];
  fields: string[];
}
export interface View {
  ticketIds: string[];
  policy: Policy;
  storage: string;
}
export interface API {
  read(r: { id: string }): Promise<{ ticket: Message } | { error: "not-found" }>;
  publish(r: { id: string; data: string }): Promise<{ stored: true } | { error: "payload" }>;
}
