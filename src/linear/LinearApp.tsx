import { CourseOverview } from "../platform/CourseOverview";
import { lastMaterial } from "../platform/workspace-preferences";
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Grid3X3, Printer, Search, X, ZoomIn, ChevronDown, Layers, RotateCcw } from 'lucide-react';
import { CourseTools, ResumeMaterial, Bookmark } from '../platform/course-tools';
import { materials } from '../platform/catalog';
import { useProgressReload } from '../progress-events';
import { linearCards, topics, loadLinear, markLinear, linearKey, cardLabel, sourceFor, sourceURL, bookTitle, matchesNumber, difficultyLevels, isDifficulty, type DifficultyFilter, type LinearCard } from './model';
import { linearSolutions, linearById } from './content';
import { RichMath } from './RichMath';
import css from './linear.css?inline';
import LinearExam from './LinearExam';
function readRoute() {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const item = linearById.get(params.get('item') ?? '');
  const index = Number(params.get('topic'));
  const topic = item?.topic ?? (params.has('topic') && Number.isInteger(index) && index >= 0 && index < topics.length ? index : -1);
  const selectedDifficulty = params.get('difficulty');
  const difficulty: DifficultyFilter = isDifficulty(selectedDifficulty) ? selectedDifficulty : 'all';
  return { exam: location.hash.split('?')[0] === '#/linear/exam', topic, item, difficulty, tab: params.get('tab') === 'theory' ? 'theory' : params.get('tab') === 'solutions' || item ? 'solutions' : 'conditions' };
}
function go(topic: number, tab = 'conditions', item?: string, difficulty: DifficultyFilter = 'all') {
  const params = new URLSearchParams();
  if (topic >= 0) params.set('topic', String(topic));
  if (tab !== 'conditions') params.set('tab', tab);
  if (item) params.set('item', item);
  if (difficulty !== 'all') params.set('difficulty', difficulty);
  location.hash = `#/linear/study${params.size ? `?${params}` : ''}`;
}
function DifficultyBadge({ difficulty }: { difficulty: LinearCard['difficulty'] }) {
  const level = difficultyLevels.find(level => level.id === difficulty)!;
  return <span className={`linear-difficulty-badge linear-difficulty-${difficulty}`}>{level.label}</span>;
}
function DifficultyHeading({ level, cards, done }: { level: typeof difficultyLevels[number]; cards: LinearCard[]; done: Record<string, boolean> }) {
  return <header className="linear-level-heading"><div><h3>{level.title}</h3><p>{level.description}</p></div><span>{cards.filter(c => done[c.id]).length} / {cards.length} решено</span></header>;
}
function Task({ card, done, onDone, onSource, allOpen }: { card: LinearCard; done: boolean; onDone: (id: string, checked: boolean) => void; onSource: (c: LinearCard) => void; allOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const expanded = open || allOpen;
  const material = materials.find(m => m.course === 'linear' && m.id === card.id)!;
  return <article className={`linear-task ${done ? 'linear-task-done' : ''}`} id={`linear-${card.id}`}>
    <div className="linear-task-head"><label className="linear-completion"><input type="checkbox" checked={done} aria-label={`Отметить ${cardLabel(card)} решённой`} onChange={e => onDone(card.id, e.target.checked)} /><span>{cardLabel(card)}</span></label><span className="linear-task-title">{card.title}</span><DifficultyBadge difficulty={card.difficulty} /><button onClick={() => onSource(card)}><BookOpen size={15} />Условие</button><button aria-expanded={expanded} aria-controls={`solution-${card.id}`} onClick={() => setOpen(!expanded)} disabled={allOpen}>{expanded ? 'Скрыть решение' : 'Показать решение'}<ChevronDown size={15} /></button></div>
    {expanded && <div id={`solution-${card.id}`} className="linear-solution"><RichMath html={linearSolutions[card.id]} /></div>}
    <div className="linear-task-actions"><Bookmark {...material} /></div>
  </article>;
}
export default function LinearApp() {
  const [route, setRoute] = useState(readRoute);
  const [progress, setProgress] = useState(() => { try { return loadLinear(); } catch { return { version: 1 as const, done: {} }; } });
  const [query, setQuery] = useState('');
  const [todo, setTodo] = useState(false);
  const [error, setError] = useState(() => { try { loadLinear(); return ''; } catch { return 'Не удалось прочитать прогресс. Исходная запись сохранена; восстановите резервную копию.'; } });
  const [allOpen, setAllOpen] = useState(false);
  const [modal, setModal] = useState<{ title: string; pages: { book: string; page: number }[] } | null>(null);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  useProgressReload(linearKey, loadLinear, setProgress);
  useEffect(() => {
    let previous = readRoute();
    const update = () => {
      const next = readRoute();
      if (next.topic !== previous.topic || next.item?.id !== previous.item?.id) { setQuery(''); setTodo(false); }
      setRoute(next); setAllOpen(false); previous = next;
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { if (modal) { priorFocus.current = document.activeElement as HTMLElement; dialog.current?.showModal(); } }, [modal]);
  useEffect(() => { const after = () => setAllOpen(false); window.addEventListener('afterprint', after); return () => window.removeEventListener('afterprint', after); }, []);
  function closeModal() { dialog.current?.close(); setModal(null); setZoom(false); priorFocus.current?.focus(); }
  function source(card: LinearCard) { setModal({ title: `${cardLabel(card)} · найдите этот номер и подпункт на скане`, pages: card.pages.map(page => ({ book: card.book, page })) }); }
  function update(id: string, value: boolean) { try { setProgress(markLinear(id, value)); setError(''); } catch { setError('Не удалось сохранить отметку. Данные на устройстве не изменены; проверьте доступность хранилища.'); } }
  const nextCard = linearCards.find(card => !progress.done[card.id]) ?? linearCards[0];
  const done = linearCards.filter(c => progress.done[c.id]).length;
  const cards = linearCards.filter(c => c.topic === route.topic && (!route.item || route.item.id === c.id) && (route.item || route.difficulty === 'all' || c.difficulty === route.difficulty) && matchesNumber(c, query) && (!todo || !progress.done[c.id]));
  const groups = difficultyLevels.map(level => ({ level, cards: cards.filter(c => c.difficulty === level.id) })).filter(group => group.cards.length);
  const pages = new Map<string, { book: string; page: number; labels: Set<string> }>();
  for (const card of cards) for (const page of card.pages) { const key = card.book + page; if (!pages.has(key)) pages.set(key, { book: card.book, page, labels: new Set() }); pages.get(key)!.labels.add(cardLabel(card)); }
  function print() { if (route.tab === 'solutions') { setAllOpen(true); setTimeout(() => window.print(), 100); } else window.print(); }
  return <><CourseTools course="linear" /><style>{css}</style><main className="linear-page">
    <a className="linear-back" href="#/home"><ArrowLeft size={15} /> Все курсы</a>
    <header className="linear-heading" style={route.topic < 0 ? { display: "none" } : undefined}><div><span className="platform-overline">ЛИНЕЙНАЯ АЛГЕБРА · МОДУЛЬ 2</span><h1>Линейная <span>алгебра</span></h1><p>Условия из сборников, подробные решения и пробная контрольная.</p></div><span className="linear-heading-art" aria-hidden="true"><Grid3X3 size={68} /><i>Ax = b</i></span></header>
    {error && <p role="alert" className="linear-note">{error}</p>}
    {!route.exam && route.topic < 0 && <CourseOverview title="Линейная алгебра" context="Модуль 2 · твоя подготовка" symbol="⊞" value={done} total={linearCards.length} progressLabel="Отмечено решёнными"
      metrics={[
        { label: "Задач решено", value: `${done} / ${linearCards.length}`, icon: BookOpen, action: () => go(nextCard.topic, 'solutions', nextCard.id) },
        { label: "Осталось решить", value: linearCards.length - done, icon: RotateCcw, action: () => { go(nextCard.topic, 'solutions'); setTodo(true); } },
        { label: "Тем курса", value: topics.length, icon: Layers, action: () => document.getElementById('linear-topic-catalog')?.scrollIntoView() },
        { label: "Номеров из сводки", value: 188, icon: Grid3X3, action: () => document.getElementById('linear-topic-catalog')?.scrollIntoView() },
      ]}
      today={[{ title: "Решить следующую задачу", subtitle: cardLabel(nextCard), icon: BookOpen, action: () => go(nextCard.topic, 'solutions', nextCard.id) }, { title: "Пройти пробную контрольную", subtitle: "5 номеров · 140 минут", action: () => { location.hash = '#/linear/exam'; } }]}
      next={{ title: "Продолжить обучение", subtitle: lastMaterial('linear')?.title ?? `${cardLabel(nextCard)} · ${nextCard.title}`, action: () => { const last = linearCards.find(c => c.id === lastMaterial('linear')?.id) ?? nextCard; go(last.topic, 'solutions', last.id); } }}
      topics={topics.map((t,i) => { const list = linearCards.filter(c => c.topic === i); return { title: t.name, total: list.length, value: list.filter(c => progress.done[c.id]).length, action: () => go(i) }; })} onTopics={() => document.getElementById('linear-topic-catalog')?.scrollIntoView()}>
      <a href="#/linear/exam">Пробная контрольная ↗</a><span>Просмотр решения не меняет прогресс.</span><span>Отмечай задачу после самостоятельного решения.</span>
    </CourseOverview>}
    {!route.exam && route.topic >= 0 && <ResumeMaterial course="linear" />}
    {route.exam ? <details className="linear-convention"><summary>Соглашение о перестановках</summary><p><b>Перестановки умножаем справа налево:</b> сначала правая, потом левая. Это соглашение применяется ко всем решениям обоих сборников.</p></details> : <div className="linear-note"><b>Перестановки умножаем справа налево:</b> сначала правая, потом левая. Это соглашение применяется ко всем решениям обоих сборников.</div>}
    <nav className="linear-topics" aria-label="Темы линейной алгебры"><button className={route.topic < 0 && !route.exam ? 'active' : ''} onClick={() => go(-1)}>Все темы</button>{!route.exam && topics.map((t, i) => <button key={t.short} className={route.topic === i && !route.exam ? 'active' : ''} onClick={() => go(i)}>{i + 1}. {t.short}</button>)}<button className={route.exam ? 'active' : ''} onClick={() => { location.hash = '#/linear/exam'; }}>Пробная контрольная</button></nav>
    {route.exam ? <LinearExam onSource={source} /> : route.topic < 0 ? <><div id="linear-topic-catalog" className="linear-topic-grid">{topics.map((topic, i) => { const list = linearCards.filter(c => c.topic === i); const completed = list.filter(c => progress.done[c.id]).length; return <a className="linear-topic-card" key={topic.short} href={`#/linear/study?topic=${i}`}><span className="platform-overline">ТЕМА {i + 1}</span><h2>{topic.name}</h2><p>{topic.desc}</p><div><span>{completed} / {list.length} разборов пройдено</span><ArrowRight size={20} /></div><progress value={completed} max={list.length} aria-label={`Прогресс: ${topic.name}`} /></a>; })}</div><section className="linear-method"><h2>Сначала задача, затем решение</h2><ol><li>Открой тему и вкладку «Условия». Над каждым сканом указаны нужные номера.</li><li>Реши задачу самостоятельно. Во вкладке «Решения» найди номер и раскрой подробный разбор.</li><li>Поставь отметку только после самостоятельного решения. В каждой теме задачи идут от простых к сложным. Фильтры сложности и «Осталось» помогут выбрать, что решать дальше.</li></ol><p>П — Проскуряков, К — Кострикин. Условия взяты из ваших PDF, пояснения и решения — авторские. На сканах могут быть соседние задачи вне списка.</p><p>На контрольной разрешены ручка и калькулятор для арифметических операций с числами. Задания прошлых лет не приложены к исходным материалам.</p></section></> : <section className="linear-topic-content"><h2>{topics[route.topic].name}</h2><div className="linear-toolbar"><div className="linear-tabs" role="group" aria-label="Режим чтения"><button className={route.tab === 'conditions' ? 'active' : ''} onClick={() => go(route.topic, 'conditions', undefined, route.difficulty)}>Условия</button><button className={route.tab === 'solutions' ? 'active' : ''} onClick={() => go(route.topic, 'solutions', route.item?.id, route.difficulty)}>Решения</button><button className={route.tab === 'theory' ? 'active' : ''} onClick={() => go(route.topic, 'theory', undefined, route.difficulty)}>Краткая теория</button></div><label className="linear-search"><Search size={16} /><input aria-label="Поиск задач линейной алгебры" value={query} onChange={e => setQuery(e.target.value)} placeholder="Номер: П 82, К 17.1" /></label><label className="linear-difficulty-filter"><span>Сложность</span><select aria-label="Сложность задач" value={route.item?.difficulty ?? route.difficulty} onChange={e => { const current = readRoute(); go(current.topic, current.tab, undefined, e.target.value as DifficultyFilter); }}><option value="all">Все уровни</option>{difficultyLevels.map(level => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label><label className="linear-todo"><input type="checkbox" checked={todo} onChange={e => setTodo(e.target.checked)} />Осталось</label><button onClick={print}><Printer size={16} />Печать</button></div>
      {route.item && <p className="linear-target-note">Открыта карточка {cardLabel(route.item)}. <button onClick={() => go(route.topic, 'solutions')}>Показать всю тему</button></p>}
      {route.tab === 'theory' ? <div className="linear-theory"><RichMath html={topics[route.topic].theory} /></div> : <><p className="linear-help">{route.tab === 'conditions' ? 'На сканах найдите номера, указанные над изображением. Нажмите на страницу, чтобы увеличить.' : 'Решения скрыты до нажатия кнопки. Широкие формулы можно прокручивать по горизонтали.'}</p>{!cards.length && <p role="status" className="linear-empty">По этому запросу и фильтру задач нет. Измените сложность, очистите номер или снимите отметку «Осталось».</p>}
      {route.tab === 'conditions' ? <><div className="linear-levels">{groups.map(({ level, cards: groupCards }) => <section key={level.id} className="linear-level-group" data-difficulty={level.id}><DifficultyHeading level={level} cards={groupCards} done={progress.done} /><div className="linear-number-list">{groupCards.map(c => <button key={c.id} onClick={() => go(c.topic, 'solutions', c.id, route.difficulty)}>{cardLabel(c)}</button>)}</div></section>)}</div>{cards.length > 0 && <h3 className="linear-source-heading">Страницы с условиями</h3>}{[...pages.values()].map(({ book, page, labels }) => <article key={book + page} className="linear-source"><div><span><b>{bookTitle(book)} · стр. {sourceFor(book, page).printedPage}</b><small>Искать: {[...labels].join(' · ')}</small></span><button onClick={() => setModal({ title: `${bookTitle(book)} · стр. ${sourceFor(book, page).printedPage}`, pages: [{ book, page }] })}><ZoomIn size={16} />Увеличить</button></div><button className="linear-image-button" aria-label={`Увеличить ${bookTitle(book)}, стр. ${sourceFor(book, page).printedPage}`} onClick={() => setModal({ title: `${bookTitle(book)} · стр. ${sourceFor(book, page).printedPage}`, pages: [{ book, page }] })}><img src={sourceURL(book, page)} loading="lazy" alt={`${bookTitle(book)}, страница ${sourceFor(book, page).printedPage}`} /></button></article>)}</> : <>{cards.length > 0 && <button className="linear-reveal-all" onClick={() => setAllOpen(!allOpen)}>{allOpen ? 'Вернуть скрытие решений' : 'Раскрыть все решения в подборке'}</button>}{groups.map(({ level, cards: groupCards }) => <section key={level.id} className="linear-level-group" data-difficulty={level.id}><DifficultyHeading level={level} cards={groupCards} done={progress.done} />{groupCards.map(card => <Task key={card.id} card={card} done={!!progress.done[card.id]} onDone={update} onSource={source} allOpen={allOpen} />)}</section>)}</>}
      </>}
    </section>}
    <footer className="linear-footer"><Check size={17} /><p>Прогресс курса и попытки пробной контрольной хранятся на устройстве и входят в <a href="#/home">общую резервную копию</a>. Просмотр решения не меняет отметку о решении. Облачная синхронизация линейной алгебры пока не подключена.</p></footer>
  </main><dialog ref={dialog} className={`linear-dialog ${zoom ? 'linear-dialog-zoom' : ''}`} onCancel={e => { e.preventDefault(); closeModal(); }} onClick={e => { if (e.target === dialog.current) closeModal(); }}><div className="linear-dialog-head"><b>{modal?.title}</b><button onClick={() => setZoom(!zoom)}><ZoomIn size={17} />{zoom ? 'По ширине' : 'Крупнее'}</button><button onClick={closeModal} aria-label="Закрыть оригинал условия"><X size={20} /></button></div><div className="linear-dialog-scroll">{modal?.pages.map(({ book, page }) => <section key={book + page}><p>{bookTitle(book)} · стр. {sourceFor(book, page).printedPage}</p><img src={sourceURL(book, page)} alt={`${bookTitle(book)}, страница ${sourceFor(book, page).printedPage}`} /></section>)}</div></dialog></>;
}
