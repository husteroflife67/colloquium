import { switchCourse } from "../tests/course-navigation";
import { test, expect } from "@playwright/test";
test("production platform loads both course routes, math, PDFs and source images under the repository prefix", async ({ page, request, baseURL }) => {
  await page.goto(baseURL!);
  await expect(page.getByRole("heading", { name: "Продолжить подготовку" })).toBeVisible();
  await switchCourse(page, "calculus");
  await page.locator(".sidebar").getByText("Определения", { exact: true }).click();
  await page.locator(".library-card").first().click();
  await page.getByRole("button", { name: "Открыть карточку", exact: true }).click();
  await expect(page.locator(".reading .katex").first()).toBeVisible();
  await switchCourse(page, "discrete");
  await expect(page.locator(".sidebar")).toContainText("Доказательства");
  for (const path of ["sources/program.pdf", "sources/notes.pdf", "sources/corrected-guide.pdf", "sources/definitions.pdf", "materials/DMlec-base.pdf"]) {
    const response = await request.get(new URL(path, baseURL).href);
    expect(response.ok()).toBe(true);
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
});

test("production search and feedback keep the deployment prefix and review route loads", async ({ page, baseURL }) => {
  await page.goto(`${baseURL}#/search?q=${encodeURIComponent("индукция")}&course=discrete&kind=theory`);
  await expect(page.locator(".study-result").first()).toBeVisible();
  await page.locator(".study-result > a").first().click();
  await page.getByRole("button", { name: "Поделиться карточкой", exact: true }).click();
  await expect(page.getByLabel("Ссылка на карточку")).toHaveValue(new RegExp(`${baseURL!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}#/discrete/course\\?item=`));
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Журнал ошибок", exact: true }).click();
  await page.getByRole("link", { name: "Разобрать сложное", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Разобрать сложное." })).toBeVisible();
});

test("production linear course serves sources and exact card routes under the repository prefix", async ({ page, request, baseURL }) => {
  await page.goto(`${baseURL}#/linear/study?item=%D0%9F82`);
  await expect(page.locator('.linear-task')).toHaveCount(1);
  await page.getByRole('button', { name: 'Показать решение', exact: true }).click();
  await expect(page.locator('.linear-solution .katex').first()).toBeVisible();
  await page.getByRole('button', { name: 'Условие', exact: true }).click();
  const path = await page.locator('.linear-dialog img').getAttribute('src');
  expect(new URL(path!, baseURL).pathname).toContain('/colloquium-discrete-1module-hseami/linear/sources/');
  const response = await request.get(new URL(path!, baseURL).href);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/webp');
});

test('production mock exam starts five tasks and restores the deadline under the repository prefix', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}#/linear/exam`);
  await page.getByRole('button', { name: 'Начать · 140 минут', exact: true }).click();
  await expect(page.locator('.linear-exam-task')).toHaveCount(5);
  await expect(page.getByRole('timer')).toBeVisible();
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('linear-exams-v1')!).attempts[0].deadline);
  await page.reload();
  await expect(page.locator('.linear-exam-task')).toHaveCount(5);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('linear-exams-v1')!).attempts[0].deadline)).toBe(deadline);
  await expect(page.locator('.linear-exam-solution')).toHaveCount(0);
});
