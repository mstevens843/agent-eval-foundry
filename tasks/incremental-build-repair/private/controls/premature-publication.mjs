import { inputs } from "./src/includes.mjs";
import { key } from "./src/key.mjs";

// Bug: this candidate predicts the "built-N" handle a not-yet-issued compile call will
// receive (tracking its OWN cumulative successful compile-call count for this run) and
// publishes each round's outputs using that prediction BEFORE actually invoking the
// compiler for the newly-needed actions -- rather than strictly sequencing its own real
// "issue attestation" (compile) and "publish" calls. By the time this candidate finally
// calls compile() for each predicted action (right after publishing), the predicted
// handle does become a real, byte-correct attestation -- but at the moment of publish()
// it did not exist yet.
export const subject = {
  run: async (_view, api) => {
    let issuedSoFar = 0; // reset per attempt/run -- must stay in lockstep with THIS
    // run's own fresh compile-call sequence, never leak across unrelated runs.
    for (let round; (round = await api.next({})) !== null; ) {
      const known = new Map();
      for (const handle of await api.artifacts({})) {
        const record = await api.inspect({ handle });
        if (record) known.set(key(record.recipe), handle);
      }
      const byId = new Map(round.actions.map((a) => [a.id, a])),
        built = new Map(),
        pending = [];
      function visit(id) {
        if (built.has(id)) return built.get(id);
        const a = byId.get(id);
        for (const d of a.deps) visit(d.action);
        const recipe = {
          action: id,
          entry: a.entry,
          tool: a.tool,
          flags: a.flags,
          files: inputs(a.entry, round.files),
          dependencies: a.deps.map((d) => ({ alias: d.alias, handle: built.get(d.action) })),
        };
        let handle = known.get(key(recipe));
        if (!handle) {
          handle = "built-" + ++issuedSoFar; // predicted, not yet real
          pending.push(recipe);
          known.set(key(recipe), handle);
        }
        built.set(id, handle);
        return handle;
      }
      const outputs = round.targets.map((target) => ({ target, handle: visit(target) }));
      await api.publish({ round: round.id, outputs }); // published using predicted handles
      for (const recipe of pending) {
        const answer = await api.compile(recipe); // only now actually issued
        if (!answer.handle) throw Error("compiler refused recipe");
      }
    }
    return { complete: true };
  },
};
