import { linearCards, isDifficulty, type Difficulty } from './model';
import { announceProgress } from '../progress-events';

export const examKey = 'linear-exams-v1';
export const examDuration = 140 * 60 * 1000;
export type ExamMode = Difficulty | 'mixed';
export type Review = 'solved' | 'partial' | 'repeat';
export type ExamAttempt = {
  id: string;
  mode: ExamMode;
  startedAt: number;
  deadline: number;
  items: string[];
  drafts: Record<string, string>;
  reviews: Record<string, Review>;
  finishedAt?: number;
  finishReason?: 'submitted' | 'timeout';
};
export type ExamData = { version: 1; attempts: ExamAttempt[] };
export const examSlots = [[0], [1], [2], [3, 4], [5]];
const byId = new Map(linearCards.map(c => [c.id, c]));
export const emptyExams = (): ExamData => ({ version: 1, attempts: [] });
export const isExamMode = (value: unknown): value is ExamMode => value === 'mixed' || isDifficulty(value);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const timestamp = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

export function validateExams(raw: unknown): ExamData {
  if (!record(raw) || raw.version !== 1 || !Array.isArray(raw.attempts)) throw Error('Некорректный формат пробных контрольных');
  const used = new Set<string>();
  const attempts = raw.attempts.map((a: unknown) => {
    if (!record(a) || typeof a.id !== 'string' || !a.id || used.has(a.id) || !isExamMode(a.mode) || !timestamp(a.startedAt) || !timestamp(a.deadline) || a.deadline - a.startedAt !== examDuration || !Array.isArray(a.items) || a.items.length !== 5 || !a.items.every(id => typeof id === 'string' && byId.has(id)) || !record(a.drafts) || !record(a.reviews)) throw Error('Некорректная попытка пробной контрольной');
    const items = a.items as string[];
    if (new Set(items.map(id => { const c = byId.get(id)!; return `${c.book}${c.num}`; })).size !== 5 || items.some((id, index) => !examSlots[index].includes(byId.get(id)!.topic))) throw Error('В варианте должны быть пять разных номеров по темам');
    const levels = items.map(id => byId.get(id)!.difficulty).sort();
    if (a.mode === 'mixed' ? levels.join() !== 'easy,hard,medium,medium,medium' : levels.some(level => level !== a.mode)) throw Error('Сложность задач не соответствует варианту');
    if (Object.entries(a.drafts).some(([id, text]) => !items.includes(id) || typeof text !== 'string' || text.length > 10000) || Object.entries(a.reviews).some(([id, value]) => !items.includes(id) || !['solved', 'partial', 'repeat'].includes(value as string))) throw Error('Некорректные записи попытки');
    const finished = a.finishedAt !== undefined;
    if (finished ? !timestamp(a.finishedAt) || a.finishedAt < a.startedAt || a.finishedAt > a.deadline || !['submitted', 'timeout'].includes(a.finishReason as string) || (a.finishReason === 'timeout' && a.finishedAt !== a.deadline) : a.finishReason !== undefined || Object.keys(a.reviews).length > 0) throw Error('Некорректное время завершения попытки');
    used.add(a.id);
    return { id: a.id, mode: a.mode, startedAt: a.startedAt, deadline: a.deadline, items: [...items], drafts: { ...a.drafts }, reviews: { ...a.reviews }, ...(finished ? { finishedAt: a.finishedAt, finishReason: a.finishReason } : {}) } as ExamAttempt;
  });
  return { version: 1, attempts };
}
export function loadExams(): ExamData {
  const raw = localStorage.getItem(examKey);
  return raw ? validateExams(JSON.parse(raw)) : emptyExams();
}
export function saveExams(data: ExamData) {
  localStorage.setItem(examKey, JSON.stringify(validateExams(data)));
  announceProgress(examKey);
}
export function settleExams(data: ExamData, now: number): ExamData {
  return { ...data, attempts: data.attempts.map(a => a.finishedAt === undefined && now >= a.deadline ? { ...a, finishedAt: a.deadline, finishReason: 'timeout' } : a) };
}
export function createExam(mode: ExamMode, now = Date.now(), random = Math.random, id = crypto.randomUUID()): ExamAttempt {
  if (!isExamMode(mode)) throw Error('Неизвестная сложность варианта');
  // Mix one easy, three medium and one hard task, assigning the levels to random slots.
  const levels: Difficulty[] = ['easy', 'medium', 'medium', 'medium', 'hard'];
  for (let i = levels.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [levels[i], levels[j]] = [levels[j], levels[i]]; }
  const numbers = new Set<string>();
  const items = examSlots.map((topics, i) => {
    const pool = linearCards.filter(c => topics.includes(c.topic) && c.difficulty === (mode === 'mixed' ? levels[i] : mode) && !numbers.has(`${c.book}${c.num}`));
    if (!pool.length) throw Error('Недостаточно задач для выбранного варианта');
    // Choose an exercise number first, so exercises with many subparts are not overrepresented.
    const groups = [...new Set(pool.map(c => `${c.book}${c.num}`))];
    const number = groups[Math.floor(random() * groups.length)];
    const parts = pool.filter(c => `${c.book}${c.num}` === number);
    const card = parts[Math.floor(random() * parts.length)];
    numbers.add(number);
    return card.id;
  });
  return { id, mode, startedAt: now, deadline: now + examDuration, items, drafts: {}, reviews: {} };
}
export function secondsLeft(a: ExamAttempt, now: number) { return Math.max(0, Math.ceil((a.deadline - now) / 1000)); }
export function clockTime(seconds: number) { return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':'); }
