import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8123",
    headless: true,
    viewport: { width: 1440, height: 1200 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "serve-e2e.bat --host 127.0.0.1 --port 8123",
    cwd: "..\\backend",
    url: "http://127.0.0.1:8123",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
