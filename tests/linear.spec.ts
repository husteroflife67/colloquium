import { test, expect } from '@playwright/test';
import { linearCards } from '../src/linear/model';
test('third course opens source scans and exact solutions without changing older course progress', async ({ page, request }) => {
  const older = { version: 1, progress: { '1': { status: 'known', review: false } }, results: [] };
  await page.addInitScript(older => { if (!localStorage.getItem('discrete-study-v1')) localStorage.setItem('discrete-study-v1', JSON.stringify(older)); }, older);
  await page.goto('/');
  await expect(page.locator('.platform-card')).toHaveCount(3);
  await page.getByRole('link', { name: 'Продолжить линейную алгебру' }).click();
  await expect(page.locator('.linear-topic-card')).toHaveCount(6);
  await page.locator('.linear-topic-card').first().click();
  await expect(page.locator('.linear-source img').first()).toBeVisible();
  const image = await page.locator('.linear-source img').first().getAttribute('src');
  expect((await request.get(image!)).ok()).toBe(true);
  await page.getByRole('button', { name: 'П 82', exact: true }).click();
  await expect(page.locator('.linear-task')).toHaveCount(1);
  await expect(page.locator('.linear-solution')).toHaveCount(0);
  await page.getByRole('button', { name: 'Условие', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Крупнее', exact: true }).click();
  await expect(page.locator('.linear-dialog')).toHaveClass(/linear-dialog-zoom/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Условие', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Показать решение', exact: true }).click();
  await expect(page.locator('.linear-solution')).toContainText('Общее решение');
  await expect(page.locator('.linear-solution .katex-error')).toHaveCount(0);
  await page.getByLabel('Отметить П 82 решённой').check();
  await page.reload();
  await expect(page.getByLabel('Отметить П 82 решённой')).toBeChecked();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('discrete-study-v1')!))).toEqual(older);
});
test('linear tasks are part of global search and persistent platform bookmarks', async ({ page }) => {
  await page.goto('/#/search?course=linear&q=П%20178');
  await expect(page.getByLabel('Курс поиска')).toHaveValue('linear');
  await page.locator('.study-result > a').first().click();
  await expect(page.locator('.linear-task')).toHaveCount(1);
  await expect(page.locator('.linear-solution')).toHaveCount(0);
  await page.getByRole('button', { name: '☆ В закладки', exact: true }).click();
  await page.getByRole('link', { name: 'Закладки', exact: true }).click();
  await expect(page.locator('.platform-list > li')).toHaveCount(1);
  await page.getByLabel('Фильтр курса').selectOption('linear');
  await page.locator('.platform-list > li > a').click();
  await expect(page.getByRole('button', { name: '★ Убрать из закладок' })).toBeVisible();
});
test('the unified backup round-trips linear progress and older backups never erase it', async ({ page }) => {
  await page.goto('/#/linear/study?item=%D0%9F82');
  await page.getByLabel('Отметить П 82 решённой').check();
  await page.getByRole('link', { name: 'Все курсы', exact: true }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт всех курсов' }).click();
  const stream = await (await promise).createReadStream(); const chunks = []; for await (const chunk of stream!) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.data['linear-algebra-v1']).toEqual({ version: 1, done: { 'П82': true } });
  await page.evaluate(() => localStorage.removeItem('linear-algebra-v1'));
  await page.reload();
  await page.getByLabel('Импорт прогресса платформы').setInputFiles({ name: 'all.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Объединить прогресс' }).click();
  delete backup.data['linear-algebra-v1'];
  await page.getByLabel('Импорт прогресса платформы').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Объединить прогресс' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('linear-algebra-v1')!).done['П82'])).toBe(true);
});
test('all 288 solutions render without errors and wide maths remain inside the page on phones', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (let topic = 0; topic < 6; topic++) {
    await page.goto(`/#/linear/study?topic=${topic}&tab=solutions`);
    await expect(page.locator('.linear-task')).toHaveCount(linearCards.filter(c => c.topic === topic).length);
    await page.getByRole('button', { name: 'Раскрыть все решения в подборке' }).click();
    await expect(page.locator('.linear-solution')).toHaveCount(linearCards.filter(c => c.topic === topic).length);
    await expect(page.locator('.katex-error')).toHaveCount(0);
  }
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/linear/study?item=%D0%9F178');
    await page.reload();
    await page.getByRole('button', { name: 'Показать решение', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('exact number filter and printing do not mark a task as solved', async ({ page }) => {
  await page.goto('/#/linear/study?topic=0&tab=solutions');
  await page.getByLabel('Поиск задач линейной алгебры').fill('82');
  await expect(page.locator('.linear-task')).toHaveCount(1);
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('button', { name: 'Печать', exact: true }).click();
  await expect(page.locator('.linear-solution')).toBeVisible();
  await expect(page.getByLabel('Отметить П 82 решённой')).not.toBeChecked();
  await page.getByLabel('Отметить П 82 решённой').check();
  await page.getByLabel('Осталось', { exact: true }).check();
  await expect(page.locator('.linear-task')).toHaveCount(0);
});

test('P870 shows a compatible singular matrix equation with three free parameters', async ({ page }) => {
  await page.goto('/#/linear/study?item=%D0%9F870');
  await page.getByRole('button', { name: 'Показать решение', exact: true }).click();
  const solution = page.locator('.linear-solution');
  await expect(solution).toContainText('три независимых параметра');
  await expect(solution).not.toContainText('Решений нет');
  await expect(solution.locator('.katex-error')).toHaveCount(0);
});
