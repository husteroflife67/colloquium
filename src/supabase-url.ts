/** Supabase's browser client appends /auth/v1 and /rest/v1 to this origin. */
export function projectUrl(input: string): string {
  const url = new URL(input);
  const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw Error('Нужен HTTPS-адрес проекта Supabase');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Нужен корневой адрес проекта Supabase без пути и параметров');
  if (url.hostname.endsWith('.github.io')) throw Error('Указан адрес сайта GitHub Pages вместо проекта Supabase');
  return url.origin;
}
