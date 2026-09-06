// Explicit adapter registration.
//
// This package declares "sideEffects": false, so an import kept only for its registration side effect
// (`import "./caa-revalidation-adapter.js"`) is a real risk of being tree-shaken away by any bundler
// that takes that declaration at its word — including this repo's own tsup build. `registerAllAdapters`
// makes registration an explicit function call instead: every real caller invokes it once before using
// `getAdapter`, so registration cannot silently disappear depending on how this module happened to be
// bundled or imported.

import { registerAdapter } from "../operator-adapter.js";
import { caaRevalidationAdapter } from "./caa-revalidation-adapter.js";

export { caaRevalidationAdapter };

export function registerAllAdapters(): void {
  registerAdapter(caaRevalidationAdapter);
}
