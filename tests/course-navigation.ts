import { expect, type Page } from "@playwright/test";

export async function switchCourse(page: Page, course: string) {
  await expect(page.locator(".platform-bar")).toBeVisible();
  const menu = page.locator(".workspace-mobile");
  if (await menu.isVisible() && await menu.getAttribute("aria-expanded") === "false") await menu.click();
  await page.locator('.workspace-courses a[href^="#/' + course + '/"]').click();
  await expect(page.locator(".platform-course-" + course + " .platform-bar")).toBeVisible();
  await expect(page).toHaveURL(new RegExp("#/" + course + "/"));
}
