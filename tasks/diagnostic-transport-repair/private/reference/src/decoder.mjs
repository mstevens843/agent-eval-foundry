import { StringDecoder } from "node:string_decoder";
export async function decode(api) {
  const channels = new Map(),
    records = [];
  function lines(s, final = false) {
    let at;
    while ((at = s.text.indexOf("\n")) >= 0) {
      const line = s.text.slice(0, at).replace(/\r$/, "");
      s.text = s.text.slice(at + 1);
      if (line.trim()) records.push(JSON.parse(line));
    }
    if (final && s.text.trim()) records.push(JSON.parse(s.text));
  }
  for (let item; (item = await api.next({})) !== null; ) {
    let s = channels.get(item.channel);
    if (!s) {
      s = { decoder: new StringDecoder("utf8"), text: "" };
      channels.set(item.channel, s);
    }
    s.text += s.decoder.write(Buffer.from(item.bytes, "base64"));
    lines(s);
  }
  for (const s of channels.values()) {
    s.text += s.decoder.end();
    lines(s, true);
  }
  return records;
}
