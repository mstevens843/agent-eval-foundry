import { gunzipSync, gzipSync } from "node:zlib";
export function decode(part) {
  if (part.encoding === "utf8") return Buffer.from(part.data, "utf8");
  const bytes = Buffer.from(part.data, "base64");
  return part.encoding === "gzip-base64" ? gunzipSync(bytes) : bytes;
}
export function encode(bytes, encoding) {
  if (encoding === "utf8") return bytes.toString("utf8");
  return (encoding === "gzip-base64" ? gzipSync(bytes) : bytes).toString("base64");
}
