import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { linearCards, matchesNumber, validateLinear, sourceFor, topics, difficultyLevels, isDifficulty } from './model';
import { linearSolutions } from './content';
import coverage from './coverage.json' with { type: "json" };
import { materials, materialLink } from '../platform/catalog';
import { searchAll } from '../platform/search';
describe('linear algebra workbook', () => {
  it('covers every requested number and preserves independent subparts', () => {
    expect(linearCards).toHaveLength(288);
    expect(new Set(linearCards.map(c => c.id)).size).toBe(288);
    expect(new Set(linearCards.map(c => c.book + c.num)).size).toBe(188);
    for (const [book, numbers] of Object.entries(coverage.expected)) for (const n of numbers) expect(linearCards.some(c => c.book === book && c.num === String(n))).toBe(true);
    for (const c of linearCards) { expect(linearSolutions[c.id].length).toBeGreaterThan(50); for (const page of c.pages) expect(sourceFor(c.book, page)?.sha256).toHaveLength(64); }
  });
  it('assigns a preparation difficulty to every subpart in all six topics', () => {
    expect(linearCards.every(c => isDifficulty(c.difficulty))).toBe(true);
    for (let topic = 0; topic < topics.length; topic++) {
      const cards = linearCards.filter(c => c.topic === topic);
      const groups = difficultyLevels.map(level => cards.filter(c => c.difficulty === level.id));
      expect(groups.every(group => group.length > 0)).toBe(true);
      expect(groups.flat().map(c => c.id).sort()).toEqual(cards.map(c => c.id).sort());
    }
    expect(linearCards.find(c => c.id === 'П82')?.difficulty).toBe('easy');
    expect(linearCards.find(c => c.id === 'П567')?.difficulty).toBe('medium');
    expect(linearCards.find(c => c.id === 'П870')?.difficulty).toBe('hard');
    expect(new Set(linearCards.filter(c => c.book === 'К' && c.num === '17.1').map(c => c.difficulty)).size).toBeGreaterThan(1);
  });
  it('renders every mathematical expression with the site version of KaTeX', () => {
    let count = 0;
    for (const html of Object.values(linearSolutions)) for (const m of html.matchAll(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g)) { expect(() => katex.renderToString(m[1] ?? m[2], { throwOnError: true, strict: 'ignore' })).not.toThrow(); count++; }
    expect(count).toBeGreaterThan(2700);
  });
  it('keeps exact numbered search, right-to-left permutation composition and precise platform links', () => {
    expect(linearCards.filter(c => matchesNumber(c, '82')).map(c => c.id)).toEqual(['П82']);
    expect(linearCards.filter(c => matchesNumber(c, 'К 17.1'))).toHaveLength(8);
    expect(linearSolutions['П178']).toContain('A(X(B(i)))=C(i)');
    const m = materials.find(c => c.course === 'linear' && c.id === 'П178')!;
    expect(materialLink(m)).toBe('#/linear/study?item=%D0%9F178');
    expect(searchAll('перестановка', 'linear').some(d => d.material.course === 'linear')).toBe(true);
  });
  it('keeps the compatible singular equation P870 as a three-parameter family', () => {
    expect(linearSolutions['П870']).toContain('3R₁−2R₂');
    expect(linearSolutions['П870']).toContain('три независимых параметра');
    expect(linearSolutions['П870']).toContain('AX-B=');
    expect(linearSolutions['П870']).not.toContain('Решений нет');
  });
  it('rejects malformed or unknown progress before any storage mutation', () => {
    expect(validateLinear({ version: 1, done: { 'П82': true, 'П83': false } }).done['П82']).toBe(true);
    for (const data of [{ version: 1, done: { missing: true } }, { version: 1, done: { 'П82': 'yes' } }, { version: 1, done: [] }, {}]) expect(() => validateLinear(data)).toThrow();
  });
});
