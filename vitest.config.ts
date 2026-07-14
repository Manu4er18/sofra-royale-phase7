import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest config. Unit tests cover the pure, framework-free logic in
 * src/lib (pricing, utils, order transitions). These modules deliberately
 * avoid `server-only`/database imports so they run in a plain Node env
 * with no mocking. `tsconfigPaths` wires the `@/*` alias from tsconfig.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/pricing.ts",
        "src/lib/utils.ts",
        "src/lib/order-transitions.ts",
      ],
    },
  },
});
