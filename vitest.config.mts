import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    server: { deps: { inline: ["next-auth"] } },
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
