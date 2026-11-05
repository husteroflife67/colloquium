import { useEffect, useState } from 'react';
import { Clock3, ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react';
import { useProgressReload } from '../progress-events';
import { cardLabel, sourceURL, difficultyLevels, topics, type LinearCard } from './model';
import { linearById, linearSolutions } from './content';
import { RichMath } from './RichMath';
import { clockTime, createExam, emptyExams, examKey, loadExams, saveExams, secondsLeft, settleExams, type ExamAttempt, type ExamData, type ExamMode, type Review } from './exam-model';

const date = (time: number) => new Date(time).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const modeLabel = (mode: ExamMode) => mode === 'mixed' ? 'Смешанная' : difficultyLevels.find(l => l.id === mode)!.label;
const reviewOptions: { value: Review; label: string }[] = [{ value: 'solved', label: 'Решил' }, { value: 'partial', label: 'Частично' }, { value: 'repeat', label: 'Повторить' }];
export default function LinearExam({ onSource }: { onSource: (card: LinearCard) => void }) {
  const [activeTask, setActiveTask] = useState(0);
  const [data, setData] = useState<ExamData>(() => { try { return loadExams(); } catch { return emptyExams(); } });
  const [error, setError] = useState(() => { try { loadExams(); return ''; } catch { return 'Не удалось прочитать сохранённые попытки. Исходная запись сохранена; восстановите резервную копию.'; } });
  const [selected, setSelected] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [mode, setMode] = useState<ExamMode>('mixed');
  const [now, setNow] = useState(Date.now);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useProgressReload(examKey, loadExams, setData);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);
  // Reload storage before every edit: another tab may have completed this attempt.
  function change(edit: (current: ExamData, time: number) => ExamData) {
    try {
      const time = Date.now();
      const next = edit(settleExams(loadExams(), time), time);
      saveExams(next); setData(next); setNow(time); setError(''); return next;
    } catch { setError('Не удалось сохранить попытку. Проверьте доступность хранилища и свободное место, затем повторите действие.'); return null; }
  }
  useEffect(() => {
    if (data.attempts.some(a => a.finishedAt === undefined && now >= a.deadline)) change(current => current);
  }, [now, data]); // Expiration also runs immediately after restoring a closed tab.
  const settled = settleExams(data, now);
  const attempt = settled.attempts.find(a => a.id === selected) ?? settled.attempts[0];
  const active = settled.attempts.find(a => a.finishedAt === undefined);
  const preparing = setup || !attempt;
  const finished = attempt?.finishedAt !== undefined;
  function start() {
    let created: ExamAttempt | undefined;
    const result = change((current, time) => {
      if (current.attempts.some(a => a.finishedAt === undefined)) throw Error('Есть незавершённая попытка');
      created = createExam(mode, time);
      return { ...current, attempts: [created, ...current.attempts] };
    });
    if (result && created) { setActiveTask(0); setSelected(created.id); setSetup(false); setConfirmEnd(false); }
  }
  function editAttempt(edit: (a: ExamAttempt, time: number) => ExamAttempt) {
    if (!attempt) return;
    change((current, time) => ({ ...current, attempts: current.attempts.map(a => a.id === attempt.id ? edit(a, time) : a) }));
  }
  function finish() {
    editAttempt((a, time) => a.finishedAt === undefined ? { ...a, finishedAt: time, finishReason: 'submitted' } : a);
    setConfirmEnd(false);
  }
  return <section className="linear-exam" aria-labelledby="linear-exam-title">
    <header className="linear-exam-heading"><div><span className="platform-overline">РЕПЕТИЦИЯ КОНТРОЛЬНОЙ</span><h1 id="linear-exam-title">Пробная контрольная</h1><p>5 номеров · 140 минут · подробный разбор после завершения</p></div><Clock3 size={44} aria-hidden="true" /></header>
    {error && <p role="alert" className="linear-note">{error}</p>}
    {preparing ? <div className="linear-exam-setup"><h3>Собери свой вариант</h3><p>Системы уравнений, матрицы, перестановки, определение или свойства определителей, вычисление определителя — по одному заданию из каждого блока.</p><p>Задания случайно выбираются из ваших сборников. Если указан подпункт, решается только он. Это тренировочный вариант по темам сводки.</p><label className="linear-difficulty-filter"><span>Сложность варианта</span><select aria-label="Сложность варианта" value={mode} onChange={e => setMode(e.target.value as ExamMode)}><option value="mixed">Смешанная: 1 простая, 3 средних, 1 сложная</option>{difficultyLevels.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></label><p className="linear-exam-rules">Подготовь бумагу, ручку и обычный калькулятор. Таймер идёт непрерывно, включая закрытую вкладку. Заметки и попытка сохраняются на этом устройстве и входят в общую резервную копию.</p>{active ? <button className="linear-exam-primary" onClick={() => { setSelected(active.id); setSetup(false); }}>Продолжить попытку <ArrowRight size={16} /></button> : <button className="linear-exam-primary" onClick={start}>Начать · 140 минут <ArrowRight size={16} /></button>}</div> : <>
      <div className={`linear-exam-status ${!finished && secondsLeft(attempt, now) <= 300 ? 'linear-exam-urgent' : ''}`}><div><b role="status">{finished ? attempt.finishReason === 'timeout' ? 'Время вышло' : 'Попытка завершена' : 'Вариант в работе'}</b><small>{date(attempt.startedAt)} · {modeLabel(attempt.mode)}</small></div>{finished ? <span>Затрачено {Math.ceil((attempt.finishedAt! - attempt.startedAt) / 60000)} из 140 мин</span> : <div className="linear-exam-clock"><small>Осталось</small><span role="timer" aria-label="Оставшееся время" aria-live="off">{clockTime(secondsLeft(attempt, now))}</span></div>}</div>
      {!finished && <div className="linear-exam-submit">{confirmEnd ? <div role="group" aria-label="Подтверждение завершения"><p>Завершить попытку и открыть разбор? Вернуться к таймеру после этого нельзя.</p><button className="linear-exam-primary" onClick={finish}>Завершить и открыть разбор</button><button onClick={() => setConfirmEnd(false)}>Продолжить решать</button></div> : <><p>Решай на бумаге. Здесь можно сохранить ответ или короткие заметки.</p><button onClick={() => setConfirmEnd(true)}>Завершить досрочно</button></>}</div>}
      {finished && <div className="linear-exam-summary"><h3>Самопроверка</h3><p>Сравни свои решения с разбором и оцени каждый номер. Проверка здесь самостоятельная.</p><div>{reviewOptions.map(option => <span key={option.value}>{option.label}: <b>{Object.values(attempt.reviews).filter(r => r === option.value).length}</b></span>)}<span>Без оценки: <b>{5 - Object.keys(attempt.reviews).length}</b></span></div><button onClick={() => { setSetup(true); setConfirmEnd(false); }}><RotateCcw size={16} />Новый вариант</button></div>}
      <nav className="linear-exam-jump" aria-label="Номера пробной контрольной">{attempt.items.map((id, i) => <button key={id} aria-current={activeTask === i ? "step" : undefined} aria-label={`К заданию ${i + 1}${attempt.drafts[id] ? ' · есть записи' : ''}${attempt.reviews[id] ? ' · оценено' : ''}`} title={`Задание ${i + 1}${attempt.drafts[id] ? ' · есть записи' : ''}`} onClick={() => { setActiveTask(i); document.getElementById(`exam-task-${i + 1}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }}>{i + 1}{(attempt.drafts[id] || attempt.reviews[id]) && <i />}</button>)}</nav>
      {attempt.items.map((id, i) => { const card = linearById.get(id)!; const level = difficultyLevels.find(l => l.id === card.difficulty)!; return <article className="linear-exam-task" id={`exam-task-${i + 1}`} key={`${attempt.id}-${id}`}><header><div><span className="platform-overline">ЗАДАНИЕ {i + 1} / 5 · {topics[card.topic].short}</span><h3>№ {i + 1} · {cardLabel(card)}</h3><p>{card.title}</p></div><span className={`linear-difficulty-badge linear-difficulty-${card.difficulty}`}>{level.label}</span></header><button onClick={() => onSource(card)}><BookOpen size={16} />Открыть условие {cardLabel(card)}</button><details className="linear-exam-source" open={!finished && activeTask === i}><summary>Оригинал условия · {cardLabel(card)}</summary>{card.pages.map(page => <img key={page} src={sourceURL(card.book, page)} loading="lazy" alt={`Оригинал условия ${cardLabel(card)}, страница ${page}`} />)}</details><label className="linear-exam-draft"><span>Ответ и заметки к № {i + 1}</span><textarea aria-label={`Ответ и заметки к № ${i + 1}`} maxLength={10000} rows={3} value={attempt.drafts[id] ?? ''} readOnly={finished} placeholder={finished ? 'Заметки не добавлены' : 'Можно оставить пустым, если решаешь на бумаге'} onChange={e => { const text = e.target.value; editAttempt(a => a.finishedAt === undefined ? { ...a, drafts: { ...a.drafts, [id]: text } } : a); }} /></label>{finished && <><details className="linear-exam-solution"><summary>Подробное решение · {cardLabel(card)}</summary><RichMath html={linearSolutions[id]} /></details><fieldset className="linear-exam-review"><legend>Результат № {i + 1}</legend>{reviewOptions.map(option => <label key={option.value}><input type="radio" name={`review-${attempt.id}-${id}`} value={option.value} checked={attempt.reviews[id] === option.value} onChange={() => editAttempt(a => a.finishedAt !== undefined ? { ...a, reviews: { ...a.reviews, [id]: option.value } } : a)} />{option.label}</label>)}</fieldset></>}</article>; })}
      <div className="linear-exam-navigation"><button disabled={activeTask === 0} onClick={() => { setActiveTask(activeTask - 1); document.getElementById(`exam-task-${activeTask}`)?.scrollIntoView({ block: "start" }); }}>Предыдущее задание</button><button disabled={activeTask === attempt.items.length - 1} onClick={() => { setActiveTask(activeTask + 1); document.getElementById(`exam-task-${activeTask + 2}`)?.scrollIntoView({ block: "start" }); }}>Следующее задание <ArrowRight size={16} /></button></div>
    </>}
    {settled.attempts.length > 0 && <details className="linear-exam-history"><summary>Сохранённые попытки · {settled.attempts.length}</summary><ul>{settled.attempts.map(a => <li key={a.id}><button onClick={() => { setSelected(a.id); setSetup(false); setConfirmEnd(false); }}>{a.finishedAt === undefined ? <Clock3 size={15} /> : <Check size={15} />}{date(a.startedAt)} · {modeLabel(a.mode)} · {a.finishedAt === undefined ? 'продолжить' : 'разбор'}</button></li>)}</ul></details>}
  </section>;
}
