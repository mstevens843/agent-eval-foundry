export function submitForm(node, event, api) {
  const state = api.observe({ handle: node.handle });
  if (!state.connected || !state.ready) return false;
  api.act({ handle: node.handle, kind: "fill", value: event.value });
  return api.act({ handle: node.handle, kind: "submit" }).ok;
}
