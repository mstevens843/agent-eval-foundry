import { createHash } from "node:crypto";
export function decode(value, descriptor) {
  const bytes = Buffer.from(value.bytes, "base64");
  if (
    bytes.length !== descriptor.size ||
    createHash("sha256").update(bytes).digest("hex") !== descriptor.digest
  )
    return null;
  return JSON.parse(bytes.toString("utf8"));
}
export async function load(api, descriptor) {
  const cached = await api.cache({ digest: descriptor.digest });
  if (cached) {
    const result = decode(cached, descriptor);
    if (result) return result;
  }
  const result = decode(await api.fetch({ digest: descriptor.digest }), descriptor);
  if (!result) throw Error("archive bytes unavailable");
  return result;
}
