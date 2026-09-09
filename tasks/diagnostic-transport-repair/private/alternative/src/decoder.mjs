export async function decode(api) {
  const records = [];
  for (let item; (item = await api.next({})) !== null; ) {
    const text = Buffer.from(item.bytes, "base64").toString("utf8");
    for (const line of text.split(/\r?\n/))
      if (line.trim()) {
        try {
          records.push(JSON.parse(line));
        } catch {}
      }
  }
  return records;
}
