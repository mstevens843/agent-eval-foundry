import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
function decode(response, d) {
  if (!response) return null;
  const raw = Buffer.from(response.bytes, "base64"),
    hash = (x) => createHash("sha256").update(x).digest("hex");
  if (raw.length !== d.size || hash(raw) !== d.digest) return null;
  try {
    const plain = gunzipSync(raw, { maxOutputLength: 1048576 });
    if (hash(plain) !== d.plainDigest) return null;
    return JSON.parse(plain);
  } catch {
    return null;
  }
}
// Queries origin BEFORE cache (the reference queries cache first) -- a different but equally
// valid order under "neither source has precedence over a verified copy from the other".
export async function content(api, d) {
  return (
    decode(await api.fetch({ url: d.url, digest: d.digest }), d) ?? decode(await api.cache({ url: d.url }), d)
  );
}
