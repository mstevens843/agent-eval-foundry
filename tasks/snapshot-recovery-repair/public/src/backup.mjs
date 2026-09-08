export function encode(view, state) {
  return Buffer.from(
    JSON.stringify({ tenant: view.tenant, branch: view.branch, cutoff: view.cutoff, ...state }),
  ).toString("base64");
}
