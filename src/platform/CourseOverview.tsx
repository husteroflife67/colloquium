import type { ReactNode } from "react";
import { ArrowRight, ChevronRight, Circle, Play, type LucideIcon } from "lucide-react";
import { MathText } from "../calculus/MathText";
export type OverviewAction = { title: string; subtitle?: string; action: () => void; icon?: LucideIcon };
export type OverviewTopic = { title: string; value: number; total: number; action: () => void };
export function CourseOverview({ title, context, symbol, value, total, progressLabel, metrics, today, next, topics, onTopics, children }: {
  title: string; context: string; symbol: ReactNode; value: number; total: number; progressLabel: string;
  metrics: { label: string; value: string | number; icon: LucideIcon; action: () => void }[];
  today: OverviewAction[]; next: OverviewAction; topics: OverviewTopic[]; onTopics: () => void; children?: ReactNode;
}) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return <section className="course-overview unified-overview" aria-label={`Обзор: ${title}`}>
    <header className="calc-heading"><span className="calc-symbol" aria-hidden="true">{symbol}</span><div><h1>{title}</h1><p>{context}</p></div><span className="calc-percent" title={progressLabel}>Прогресс <b>{percent}%</b></span></header>
    <section className="unified-next"><div><h2>{value ? "Продолжить подготовку" : "Начать подготовку"}</h2><p><MathText text={next.subtitle ?? next.title} /></p><button className="overview-continue" onClick={next.action}><Play size={18} />Продолжить обучение<ArrowRight size={18} /></button></div><button className="unified-plan-link" onClick={onTopics}>Материалы курса <ArrowRight size={18} /></button></section>
    <div className="calc-columns">
      <section className="calc-panel"><header><h2>Сегодня</h2><small>Следующие шаги</small></header>{today.map(task => <button className="calc-task" key={task.title} onClick={task.action}><Circle /><span><strong>{task.title}</strong>{task.subtitle && <small>{task.subtitle}</small>}</span><ChevronRight size={17} /></button>)}</section>
      <section className="calc-panel unified-metrics"><header><h2>Подготовка</h2></header>{metrics.map(metric => <button className="calc-stat" key={metric.label} onClick={metric.action}><metric.icon /><b>{metric.value}</b><span>{metric.label}</span></button>)}</section>
    </div>
    <section className="calc-plan"><header><h2>Прогресс по темам</h2><button onClick={onTopics}>Все материалы <ArrowRight size={15} /></button></header><div>{topics.map(topic => <button key={topic.title} onClick={topic.action}><span>{topic.title}</span><small>{topic.value} / {topic.total}</small><ChevronRight size={15} /></button>)}</div></section>
    {children && <div className="calc-resources learning-summary">{children}</div>}
  </section>;
}
