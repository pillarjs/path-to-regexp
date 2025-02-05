/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*"],
      exclude: ["**/*.bench.ts"],
    },
  },
});
