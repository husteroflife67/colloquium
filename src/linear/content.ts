import solutions from './solutions.json' with { type: "json" };
import { linearCards } from './model';
export const linearSolutions: Record<string, string> = solutions;
/** Trusted, bundled author-written HTML; no user input or remote content is injected. */
export const solutionText = (id: string) => (linearSolutions[id] ?? '').replace(/<\/?(?:p|b|h[1-6]|table|tbody|tr|td|th|strong|em)(?:\s[^>]*)?>/gi, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export const linearById = new Map(linearCards.map(c => [c.id, c]));
