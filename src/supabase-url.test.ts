import { describe, it, expect } from 'vitest';
import { projectUrl } from './supabase-url';
describe('Supabase Project URL', () => {
  it('accepts a project origin and local test server', () => {
    expect(projectUrl('https://example.supabase.co/')).toBe('https://example.supabase.co');
    expect(projectUrl('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321');
  });
  it('rejects a Pages site and copied dashboard or API paths', () => {
    for (const url of ['https://husteroflife67.github.io/colloquium-discrete-1module-hseami/', 'https://husteroflife67.github.io/', 'https://example.supabase.co/project/x', 'https://example.supabase.co?key=x', 'http://example.supabase.co']) expect(() => projectUrl(url)).toThrow();
  });
});
