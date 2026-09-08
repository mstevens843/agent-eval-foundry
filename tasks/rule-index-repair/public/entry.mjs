import { compile } from "./src/compiler.mjs";
export const subject = { run: async (view, api) => api.publish({ program: compile(view.rules) }) };
