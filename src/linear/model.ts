import catalog from './catalog.json' with { type: "json" };
import sources from './sources.json' with { type: "json" };
import topics from './topics.json' with { type: "json" };
import { announceProgress } from '../progress-events';
export { topics };
export const difficultyLevels = [
  { id: 'easy', label: 'Простая', title: 'Простые задачи', description: 'Один базовый приём и короткие вычисления.' },
  { id: 'medium', label: 'Средняя', title: 'Задачи средней сложности', description: 'Несколько шагов, сочетание приёмов или более объёмные вычисления.' },
  { id: 'hard', label: 'Сложная', title: 'Сложные задачи', description: 'Особые случаи параметров, общий порядок, нетривиальная идея или трудоёмкие вычисления.' },
] as const;
export type Difficulty = typeof difficultyLevels[number]['id'];
export type DifficultyFilter = Difficulty | 'all';
export function isDifficulty(value: unknown): value is Difficulty {
  return difficultyLevels.some(level => level.id === value);
}
export const linearCards = catalog.map(card => {
  if (!isDifficulty(card.difficulty)) throw Error(`Не указан уровень сложности: ${card.id}`);
  return { ...card, difficulty: card.difficulty };
});
export type LinearCard = typeof linearCards[number];
export const linearKey = 'linear-algebra-v1';
export type LinearProgress = { version: 1; done: Record<string, boolean> };
const ids = new Set(linearCards.map(c => c.id));
export function validateLinear(raw: unknown): LinearProgress {
  const value = raw as LinearProgress;
  if (!value || value.version !== 1 || !value.done || typeof value.done !== 'object' || Array.isArray(value.done) || Object.entries(value.done).some(([id, done]) => !ids.has(id) || typeof done !== 'boolean')) throw Error('Некорректный прогресс линейной алгебры');
  return { version: 1, done: { ...value.done } };
}
export function loadLinear(): LinearProgress {
  const raw = localStorage.getItem(linearKey);
  return raw ? validateLinear(JSON.parse(raw)) : { version: 1, done: {} };
}
export function markLinear(id: string, done: boolean): LinearProgress {
  if (!ids.has(id)) throw Error('Неизвестная задача');
  const value = loadLinear();
  value.done[id] = done;
  localStorage.setItem(linearKey, JSON.stringify(value));
  announceProgress(linearKey);
  return value;
}
export const cardLabel = (c: LinearCard) => `${c.book} ${c.num}${c.sub ? ` ${c.sub})` : ''}`;
export function sourceFor(book: string, page: number) {
  const key = `${book === 'П' ? 'P' : 'K'}${String(page).padStart(3, '0')}` as keyof typeof sources;
  return sources[key];
}
export const sourceURL = (book: string, page: number) => `${import.meta.env.BASE_URL}${sourceFor(book, page).file}`;
export const bookTitle = (book: string) => book === 'П' ? 'Проскуряков' : 'Кострикин';
export function matchesNumber(card: LinearCard, text: string) {
  const query = text.trim().toLowerCase().replace(/\s/g, '').replace(/^p/, 'п').replace(/^k/, 'к');
  if (!query) return true;
  const exact = query.match(/^([пк])?(\d+(?:\.\d+)?)([а-я])?$/);
  if (exact) return (!exact[1] || card.book.toLowerCase() === exact[1]) && card.num === exact[2] && (!exact[3] || card.sub === exact[3]);
  return `${cardLabel(card)} ${card.title} ${topics[card.topic].name}`.toLowerCase().includes(text.trim().toLowerCase());
}
