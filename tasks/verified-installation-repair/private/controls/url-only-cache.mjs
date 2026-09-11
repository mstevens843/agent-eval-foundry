import { gunzipSync } from "node:zlib";
export async function content(api, d) {
  const raw = (await api.cache({ url: d.url })) ?? (await api.fetch({ url: d.url, digest: d.digest }));
  if (!raw) return null;
  try {
    return JSON.parse(gunzipSync(Buffer.from(raw.bytes, "base64")));
  } catch {
    // Still no digest/size/plainDigest verification (that is the defect under test) -- but
    // genuinely undecodable bytes are treated as unavailable rather than crashing the process.
    return null;
  }
}
