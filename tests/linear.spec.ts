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

test('all topics group every task and subpart from easy to hard in conditions and solutions', async ({ page }) => {
  for (let topic = 0; topic < 6; topic++) {
    const expected = linearCards.filter(c => c.topic === topic);
    for (const tab of ['conditions', 'solutions']) {
      await page.goto(`/#/linear/study?topic=${topic}&tab=${tab}`);
      const groups = page.locator('.linear-level-group');
      await expect(groups).toHaveCount(3);
      expect(await groups.evaluateAll(elements => elements.map(el => el.getAttribute('data-difficulty')))).toEqual(['easy', 'medium', 'hard']);
      for (const level of ['easy', 'medium', 'hard']) {
        const group = page.locator(`.linear-level-group[data-difficulty="${level}"]`);
        const subset = expected.filter(c => c.difficulty === level);
        await expect(group.locator(tab === 'conditions' ? '.linear-number-list button' : '.linear-task')).toHaveCount(subset.length);
        if (tab === 'solutions') expect(await group.locator('.linear-task').evaluateAll(els => els.map(el => el.id.replace('linear-', '')))).toEqual(subset.map(c => c.id));
      }
    }
  }
});

test('difficulty filter survives reload and tabs, combines with number and remaining filters, and prints only the selection', async ({ page }) => {
  await page.goto('/#/linear/study?topic=0&tab=solutions');
  await page.getByLabel('Отметить П 82 решённой').check();
  await page.getByLabel('Сложность задач').selectOption('easy');
  await expect(page.locator('.linear-task')).toHaveCount(7);
  await expect(page.locator('.linear-level-group')).toHaveCount(1);
  await expect(page).toHaveURL(/difficulty=easy/);
  await page.getByLabel('Осталось', { exact: true }).check();
  await expect(page.locator('.linear-task')).toHaveCount(6);
  await page.getByRole('button', { name: 'Условия', exact: true }).click();
  await expect(page.getByLabel('Сложность задач')).toHaveValue('easy');
  await expect(page.getByLabel('Осталось', { exact: true })).toBeChecked();
  await expect(page.locator('.linear-number-list button')).toHaveCount(6);
  await expect(page.locator('.linear-source small').first()).not.toContainText('П 86');
  await page.reload();
  await expect(page.getByLabel('Сложность задач')).toHaveValue('easy');
  await expect(page.locator('.linear-number-list button')).toHaveCount(7);
  await page.getByRole('button', { name: 'Решения', exact: true }).click();
  await page.getByLabel('Поиск задач линейной алгебры').fill('82');
  await page.getByLabel('Сложность задач').selectOption('hard');
  await expect(page.getByLabel('Поиск задач линейной алгебры')).toHaveValue('82');
  await expect(page.locator('.linear-task')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Измените сложность');
  await page.getByLabel('Поиск задач линейной алгебры').fill('');
  await expect(page.locator('.linear-task')).toHaveCount(13);
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('button', { name: 'Печать', exact: true }).click();
  await expect(page.locator('.linear-solution')).toHaveCount(13);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('linear-algebra-v1')!).done)).toEqual({ 'П82': true });
});

test('exact material links keep their task visible and difficulty controls fit on phones', async ({ page }) => {
  await page.goto('/#/linear/study?item=%D0%9F870&difficulty=easy');
  await expect(page.locator('.linear-task')).toHaveCount(1);
  await expect(page.locator('.linear-difficulty-badge')).toHaveText('Сложная');
  await expect(page.getByLabel('Сложность задач')).toHaveValue('hard');
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/linear/study?topic=1');
    await expect(page.locator('.linear-level-group')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Сложность задач').selectOption('hard');
    await page.getByRole('button', { name: 'Решения', exact: true }).click();
    await expect(page.locator('.linear-task')).toHaveCount(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
