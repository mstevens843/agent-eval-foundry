export function submitForm(node, event, api) {
  api.observe({ handle: node.handle });
  api.act({ handle: node.handle, kind: "fill", value: event.value });
  const result = api.act({ handle: node.handle, kind: "submit" });
  if (result.pending) {
    api.settle({});
    const d = api.dialog({});
    if (d) api.confirm({ handle: d.handle });
  }
  return result.ok;
}
