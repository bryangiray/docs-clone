import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "server-only", replacement: fromRoot("./test/server-only.ts") },
      { find: /^@\//, replacement: fromRoot("./") },
    ],
  },
  test: {
    include: ["{app,components,lib}/**/*.test.{ts,tsx}"],
  },
});
