/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["scripts/**", "**/*.bench.ts"],
    },
  },
});
