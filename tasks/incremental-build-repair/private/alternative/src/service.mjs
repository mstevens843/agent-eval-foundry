import { build } from "./builder.mjs";
export async function run(view, api) {
  for (let round; (round = await api.next({})) !== null; )
    await api.publish({ round: round.id, outputs: await build(round, api) });
  return { complete: true };
}
