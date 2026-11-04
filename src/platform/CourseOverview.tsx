import type { ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronRight, Circle, Play, type LucideIcon } from "lucide-react";
import { MathText } from "../calculus/MathText";
export type OverviewAction = { title: string; subtitle?: string; action: () => void; icon?: LucideIcon };
export type OverviewTopic = { title: string; value: number; total: number; action: () => void };
export function CourseOverview({ title, context, symbol, value, total, progressLabel, metrics, today, next, topics, onTopics, children }: {
  title: string; context: string; symbol: ReactNode; value: number; total: number; progressLabel: string;
  metrics: { label: string; value: string | number; icon: LucideIcon; action: () => void }[];
  today: OverviewAction[]; next: OverviewAction; topics: OverviewTopic[]; onTopics: () => void; children?: ReactNode;
}) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return <section className="course-overview" aria-label={`Обзор: ${title}`}>
    <header className="overview-banner">
      <div className="overview-course-icon" aria-hidden="true">{symbol}</div>
      <div className="overview-banner-copy"><span className="overview-context">{context}</span><h1>{title}</h1><div className="overview-inline-progress"><progress value={value} max={total} aria-label={progressLabel} /><strong>{percent}%</strong><span>{progressLabel}</span></div></div>
      <div className="overview-waves" aria-hidden="true"><i /><i /><i /></div>
    </header>
    <div className="overview-mobile-progress"><div className="overview-ring" style={{ background: `conic-gradient(var(--ds-accent) ${percent}%, var(--ds-soft) 0)` }}><span>{percent}%</span></div><div><strong>{value} / {total}</strong><small>{progressLabel}</small></div></div>
    <div className="overview-metrics">{metrics.map(metric => <button key={metric.label} onClick={metric.action} title={metric.label}><metric.icon size={21} /><span><strong>{metric.value}</strong><small>{metric.label}</small></span><ChevronRight size={16} /></button>)}</div>
    <div className="overview-work"><section className="overview-today"><div className="overview-section-title"><h2>Сегодня</h2><span>Следующие шаги</span></div>{today.map(task => <button key={task.title} onClick={task.action}><span className="overview-task-icon">{task.icon ? <task.icon size={18} /> : <Circle size={18} />}</span><span><strong>{task.title}</strong>{task.subtitle && <small>{task.subtitle}</small>}</span><ChevronRight size={17} /></button>)}</section>
      <button className="overview-continue" onClick={next.action}><span className="overview-play"><Play size={23} fill="currentColor" /></span><span><strong>Продолжить обучение</strong><small><MathText text={next.subtitle ?? next.title} /></small></span><ArrowRight size={22} /></button>
    </div>
    <section className="overview-topics"><div className="overview-section-title"><h2>Прогресс по темам</h2><button onClick={onTopics}>Все материалы <ArrowRight size={15} /></button></div><div className="overview-topic-grid">{topics.map(topic => <button key={topic.title} onClick={topic.action}><span><strong>{topic.title}</strong><small>{topic.value} / {topic.total}</small><b>{topic.total ? Math.round(topic.value / topic.total * 100) : 0}%</b></span><progress value={topic.value} max={topic.total} aria-label={`${progressLabel}: ${topic.title}`} /></button>)}</div></section>
    {children && <div className="overview-support learning-summary">{children}</div>}
  </section>;
}
