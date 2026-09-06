import { defineConfig } from "tsup";
import { authoritySourceDigest } from "./src/trials/authority-build.js";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cli.ts",
    "src/packages/local-cli.ts",
    "src/families/ui-replay-browser-backed/runner.ts",
    "src/trials/operation-authority.ts",
  ],
  format: ["esm", "cjs"],
  external: ["playwright", "playwright-core", "chromium-bidi"],
  dts: true,
  clean: true,
  splitting: false,
  define: { __FOUNDRY_AUTHORITY_SOURCE_DIGEST__: JSON.stringify(authoritySourceDigest(process.cwd())) },
  target: "node20",
});
