import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { courses, materialKey, type CourseId, type Material } from "./catalog";
import { Bookmark as BookmarkIcon, NotebookPen, Search, GraduationCap, Home, BookOpen, RotateCcw, Map, Timer, History, Settings, Cloud, Layers, MessageCircle, PenLine, PanelLeftClose, PanelLeftOpen, Menu, X, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import { platformKey, readPlatform } from "./platform-state";
export { platformKey, readPlatform } from "./platform-state";
export type { PlatformSaved } from "./platform-state";
import { MaterialActions } from "./MaterialActions";
import { SyncBadge } from "../Sync";
import { MathText } from "../calculus/MathText";
import { lastMaterial, resumeHref, toggleDensity } from "./workspace-preferences";
import { findMaterial } from "./catalog";
export function useCoursePage<T extends string>(course: CourseId, initial: T, allowed: readonly string[]): [T, Dispatch<SetStateAction<T>>] {
  const get = () => {
    const parts = location.hash.slice(2).split("?")[0].split("/");
    return parts[0] === course && allowed.includes(parts[1]) ? parts[1] as T : initial;
  };
  const [page, setPage] = useState<T>(get);
  useEffect(() => {
    const update = () => setPage(get());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [course]);
  const navigate: Dispatch<SetStateAction<T>> = next => {
    const value = typeof next === "function" ? next(page) : next;
    setPage(value);
    const hash = `#/${course}/${value}`;
    if (location.hash !== hash) location.hash = hash;
  };
  return [page, navigate];
}
export const workspaceSections = {
  calculus: [["dashboard", "Обзор", LayoutGrid], ["plan", "Тематический план", Map], ["today", "На сегодня", RotateCcw], ["definition", "Определения", Layers], ["theory", "Теория и доказательства", BookOpen], ["questions", "Вопросы принимающего", MessageCircle], ["oral", "Устный экзаменатор", MessageCircle], ["practice", "Практика", PenLine], ["simulation", "Пробный коллоквиум", Timer], ["history", "История", History], ["sync", "Синхронизация", Cloud], ["settings", "Настройки", Settings]],
  discrete: [["course", "Темы и вопросы", BookOpen], ["review", "Повторение", RotateCcw], ["plan", "План подготовки", Map], ["proofs", "Доказательства", GraduationCap], ["ticket", "Пробный билет", Timer], ["progress", "Мой прогресс", History], ["sync", "Синхронизация", Cloud]],
  linear: [["study", "Обзор", BookOpen], ["exam", "Контрольная", Timer]],
} as const;
export function navigateWorkspace(course: CourseId, route: string) {
  window.dispatchEvent(new CustomEvent("workspace-navigate", { detail: { course, route } }));
  location.hash = `#/${course}/${route}`;
}
export function openCommands() { window.dispatchEvent(new Event("workspace-commands")); }
export function toggleFocus() { const root = document.documentElement; root.dataset.focus = String(root.dataset.focus !== "true"); window.dispatchEvent(new Event("workspace-focus")); }
export function CourseTools({ course }: { course?: CourseId }) {
  const [hash, setHash] = useState(location.hash);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("colloquium-ui-sidebar") === "collapsed"; } catch { return false; } });
  const [compact, setCompact] = useState(document.documentElement.dataset.density === "compact");
  const [focused, setFocused] = useState(document.documentElement.dataset.focus === "true");
  useEffect(() => {
    const update = () => { setHash(location.hash); setMenu(false); };
    const focus = () => {
      const active = document.documentElement.dataset.focus === "true";
      setFocused(active);
      if (active) setMenu(false);
    };
    const density = () => setCompact(document.documentElement.dataset.density === "compact");
    window.addEventListener("workspace-density", density);
    window.addEventListener("hashchange", update); window.addEventListener("workspace-focus", focus);
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("dialog[open]")) setMenu(false); };
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("workspace-density", density); window.removeEventListener("hashchange", update); window.removeEventListener("workspace-focus", focus); window.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { document.documentElement.dataset.navCollapsed = String(collapsed); try { localStorage.setItem("colloquium-ui-sidebar", collapsed ? "collapsed" : "expanded"); } catch { /* Session preference still works. */ } }, [collapsed]);
  useEffect(() => { document.documentElement.dataset.menu = String(menu); return () => { delete document.documentElement.dataset.menu; }; }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.querySelector<HTMLButtonElement>('#workspace-nav nav button')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || document.querySelector("dialog[open]")) return;
      const targets = [...document.querySelectorAll<HTMLElement>('#workspace-nav a, #workspace-nav button, .workspace-mobile')].filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const index = targets.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); targets.at(-1)?.focus(); }
      else if (!event.shiftKey && (index === targets.length - 1 || index < 0)) { event.preventDefault(); targets[0]?.focus(); }
    };
    window.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", trap); document.querySelector<HTMLButtonElement>('.workspace-mobile')?.focus(); };
  }, [menu]);
  const materialRoute = course === "calculus" ? "definition" : course === "discrete" ? "course" : "study";
  const examRoute = course === "calculus" ? "simulation" : course === "discrete" ? "ticket" : "exam";
  const section = hash.slice(2).split("?")[0].split("/")[1];
  const route = hash.split("?")[0];
  const overview = course === "calculus" ? section === "dashboard" : !course && (!hash || route === "#/home");
  const settings = route === "#/settings" || route === "#/calculus/settings";
  const checking = course ? ["simulation", "oral", "ticket", "exam"].includes(section) : route === "#/bookmarks";
  const reading = course ? !overview && ["study", "course", "plan", "today", "definition", "theory", "questions", "practice", "proofs", "review"].includes(section) : route === "#/search";
  const utilityRoutes = ["history", "sync", "settings"];
  function sectionButtons(utilities: boolean) {
    if (!course) return null;
    return workspaceSections[course].filter(([route]) => utilityRoutes.includes(route) === utilities)
      .map(([route, label, Icon]) => <button key={route} title={label} aria-current={section === route ? "page" : undefined}
        className={section === route ? "active" : ""} onClick={() => { setMenu(false); navigateWorkspace(course, route); }}>
        <Icon size={18} /><span>{label}</span>
      </button>);
  }
  return <>
    <a className="workspace-skip" href="#workspace-content" onClick={e => { e.preventDefault(); const content = document.querySelector<HTMLElement>('main'); if (content) { content.tabIndex = -1; content.focus(); } }}>К содержимому</a>
    <header className="platform-bar" aria-label="Панель платформы">
      <button className="workspace-mobile workspace-icon" aria-label={course === "discrete" ? "Открыть меню" : "Меню"} aria-expanded={menu} aria-controls="workspace-nav" onClick={() => { if (focused) toggleFocus(); setMenu(!menu); }}>{menu ? <X size={20} /> : <Menu size={20} />}</button>
      <a className="platform-home" href="#/home"><span className="platform-brand-mark" aria-hidden="true"><GraduationCap size={22} /></span><span className="platform-brand-name">Коллоквиум</span></a>
      <div className="platform-header-links"><button className="study-header-search" onClick={openCommands} aria-label="Поиск по всем курсам"><Search size={17} /><span>Поиск материалов и действий</span><kbd>⌘ K / Ctrl K</kbd></button><a href="#/bookmarks" aria-label="Закладки" title="Закладки"><BookmarkIcon size={18} /><span className="workspace-link-label">Закладки</span></a><button className="workspace-icon" aria-label={focused ? "Выйти из Focus Mode" : "Focus Mode"} aria-pressed={focused} title="Focus Mode · Alt+F" onClick={toggleFocus}>{focused ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
    </header>
    {menu && <button className="workspace-scrim" aria-label="Закрыть меню" onClick={() => setMenu(false)} />}
    <aside id="workspace-nav" className="sidebar workspace-nav" aria-label="Навигация">
      <div className="workspace-nav-heading"><span>Навигация</span><button className="workspace-icon workspace-collapse" aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
      <nav aria-label="Разделы"><button title="Главная" className={!course && (!hash || hash === "#/home") ? "active" : ""} onClick={() => { location.hash = "#/home"; }}><Home size={18} /><span>Главная</span></button>
        {course && <><p className="workspace-nav-group current-course"><Layers size={18} />{courses[course].title}</p>{sectionButtons(false)}</>}
      </nav>
      <nav className="workspace-courses" aria-label="Курсы"><p className="workspace-nav-group">{course ? "Другие курсы" : "Курсы"}</p>{Object.entries(courses).filter(([id]) => id !== course).map(([id,c]) => <a key={id} title={c.title} href={`#/${id}/${c.start}`} onClick={e => { e.preventDefault(); navigateWorkspace(id as CourseId, c.start); }}><span className="workspace-course-symbol" aria-hidden="true">{id === "calculus" ? "∫" : id === "discrete" ? "⋈" : "⊞"}</span><span>{c.title}</span></a>)}</nav>
      {course && <nav className="workspace-utilities" aria-label="Сервисные разделы">{sectionButtons(true)}</nav>}
      <div className="workspace-nav-bottom">{course === "discrete" && <SyncBadge onOpen={() => navigateWorkspace("discrete", "sync")} />}<button onClick={toggleDensity} aria-label="Плотность интерфейса" aria-pressed={compact} title={compact ? "Включить комфортную плотность" : "Включить компактную плотность"}><Layers size={18} /><span>Плотность интерфейса<small>{compact ? "Компактная" : "Комфортная"}</small></span></button><a href="#/mistakes" aria-label="Журнал ошибок"><NotebookPen size={18} /><span>Журнал ошибок</span></a>{course !== "calculus" && <a aria-label="Данные и настройки" href="#/settings" aria-current={hash === "#/settings" ? "page" : undefined}><Settings size={18} /><span>Данные и настройки</span></a>}<span className="workspace-local"><i /><span>Прогресс на устройстве</span></span></div>
    </aside>
    <nav className="workspace-mobile-tabs" aria-label="Быстрые переходы">
      <a href="#/home" aria-label="На главную" aria-current={overview ? "page" : undefined}><Home size={20} /><span>Главная</span></a>
      <a href={course ? `#/${course}/${materialRoute}` : "#/search"} onClick={event => { if (course) { event.preventDefault(); navigateWorkspace(course, materialRoute); } }} aria-label="К материалам" aria-current={reading ? "page" : undefined}><BookOpen size={20} /><span>Материалы</span></a>
      <a href={course ? `#/${course}/${examRoute}` : "#/bookmarks"} onClick={event => { if (course) { event.preventDefault(); navigateWorkspace(course, examRoute); } }} aria-label="К проверке знаний" aria-current={checking ? "page" : undefined}><GraduationCap size={21} /><span>{course ? "Проверка" : "Закладки"}</span></a>
      <a href={course === "calculus" ? "#/calculus/settings" : "#/settings"} aria-label="К настройкам" aria-current={settings ? "page" : undefined}><Settings size={20} /><span>Настройки</span></a>
    </nav>
  </>;
}
export function Bookmark(material: Material) {
  const key = materialKey(material);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { try { setActive(readPlatform().bookmarks.includes(key)); } catch { setError("Не удалось прочитать закладки. Сохраните резервную копию."); } }, [key]);
  return <div className="platform-bookmark"><div className="study-card-tools"><button type="button" aria-pressed={active} onClick={() => {
    try {
      const data = readPlatform();
      const next = !data.bookmarks.includes(key);
      data.bookmarks = next ? [...data.bookmarks, key] : data.bookmarks.filter(k => k !== key);
      localStorage.setItem(platformKey, JSON.stringify(data));
      setActive(next); setError("");
      window.dispatchEvent(new Event("platform-bookmarks-changed"));
    } catch { setError("Не удалось сохранить закладку. Хранилище недоступно или заполнено."); }
  }} title={active ? "Убрать из закладок" : "В закладки"}><BookmarkIcon size={17} fill={active ? "currentColor" : "none"} /><span className="bookmark-label">{active ? "★ Убрать из закладок" : "☆ В закладки"}</span></button><MaterialActions key={key} material={findMaterial(material.course, material.kind, material.id) ?? material} /></div>{error && <p role="alert">{error}</p>}</div>;
}

export function ResumeMaterial({ course }: { course: CourseId }) {
  const material = lastMaterial(course);
  return material ? <a className="workspace-resume" href={resumeHref(course)}><BookOpen size={18} /><span><small>Последний открытый материал</small><strong><MathText text={material.title} /></strong></span><span aria-hidden="true">→</span></a> : null;
}
