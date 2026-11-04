import { test, expect } from "@playwright/test";
const routes = ["home", "search", "bookmarks", "mistakes", "recovery", ...["dashboard", "plan", "today", "definition", "theory", "questions", "oral", "practice", "simulation", "history", "sync", "settings"].map(p => `calculus/${p}`), ...["course", "review", "plan", "proofs", "ticket", "progress", "sync"].map(p => `discrete/${p}`), "linear/study", "linear/study?topic=1&tab=solutions", "linear/exam"];
for (const theme of ["light", "dark"]) test(`all workspace routes fit every required viewport · ${theme}`, async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(theme => { localStorage.setItem("colloquium-ui-theme", theme); }, theme);
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(`/#/${route}`);
      await expect(page.locator(".platform-bar")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}px (${theme})`).toBe(true);
      const picker = await page.getByLabel("Выбрать курс").boundingBox();
      expect(picker!.x + picker!.width, `${route} course picker at ${width}`).toBeLessThanOrEqual(width);
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
