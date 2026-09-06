export function submitForm(node, event, api) {
  api.act({ handle: node.handle, kind: "fill", value: event.value });
  api.observe({ handle: node.handle });
  return api.act({ handle: node.handle, kind: "submit" }).ok;
}
