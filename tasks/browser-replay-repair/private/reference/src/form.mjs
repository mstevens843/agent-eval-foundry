export function submitForm(node, event, api) {
  api.act({ handle: node.handle, kind: "fill", value: event.value });
  const state = api.observe({ handle: node.handle });
  if (!state.connected || !state.ready || state.value !== event.value) return false;
  const result = api.act({ handle: node.handle, kind: "submit" });
  if (!result.ok) return false;
  if (result.pending) {
    while (!api.settle({}).stable) {}
    const dialog = api.dialog({});
    if (
      !dialog ||
      dialog.entity !== event.entity ||
      dialog.field !== event.field ||
      dialog.value !== event.value
    )
      return false;
    if (!api.confirm({ handle: dialog.handle }).ok) return false;
  }
  return true;
}
