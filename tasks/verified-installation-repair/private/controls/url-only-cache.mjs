import { gunzipSync } from "node:zlib";
export async function content(api, d) {
  const raw = (await api.cache({ url: d.url })) ?? (await api.fetch({ url: d.url, digest: d.digest }));
  if (!raw) return null;
  return JSON.parse(gunzipSync(Buffer.from(raw.bytes, "base64")));
}
