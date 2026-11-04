import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Command, Search, X } from "lucide-react";
import { courses, type CourseId } from "./catalog";
import { workspaceSections, toggleFocus, navigateWorkspace } from "./course-tools";
import { toggleDensity } from "./workspace-preferences";
import { MathText } from "../calculus/MathText";
import type { searchAll as SearchAll, SearchKind } from "./search";

type Entry = { id: string; title: string; detail: string; href?: string; action?: () => void };
const typing = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
export function CommandPanel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const prior = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState<"all" | CourseId>("all");
  const [kind, setKind] = useState<"all" | SearchKind>("all");
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState<{ run: typeof SearchAll } | null>(null);
  const [error, setError] = useState(false);
  function close() { dialog.current?.close(); setOpen(false); prior.current?.focus(); }
  useEffect(() => {
    const show = () => { prior.current = document.activeElement as HTMLElement; setQuery(""); setActive(0); setOpen(true); };
    const key = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.repeat && e.key.toLowerCase() === "k") { e.preventDefault(); show(); }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyF") { e.preventDefault(); toggleFocus(); }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyA") {
        const button = [...document.querySelectorAll<HTMLButtonElement>('main button')].find(b => /^(Показать ответ|Показать решение|Раскрыть ответ)$/.test(b.textContent?.trim() ?? "") && b.getClientRects().length && !b.disabled);
        if (button) { e.preventDefault(); button.click(); }
      }
    };
    window.addEventListener("workspace-commands", show); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("workspace-commands", show); window.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal(); input.current?.focus();
    if (!search) import("./search").then(module => { setSearch({ run: module.searchAll }); setError(false); }).catch(() => setError(true));
  }, [open]);
  useEffect(() => { setActive(0); }, [query, course, kind]);
  const actions: Entry[] = [
    { id: "home", title: "Главная · все курсы", detail: "Навигация", href: "#/home" },
    { id: "bookmarks", title: "Закладки", detail: "Навигация", href: "#/bookmarks" },
    { id: "journal", title: "Журнал ошибок", detail: "Навигация", href: "#/mistakes" },
    { id: "density", title: "Переключить плотность интерфейса", detail: "Комфортная / компактная", action: toggleDensity },
    { id: "focus", title: "Переключить Focus Mode", detail: "Действие · Alt+F", action: toggleFocus },
    ...Object.entries(courses).flatMap(([id,c]) => workspaceSections[id as CourseId].filter(() => course === "all" || id === course).map(([route,label]) => ({ id: `${id}/${route}`, title: `${label} · ${c.title}`, detail: "Раздел курса", href: `#/${id}/${route}` }))),
  ];
  const entries: Entry[] = query.trim() ? [
    ...actions.filter(a => a.title.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru"))).slice(0, 4),
    ...(search?.run(query, course, kind).slice(0, 16).map(m => ({ id: m.key, title: m.title, detail: `${courses[m.material.course].title} · ${m.topic}`, href: m.href })) ?? []),
  ] : actions;
  function execute(entry: Entry) { close(); if (entry.href) { const match = entry.href.match(/^#\/(calculus|discrete|linear)\/([a-z]+)$/); if (match) navigateWorkspace(match[1] as CourseId, match[2]); else location.hash = entry.href; } else entry.action?.(); }
  if (!open) return null;
  return <dialog ref={dialog} className="command-panel" aria-labelledby="command-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) close(); }}>
    <div className="command-search"><Search size={21} /><label className="sr-only" id="command-title" htmlFor="command-input">Материалы и действия</label><input id="command-input" ref={input} aria-label="Поиск по всем материалам" role="combobox" aria-expanded={open} aria-controls="command-results" aria-autocomplete="list" aria-activedescendant={entries[active] ? `command-${active}` : undefined} placeholder="Найти материал или действие…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const next = entries.length ? (active + (e.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length : 0; setActive(next); document.getElementById(`command-${next}`)?.scrollIntoView({ block: "nearest" }); }
      if (e.key === "Enter" && entries[active]) { e.preventDefault(); execute(entries[active]); }
    }} /><button className="workspace-icon" aria-label="Закрыть поиск" onClick={close}><X size={19} /></button></div>
    <div className="command-filters"><label>Курс<select aria-label="Курс поиска" value={course} onChange={e => setCourse(e.target.value as typeof course)}><option value="all">Все курсы</option>{Object.entries(courses).map(([id,c]) => <option key={id} value={id}>{c.title}</option>)}</select></label><label>Материал<select aria-label="Вид материала поиска" value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="all">Все виды</option><option value="definition">Определения</option><option value="theory">Теория и доказательства</option><option value="practice">Практика</option><option value="oral">Уточняющие вопросы</option></select></label></div>
    <div id="command-results" className="command-results" role="listbox" aria-label="Результаты поиска">{entries.map((entry,i) => <div id={`command-${i}`} key={entry.id} className={`study-result command-result ${active === i ? "is-selected" : ""}`} role="option" aria-selected={active === i} onMouseMove={() => setActive(i)}>{entry.href ? <a href={entry.href} onClick={close}><span><MathText text={entry.title} /><small>{entry.detail}</small></span><ArrowUpRight size={16} /></a> : <button onClick={() => execute(entry)}><span>{entry.title}<small>{entry.detail}</small></span><Command size={16} /></button>}</div>)}</div>
    {!entries.length && <p className="command-empty" role="status">{error ? "Поиск не загрузился. Откройте полный поиск или обновите страницу." : !search ? "Загружаем поиск…" : "Ничего не найдено. Попробуйте другое слово или смените фильтры."}</p>}
    <footer><span><kbd>↑</kbd><kbd>↓</kbd> выбрать · <kbd>Enter</kbd> открыть · <kbd>Esc</kbd> закрыть</span><a href={`#/search${query ? `?q=${encodeURIComponent(query)}` : ""}`} onClick={close}>Полный поиск ↗</a></footer>
  </dialog>;
}
