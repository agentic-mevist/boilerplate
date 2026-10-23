import { defineConfig, devices } from "@playwright/test"

// Runs against `wrangler pages dev`, which applies dist/_headers exactly like
// Cloudflare Pages does. Set BASE_URL to test a real deployment instead.
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:8788"

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx wrangler pages dev dist --port 8788 --ip 127.0.0.1",
        url: baseURL,
        reuseExistingServer: true,
        env: { WRANGLER_SEND_METRICS: "false" },
      },
})
