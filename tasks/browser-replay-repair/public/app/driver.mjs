export async function createDriver(page, url, config = {}) {
  const handles = new Map();
  let next = 0,
    remounted = false,
    filledRemount = false;
  await page.goto(url + "/");
  await page.evaluate(() => window.ready);
  const post = (path, data) => page.evaluate(({ path, data }) => window.rpc(path, data), { path, data });
  const refresh = () => page.evaluate(() => window.refresh());
  const describe = async (handle) => {
    const node = handles.get(handle);
    if (!node) return { connected: false };
    try {
      return await node.evaluate((el) => window.describe(el));
    } catch {
      return { connected: false };
    }
  };
  return {
    location: async () =>
      page.evaluate(() => ({
        path: location.pathname,
        authenticated: window.facts.authenticated,
        session: window.facts.session,
      })),
    navigate: async ({ path }) => {
      if (typeof path !== "string" || !path.startsWith("/records/")) return { ok: false, code: "PATH" };
      await page.goto(url + path);
      await page.evaluate(() => window.ready);
      return { ok: true };
    },
    renew: async () => {
      const r = await post("/renew", {});
      await refresh();
      return r;
    },
    query: async () => {
      const result = [];
      for (const node of await page.$$("main section")) {
        const handle = "h" + ++next;
        handles.set(handle, node);
        result.push({ handle, ...(await node.evaluate((el) => window.describe(el))) });
      }
      if (config.remount && !remounted) {
        remounted = true;
        await refresh();
      }
      return result;
    },
    observe: async ({ handle }) => describe(handle),
    fill: async ({ handle, value }) => {
      const before = await describe(handle);
      if (!before.connected || !before.ready) return { ok: false, code: "STALE" };
      if (typeof value !== "string" || value.length > 256) return { ok: false, code: "VALUE" };
      await (await handles.get(handle).$("input")).fill(value);
      const state = await describe(handle);
      if (config.remountAfterFill && !filledRemount) {
        filledRemount = true;
        await refresh();
      }
      return { ok: true, state };
    },
    submit: async ({ handle, expected }) => {
      const state = await describe(handle);
      if (!state.connected) return { ok: false, code: "STALE" };
      return handles.get(handle).evaluate((el, expected) => window.submitIf(el, expected), expected ?? {});
    },
    dialogs: async () =>
      page.evaluate(() =>
        structuredClone(window.facts.dialogs).map((d) => ({ ...d, session: window.facts.session })),
      ),
    confirm: async ({ id, operationId, session }) => {
      return page.evaluate(
        async (r) => {
          const d = window.facts.dialogs.find((d) => d.id === r.id);
          if (!d || d.operationId !== r.operationId || window.facts.session !== r.session)
            return { ok: false, code: "STALE" };
          const el = [...document.querySelectorAll("#dialogs article")].find(
            (el) => el.dataset.dialogId === r.id,
          );
          if (!el) return { ok: false, code: "STALE" };
          await el.querySelector("button").onclick();
          return window.lastResult;
        },
        { id, operationId, session },
      );
    },
    settle: async () => {
      const r = await post("/advance", {});
      await refresh();
      return r;
    },
    operation: async ({ operationId }) => post("/operation", { operationId }),
  };
}
