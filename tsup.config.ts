import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/families/ui-replay-browser-backed/runner.ts"],
  format: ["esm", "cjs"],
  external: ["playwright", "playwright-core", "chromium-bidi"],
  dts: true,
  clean: true,
  target: "node20",
});
