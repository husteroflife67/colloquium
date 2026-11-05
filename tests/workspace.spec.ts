import { test, expect } from "@playwright/test";
const routes = ["home", "settings", "search", "bookmarks", "mistakes", "recovery", ...["dashboard", "plan", "today", "definition", "theory", "questions", "oral", "practice", "simulation", "history", "sync", "settings"].map(p => `calculus/${p}`), ...["course", "review", "plan", "proofs", "ticket", "progress", "sync"].map(p => `discrete/${p}`), "linear/study", "linear/study?topic=1&tab=solutions", "linear/exam"];
for (const theme of ["light", "dark"]) test(`all workspace routes fit every required viewport · ${theme}`, async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(theme => { localStorage.setItem("colloquium-ui-theme", theme); }, theme);
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(`/#/${route}`);
      await expect(page.locator(".platform-bar")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}px (${theme})`).toBe(true);
      await expect(page.locator(".platform-bar select")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Светлая|Тёмная) тема$/ })).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});
test("command keyboard, focus return, typing safety, focus mode, and density", async ({ page }) => {
  await page.goto("/#/home");
  const opener = page.getByRole("button", { name: "Поиск по всем курсам" });
  await opener.focus(); await page.keyboard.press("Control+k");
  const input = page.getByLabel("Поиск по всем материалам");
  await expect(input).toBeFocused(); await input.fill("Коши");
  await expect(page.locator(".command-result").first()).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", "command-1");
  await page.keyboard.press("Escape"); await expect(opener).toBeFocused();
  await page.keyboard.press("Alt+f"); await expect(page.locator("html")).toHaveAttribute("data-focus", "true");
  await expect(page.locator(".workspace-nav")).toBeHidden();
  await page.getByRole("button", { name: "Выйти из Focus Mode" }).click();
  await page.getByRole("button", { name: "Плотность интерфейса", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await page.goto("/#/discrete/course?item=1");
  const draft = page.locator("#draft"); await draft.fill("Проверяем сочетания при вводе");
  await page.keyboard.press("Alt+f"); await expect(page.locator("html")).toHaveAttribute("data-focus", "false");
  await page.keyboard.press("Control+k"); await expect(page.locator(".command-panel")).toHaveCount(0);
});
test("mobile navigation contains focus and returns it; resume tracks viewing without changing self-rating", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/discrete/course?item=1");
  const saved = await page.evaluate(() => localStorage.getItem("discrete-study-v1"));
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.locator(".workspace-nav").getByRole("button", { name: "Темы и вопросы", exact: true }).click();
  await expect(page.locator(".overview-continue")).toBeVisible();
  await page.locator(".overview-continue").click();
  await expect(page.locator("#draft")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("discrete-study-v1"))).toEqual(saved);
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
});

test("calculus start, mastery, scheduled review and resuming use the same real material", async ({ page }) => {
  await page.goto("/#/calculus/dashboard");
  const dashboard = page.locator(".calc-dashboard");
  await expect(dashboard.getByRole("heading", { name: "С чего начать?" })).toBeVisible();
  await expect(dashboard.locator(".calc-percent")).toContainText("0%");
  const first = await dashboard.locator(".calc-hero p").innerText();
  await dashboard.getByRole("button", { name: "Начать обучение" }).click();
  await expect(page.locator(".reading")).toContainText(first);
  await page.getByRole("button", { name: "Знаю", exact: true }).click();
  await page.clock.setFixedTime(new Date(Date.now() + 25 * 60 * 60 * 1000));
  await page.goto("/#/calculus/dashboard");
  await expect(dashboard.locator(".calc-percent")).toContainText("1%");
  await expect(dashboard.locator(".calc-stat").first()).toContainText("1 / 43");
  await expect(dashboard.locator(".calc-task").first()).toContainText("К повторению по расписанию: 1");
  await dashboard.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.locator(".reading")).toContainText(first);
});

test("first paint uses dark native controls even before JavaScript in a light system", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(baseURL!);
  const root = page.locator("html");
  await expect(root).toHaveCSS("color-scheme", "dark");
  await expect(root).toHaveCSS("background-color", "rgb(13, 15, 20)");
  await context.close();
});

test("command clicks reset the current section and full search preserves its filters", async ({ page }) => {
  await page.goto("/#/calculus/definition?item=def-completeness");
  await expect(page.locator(".reading")).toBeVisible();
  await page.getByRole("button", { name: "Поиск по всем курсам" }).click();
  await page.locator(".command-panel").getByRole("link", { name: "Определения · Математический анализ", exact: false }).click();
  await expect(page.locator(".reading")).toHaveCount(0);
  await expect(page.locator(".library-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Поиск по всем курсам" }).click();
  await page.getByLabel("Поиск по всем материалам").fill("предел");
  await page.getByLabel("Курс поиска", { exact: true }).selectOption("calculus");
  await page.getByLabel("Вид материала поиска").selectOption("definition");
  await page.getByRole("link", { name: "Полный поиск" }).click();
  await expect(page).toHaveURL(/q=.*&course=calculus&kind=definition/);
  await expect(page.locator(".study-result").first()).toBeVisible();
});

test("command dialog keeps keyboard focus when opened over the mobile drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/calculus/dashboard");
  const menu = page.getByRole("button", { name: "Меню", exact: true });
  await menu.click();
  await page.getByRole("button", { name: "Поиск по всем курсам" }).click();
  await expect(page.getByLabel("Поиск по всем материалам")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Закрыть поиск", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".command-panel")).toHaveCount(0);
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
});

test("mobile menu and focus mode never leave an invisible drawer blocking the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/calculus/definition?item=def-completeness");
  await page.getByRole("button", { name: "Focus Mode", exact: true }).click();
  const menu = page.getByRole("button", { name: "Меню", exact: true });
  await menu.click();
  await expect(page.locator("html")).toHaveAttribute("data-focus", "false");
  await expect(page.locator(".workspace-nav")).toBeVisible();
  await page.getByRole("button", { name: "Focus Mode", exact: true }).click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".workspace-scrim")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".reading")).toBeVisible();
});

test("mobile materials tab returns from a card to the course list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/calculus/definition?item=def-completeness");
  await expect(page.locator(".reading")).toBeVisible();
  await page.getByRole("link", { name: "К материалам", exact: true }).click();
  await expect(page.locator(".reading")).toHaveCount(0);
  await expect(page.locator(".library-card").first()).toBeVisible();
  await page.goto("/#/discrete/course?item=1");
  await expect(page.locator("#draft")).toBeVisible();
  await page.getByRole("link", { name: "К материалам", exact: true }).click();
  await expect(page.locator("#draft")).toHaveCount(0);
  await expect(page.locator(".course-overview")).toBeVisible();
});


test("settings links open backup controls from search on desktop and mobile", async ({ page }) => {
  await page.goto("/#/search");
  await page.getByRole("link", { name: "Данные и настройки", exact: true }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole("heading", { name: "Настройки", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Экспорт всех курсов" })).toBeVisible();
  await expect(page.getByLabel("Импорт прогресса платформы")).toBeAttached();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/search");
  await page.getByRole("link", { name: "К настройкам", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Настройки", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Экспорт всех курсов" })).toBeVisible();
});

test("bottom tabs highlight the open section and compact density changes real spacing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/home");
  const tabs = page.getByRole("navigation", { name: "Быстрые переходы" });
  await expect(tabs.getByRole("link", { name: "На главную" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "К материалам" }).click();
  await expect(tabs.getByRole("link", { name: "К материалам" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
  await tabs.getByRole("link", { name: "К настройкам" }).click();
  await expect(tabs.getByRole("link", { name: "К настройкам" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/calculus/dashboard");
  const panel = page.locator(".calc-panel").first();
  const comfortable = await panel.evaluate(el => getComputedStyle(el).paddingTop);
  const density = page.getByRole("button", { name: "Плотность интерфейса", exact: true });
  await density.click();
  await expect(density).toHaveAttribute("aria-pressed", "true");
  await expect(density).toContainText("Компактная");
  expect(await panel.evaluate(el => parseFloat(getComputedStyle(el).paddingTop))).toBeLessThan(parseFloat(comfortable));
  await page.reload();
  await expect(density).toHaveAttribute("aria-pressed", "true");
  await density.click();
  await expect(panel).toHaveCSS("padding-top", comfortable);
});
