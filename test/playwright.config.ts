import { defineConfig } from "@playwright/test";

export default defineConfig({
<<<<<<< HEAD
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8000",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
=======
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8000",
    headless: true,
    screenshot: "only-on-failure",
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
