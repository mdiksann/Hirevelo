import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    server: { deps: { inline: ["next-auth"] } },
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/actions/**/*.ts"],
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      thresholds: {
        "src/lib/**": { statements: 80, branches: 80 },
        "src/actions/**": { statements: 80, branches: 80 },
      },
    },
    testTimeout: 15000,
  },
});
