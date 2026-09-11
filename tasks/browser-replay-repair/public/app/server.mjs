import { createServer } from "node:http";
import { html } from "./page.mjs";
export const operationId = (traceId, step) => JSON.stringify([traceId, step]);
export async function startApplication(config, { port = 0, authorizationToken = null } = {}) {
  const traceId = config.traceId,
    forms = config.events.map((e) => ({ ...e, operationId: operationId(traceId, e.step) }));
  const state = {
    tick: 0,
    generation: 0,
    session: 0,
    authenticated: !config.renew,
    effects: [],
    operations: [],
    dialogs: [],
    actions: [],
    navigations: [],
    nextDialog: 0,
  };
  const visited = new Set();
  if (config.competing)
    state.dialogs.push({
      id: "stale",
      operationId: operationId(traceId, -1),
      entity: forms[0].entity,
      field: forms[0].field,
      value: forms[0].value,
      stale: true,
    });
  function facts(path) {
    state.generation++;
    return {
      path,
      session: state.session,
      authenticated: state.authenticated,
      forms: forms
        .filter((f) => f.path === path)
        .flatMap((f) => [
          ...(config.decoy
            ? [{ ...f, operationId: f.operationId + "-decoy", entity: "other-" + f.entity }]
            : []),
          { ...f },
        ])
        .map((f) => ({
          operationId: f.operationId,
          entity: f.entity,
          field: f.field,
          selector: f.selector,
          generation: state.generation,
          ready: state.tick >= (config.delay ?? 0),
        })),
      dialogs: structuredClone(state.dialogs),
    };
  }
  function queue(payload, confirmation) {
    let op = state.operations.find((o) => o.operationId === payload.operationId);
    if (op) {
      const same = ["entity", "field", "value"].every((k) => op[k] === payload[k]);
      return same ? { ok: true, pending: true } : { ok: false, code: "CONFLICT" };
    }
    op = {
      operationId: payload.operationId,
      entity: payload.entity,
      field: payload.field,
      value: payload.value,
      commitAt: state.tick + 1,
      visibleAt: state.tick + 1 + (config.receiptLag ?? 2),
      confirmation,
    };
    state.operations.push(op);
    return { ok: true, pending: true };
  }
  const server = createServer(async (req, res) => {
    try {
      // Evaluation's browser owns this credential; a submitted Node process must
      // not bypass the bridge by sending loopback HTTP mutations directly.
      if (authorizationToken !== null && req.headers["x-replay-authority"] !== authorizationToken) {
        res.statusCode = 401; res.end(JSON.stringify({error:"unauthorized"})); return;
      }
      const url = new URL(req.url, "http://localhost");
      res.setHeader("cache-control", "no-store");
      if (req.method === "GET" && url.pathname === "/facts") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(facts(url.searchParams.get("path"))));
        return;
      }
      if (req.method === "GET" && url.pathname === "/debug") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(state));
        return;
      }
      if (req.method === "GET") {
        if (!visited.has(url.pathname)) {
          visited.add(url.pathname);
          if (config.renew && state.navigations.length) state.authenticated = false;
        }
        state.navigations.push(url.pathname);
        res.setHeader("content-type", "text/html");
        res.end(html);
        return;
      }
      let text = "";
      for await (const c of req) {
        text += c;
        if (text.length > 65536) throw Error("request size");
      }
      const r = JSON.parse(text || "{}");
      let value;
      if (url.pathname === "/renew") {
        state.session++;
        state.authenticated = true;
        value = { ok: true, session: state.session };
      } else if (url.pathname === "/advance") {
        state.tick++;
        for (const op of state.operations)
          if (!op.committed && state.tick >= op.commitAt) {
            op.committed = true;
            state.effects.push({
              operationId: op.operationId,
              entity: op.entity,
              field: op.field,
              value: op.value,
              confirmation: op.confirmation,
            });
          }
        value = {
          stable:
            state.tick >= (config.delay ?? 0) && state.operations.every((o) => state.tick >= o.visibleAt),
        };
      } else if (url.pathname === "/operation") {
        const op = state.operations.find((o) => o.operationId === r.operationId);
        value = !op
          ? { status: "ABSENT" }
          : state.tick < op.visibleAt
            ? { status: "PENDING" }
            : {
                status: "COMMITTED",
                receipt: { operationId: op.operationId, entity: op.entity, field: op.field, value: op.value },
              };
      } else if (url.pathname === "/submit") {
        if (!state.authenticated || r.session !== state.session) value = { ok: false, code: "SESSION" };
        else if (r.generation !== state.generation) value = { ok: false, code: "STALE" };
        else {
          state.actions.push({ kind: "submit", ...r });
          const known = state.operations.find((o) => o.operationId === r.operationId);
          if (known) value = queue(r, known.confirmation);
          else if (config.confirmation) {
            let d = state.dialogs.find((d) => d.operationId === r.operationId && !d.stale);
            if (!d) {
              d = {
                id: "dialog-" + state.nextDialog++,
                operationId: r.operationId,
                entity: r.entity,
                field: r.field,
                value: r.value,
              };
              state.dialogs.push(d);
            }
            value = { ok: true, pending: true };
          } else value = queue(r, null);
        }
      } else if (url.pathname === "/confirm") {
        const d = state.dialogs.find((d) => d.id === r.id);
        if (!state.authenticated || r.session !== state.session) value = { ok: false, code: "SESSION" };
        else if (!d || d.operationId !== r.operationId) value = { ok: false, code: "STALE" };
        else {
          state.actions.push({ kind: "confirm", ...d, session: r.session });
          value = queue(d, { id: d.id, operationId: d.operationId });
          state.dialogs = state.dialogs.filter((x) => x.id !== d.id);
          if (config.competing) state.dialogs.unshift({ ...d, id: "old-" + d.id, stale: true });
        }
      } else value = { error: "request" };
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(value));
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: String(e.message) }));
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  return { url, state, close: () => new Promise((resolve) => server.close(resolve)) };
}
