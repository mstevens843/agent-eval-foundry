import { options } from "./options.mjs";
export const choose = (n, r, u, p) => options(n, r, u, p)[0] ?? [];
