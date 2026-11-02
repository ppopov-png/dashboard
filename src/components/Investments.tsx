import { useState } from 'react'
import type { DashboardData, InvestSnapshot } from '../types'
import { fmtMoney, fmtPct, toneClass } from '../utils'
import Metric from './Metric'

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('ru-RU', { timeZone: 'UTC' })
}

export default function Investments({ data }: { data: DashboardData }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const snapshots: InvestSnapshot[] = data.investSnapshots?.length
    ? data.investSnapshots
    : [{ key: 'current', meta: data.investMeta, teams: data.investTeams, timeline: data.investTimeline }]
  const snapshot = snapshots.find(item => item.key === selectedKey) ?? snapshots.at(-1)!
  const { meta, teams, timeline } = snapshot
  const totalPnl = meta.totalPnl ?? meta.realizedPnl + meta.unrealizedPnl
  const totalRisk = meta.totalRisk ?? meta.activeAllocation

  return (
    <section id="investments" className="panel reference-lower-panel investment-panel" aria-labelledby="investments-title">
      <div className="section-head investment-section-head">
        <div>
          <span className="eyebrow">INVEST IDEAS</span>
          <h2 id="investments-title">Инвестпредложения</h2>
          <p>По состоянию на {meta.asOf}{meta.periodStart && ` · учёт с ${dateLabel(meta.periodStart)}`}</p>
        </div>
        <div className="investment-report-controls">
          <span className="profile-period">{meta.openIdeas} в работе · {meta.closedIdeas} закрыто</span>
          {snapshots.length > 1 && (
            <label className="reference-select small investment-report-select">
              <span>Отчёт</span>
              <select aria-label="Отчёт по инвест-идеям" value={snapshot.key} onChange={event => setSelectedKey(event.target.value)}>
                {[...snapshots].reverse().map(item => <option key={item.key} value={item.key}>{item.meta.asOf}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="investment-summary">
        <Metric label="Реализованный PNL" value={fmtMoney(meta.realizedPnl)} tone={toneClass(meta.realizedPnl)} note="Зафиксированный результат" icon="pnl" accent="purple" />
        <Metric label="Нереализованный PNL" value={fmtMoney(meta.unrealizedPnl)} tone={toneClass(meta.unrealizedPnl)} note="Результат открытых позиций" icon="pnl" accent="cyan" />
        <Metric label="Совокупный PNL" value={fmtMoney(totalPnl)} tone={toneClass(totalPnl)} note="Реализованный + нереализованный" icon="pnl" accent="violet" />
      </div>

      <div className="investment-report-meta">
        <span>Всего идей <b>{meta.totalIdeas}</b></span>
        <span>Трейдеров <b>{Object.keys(teams).length}</b></span>
        <span>Суммарный риск по отчёту <b>{fmtMoney(totalRisk).replace('+', '')}</b></span>
      </div>

      <div className="investment-grid">
        {Object.entries(teams).map(([name, team]) => (
          <article className="investment-card" key={name} aria-label={team.team}>
            <div className="investment-card-head">
              <h3>{name}</h3>
              <span>Риск <b>{fmtMoney(team.allocation).replace('+', '')}</b></span>
            </div>
            <div className="investment-card-counts">В работе: <b>{team.open}</b><span>Закрыто: <b>{team.closed}</b></span></div>
            <div className="investment-stats">
              <span>Реализованный PNL <b className={toneClass(team.pnl)}>{fmtMoney(team.pnl)}</b></span>
              <span>ROI на аллокацию <b className={toneClass(team.roi)}>{fmtPct(team.roi)}</b></span>
            </div>
            {team.ideas.length ? (
              <ul>
                {team.ideas.map(idea => (
                  <li key={idea.name}>
                    <div className="investment-idea-head">
                      <strong>{idea.name}</strong>
                      <span className={`investment-idea-status ${idea.status}`}>{idea.status === 'open' ? 'В работе' : 'Закрыта'}</span>
                    </div>
                    {idea.realizedPnl != null || idea.unrealizedPnl != null ? (
                      <div className="investment-idea-results">
                        {idea.realizedPnl != null && <span>Реализовано <b className={toneClass(idea.realizedPnl)}>{fmtMoney(idea.realizedPnl)}</b></span>}
                        {idea.unrealizedPnl != null && <span>Нереализовано <b className={toneClass(idea.unrealizedPnl)}>{fmtMoney(idea.unrealizedPnl)}</b></span>}
                      </div>
                    ) : <p>{idea.detail}</p>}
                    {idea.closedAt && <p>Дата закрытия: {dateLabel(idea.closedAt)}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="investment-empty">Без позиций</p>}
          </article>
        ))}
      </div>

      {timeline.length > 0 && (
        <details className="investment-history">
          <summary>Хронология инвест-идей</summary>
          <ul className="events">
            {timeline.map((event, index) => <li key={`${event.date}-${index}`}><time>{event.date}</time><span>{event.text}</span></li>)}
          </ul>
        </details>
      )}
    </section>
  )
}
