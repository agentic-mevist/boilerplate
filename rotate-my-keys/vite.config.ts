/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// The security story of the whole site lives here. Browsers enforce this
// policy, so the page cannot fetch, beacon, open WebSockets, load images from
// elsewhere, submit forms, load third-party code or be framed. CSP can't stop
// navigation or WebRTC; the code itself never does either.
const CSP: Array<[string, string]> = [
  ["default-src", "'none'"],
  ["script-src", "'self'"],
  ["style-src", "'self'"],
  ["img-src", "'self'"],
  ["font-src", "'self'"],
  ["manifest-src", "'self'"],
  ["connect-src", "'none'"],
  ["form-action", "'none'"],
  ["frame-ancestors", "'none'"],
  ["base-uri", "'none'"],
  ["object-src", "'none'"],
  ["require-trusted-types-for", "'script'"],
  ["trusted-types", "'none'"],
]

const serialize = (skip: string[] = []) =>
  CSP.filter(([name]) => !skip.includes(name))
    .map(([name, value]) => `${name} ${value}`)
    .join("; ")

const HEADERS = `/*
  Content-Security-Policy: ${serialize()}
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: accelerometer=(), browsing-topics=(), camera=(), clipboard-read=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), serial=(), usb=(), xr-spatial-tracking=()
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`

/** Ships the policy twice: as Cloudflare Pages headers, and in a <meta> tag
 *  so it still applies wherever the files end up being served. */
function securityHeaders(): Plugin {
  return {
    name: "security-headers",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        // frame-ancestors is ignored (with a warning) in <meta>, so it only
        // goes in the real header.
        attrs: { "http-equiv": "Content-Security-Policy", content: serialize(["frame-ancestors"]) },
        injectTo: "head-prepend",
      },
    ],
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source: HEADERS })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders()],
  define: {
    __CSP__: JSON.stringify(serialize()),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  build: {
    // Ship source maps on purpose: anyone can open DevTools → Sources and
    // read the original code to check that nothing leaves the page.
    sourcemap: true,
  },
})
