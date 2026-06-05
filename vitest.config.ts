import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Backend unit tests only; the checkout extension is verified via tsc + manual checkout.
    include: ["app/**/*.{test,spec}.ts"],
  },
});
