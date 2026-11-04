import { ArrowRight, BookOpen, ChevronRight, Circle, Clock3, Layers, ListChecks } from "lucide-react";
import { lastMaterial } from "../platform/workspace-preferences";
import { items, topics } from "./content";
import type { Item } from "./content/types";
import type { Data, Rating } from "./engine";
import { MathText } from "./MathText";
import { dueItems } from "./repetition";

// Sample a single mathematical surface in both directions to draw a static wireframe.
function project(u: number, v: number) {
  const x = 540 * u + 135 * v;
  const y = 150 + 90 * v - 70 * Math.sin(u * 7.3 - 1.3 * v) - 106 * u;
  return x.toFixed(1) + "," + y.toFixed(1);
}
function meshLine(index: number, across: boolean) {
  return Array.from({length: 85}, (_, i) => across ? project(i / 84, index / 32) : project(index / 32, i / 84)).join(" ");
}
const mesh = Array.from({length: 33}, (_, i) => [meshLine(i, true), meshLine(i, false)]).flat();
const definitions = items.filter(i => i.definitionNumber !== undefined);
const proofs = items.filter(i => i.kind === "theory" && i.required);
const practice = items.filter(i => i.kind === "practice");

export function CalculusDashboard({ data, questionRatings, questionCount, navigate, open, openTopic, openWeak }: {
  data: Data; questionRatings: Record<string, Rating>; questionCount: number;
  navigate: (route: string) => void; open: (item: Item) => void; openTopic: (id: number) => void; openWeak: () => void;
}) {
  const known = (group: Item[]) => group.filter(item => data.ratings[item.id] === "known").length;
  const mastered = known(items);
  const last = lastMaterial("calculus");
  const started = Boolean(last || Object.keys(data.ratings).length || data.history.length || Object.keys(questionRatings).length);
  const upcoming = dueItems(items, data.schedules ?? {}, Date.now());
  const next = items.find(i => i.id === last?.id) ?? upcoming.find(i => data.ratings[i.id] !== "known")
    ?? items.find(i => data.ratings[i.id] !== "known") ?? items[0];
  const due = upcoming.filter(i => data.schedules?.[i.id]).length;
  const stats = [
    { icon: BookOpen, value: started ? known(definitions) + " / " + definitions.length : definitions.length, label: "Определения", route: "definition" },
    { icon: Layers, value: started ? known(proofs) + " / " + proofs.length : proofs.length, label: "Доказательства", route: "theory" },
    started ? { icon: Clock3, value: due, label: "К повторению", route: "today" }
      : { icon: ListChecks, value: practice.length, label: "Задачи для практики", route: "practice" },
  ];
  return <section className="calc-dashboard">
    <header className="calc-heading"><span className="calc-symbol" aria-hidden="true">∫</span>
      <div><h1>Математический анализ</h1><p>Подготовка к коллоквиуму · 1 модуль</p></div>
      <span className="calc-percent" title={mastered + " из " + items.length + " с оценкой «Знаю»"}>Прогресс <b>{Math.round(100 * mastered / items.length)}%</b></span>
    </header>
    <section className="calc-hero">
      <svg className="calc-mesh" viewBox="0 0 600 250" preserveAspectRatio="none" aria-hidden="true">{mesh.map((points, i) => <polyline key={i} points={points} />)}</svg>
      <div className="calc-hero-copy"><h2>{started ? "Продолжить обучение" : "С чего начать?"}</h2>
        <p><strong><MathText text={next.title} /></strong></p>
        <div className="calc-actions"><button onClick={() => open(next)}>{started ? "Продолжить" : "Начать обучение"} <ArrowRight size={18} /></button><button onClick={() => navigate("plan")}>План подготовки</button></div>
      </div>
    </section>
    <div className="calc-columns">
      <section className="calc-panel"><header><h2>Ближайшие задачи</h2><small>Сегодня</small></header>
        <button className="calc-task" onClick={() => navigate(due ? "today" : "oral")}><Circle /><span><strong>{due ? "Повторить материалы" : "Потренировать устный ответ"}</strong><small>{due ? "К повторению по расписанию: " + due : "Вопросы и уточнения принимающего"}</small></span><ChevronRight /></button>
        <button className="calc-task" onClick={() => navigate("simulation")}><Circle /><span><strong>Пройти пробный билет</strong><small>Проверка знаний в формате коллоквиума</small></span><ChevronRight /></button>
      </section>
      <section className="calc-panel"><header><h2>{started ? "Статистика" : "Материалы курса"}</h2></header>
        {stats.map(({ icon: Icon, value, label, route }) => <button key={label} className="calc-stat" onClick={() => navigate(route)}><Icon /><b>{value}</b><span>{label}</span></button>)}
      </section>
    </div>
    <section className="calc-plan"><header><h2>Темы курса</h2><button onClick={() => navigate("plan")}>Весь план <ArrowRight size={16} /></button></header>
      <div>{topics.map(t => { const group = items.filter(i => i.topic === t.id); return <button key={t.id} onClick={() => openTopic(t.id)}><span>{t.title}</span><small>{started ? known(group) + " / " + group.length : group.length + " мат."}</small><ChevronRight size={15} /></button>; })}</div>
    </section>
    <div className="calc-resources learning-summary">
      {started && <><span>Практика: {known(practice)} / {practice.length}</span><span>Уточнения: {Object.values(questionRatings).filter(r => r === "known").length} / {questionCount}</span><button onClick={openWeak}>Сложные материалы</button><button onClick={() => navigate("history")}>История билетов ({data.history.length})</button></>}
      <a href={import.meta.env.BASE_URL + "sources/program.pdf"} target="_blank" rel="noreferrer">Программа курса ↗</a><a href={import.meta.env.BASE_URL + "sources/notes.pdf"} target="_blank" rel="noreferrer">Конспект лекций ↗</a>
    </div>
  </section>;
}
