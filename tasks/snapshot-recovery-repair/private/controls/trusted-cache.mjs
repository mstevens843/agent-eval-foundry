export async function load(api, d) {
  const x = (await api.cache({ digest: d.digest })) ?? (await api.fetch({ digest: d.digest }));
  return JSON.parse(Buffer.from(x.bytes, "base64"));
}
