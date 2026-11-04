import { describe, expect, it, afterEach, vi } from 'vitest';
import { createExam, settleExams, validateExams, examDuration, secondsLeft, clockTime, examKey, type ExamMode } from './exam-model';
import { linearCards } from './model';
import { parseBackup, prepareImport } from '../platform/backup';
const start = Date.parse('2026-11-04T12:00:00Z');
const seeded = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
afterEach(() => vi.unstubAllGlobals());
describe('five-task linear algebra mock exam', () => {
  it('generates five unique numbers with the intended topics and difficulty across random variants', () => {
    for (const mode of ['mixed', 'easy', 'medium', 'hard'] as ExamMode[]) for (let seed = 1; seed <= 100; seed++) {
      const a = createExam(mode, start, seeded(seed), `exam-${mode}-${seed}`);
      const cards = a.items.map(id => linearCards.find(c => c.id === id)!);
      expect(cards).toHaveLength(5);
      expect(new Set(cards.map(c => `${c.book}${c.num}`)).size).toBe(5);
      expect(cards.map(c => c.topic).slice(0, 3)).toEqual([0, 1, 2]);
      expect([3, 4]).toContain(cards[3].topic); expect(cards[4].topic).toBe(5);
      expect(cards.map(c => c.difficulty).sort()).toEqual(mode === 'mixed' ? ['easy', 'hard', 'medium', 'medium', 'medium'] : Array(5).fill(mode));
      expect(a.deadline - a.startedAt).toBe(140 * 60 * 1000);
      expect(validateExams({ version: 1, attempts: [a] }).attempts[0]).toEqual(a);
    }
  });
  it('uses the fixed deadline after reload or inactivity, never extending time or losing drafts', () => {
    const a = createExam('mixed', start, seeded(3), 'timer');
    a.drafts[a.items[0]] = 'x = 2';
    expect(clockTime(secondsLeft(a, start))).toBe('02:20:00');
    expect(secondsLeft(a, a.deadline - 1)).toBe(1);
    const data = { version: 1 as const, attempts: [a] };
    expect(settleExams(data, a.deadline - 1).attempts[0].finishedAt).toBeUndefined();
    const restored = settleExams(validateExams(JSON.parse(JSON.stringify(data))), a.deadline + 60000);
    expect(restored.attempts[0]).toMatchObject({ finishedAt: a.deadline, finishReason: 'timeout', drafts: a.drafts });
    expect(secondsLeft(a, a.deadline + 1)).toBe(0);
    expect(settleExams(restored, a.deadline + 120000)).toEqual(restored);
    expect(data.attempts[0].finishedAt).toBeUndefined();
  });
  it('rejects broken durations, unknown IDs, duplicate numbers, and premature self-assessments', () => {
    const a = createExam('easy', start, seeded(5), 'valid');
    for (const bad of [{ ...a, deadline: a.deadline + 1 }, { ...a, items: a.items.slice(1) }, { ...a, items: ['missing', ...a.items.slice(1)] }, { ...a, items: Array(5).fill(a.items[0]) }, { ...a, reviews: { [a.items[0]]: 'solved' } }, { ...a, drafts: { missing: 'x' } }, { ...a, finishedAt: a.deadline + 1, finishReason: 'submitted' }, { ...a, finishedAt: start + 10, finishReason: 'timeout' }]) expect(() => validateExams({ version: 1, attempts: [bad] })).toThrow();
    expect(() => validateExams({ version: 1, attempts: [a, a] })).toThrow();
  });
  it('backs up attempts with unchanged deadlines, merges history, and leaves old backups compatible', () => {
    const a = createExam('medium', start, seeded(9), 'local');
    const b = createExam('hard', start + examDuration, seeded(10), 'imported');
    const local = { version: 1, attempts: [a] };
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === examKey ? JSON.stringify(local) : null });
    const incoming = parseBackup({ format: 'colloquium-platform-backup', version: 1, data: { [examKey]: { version: 1, attempts: [b, a] } } });
    const merged = JSON.parse(prepareImport(incoming).updates[examKey]);
    expect(merged.attempts).toEqual([b, a]);
    const conflict = { ...a, finishedAt: start + 1000, finishReason: 'submitted' };
    const next = { [examKey]: { version: 1, attempts: [conflict] } };
    expect(JSON.parse(prepareImport(next).updates[examKey]).attempts[0]).toEqual(a);
    expect(JSON.parse(prepareImport(next, 'import').updates[examKey]).attempts[0]).toEqual(conflict);
    expect(prepareImport(parseBackup({ format: 'colloquium-platform-backup', version: 1, data: {} })).updates).toEqual({});
  });
});
