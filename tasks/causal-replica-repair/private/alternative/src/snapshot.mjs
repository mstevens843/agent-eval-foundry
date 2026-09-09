export function capture(view, api) {
  return new Map(view.replicas.map((replica) => [replica, api.read({ replica }).documents]));
}
export const empty = () => ({ context: {}, values: [] });
