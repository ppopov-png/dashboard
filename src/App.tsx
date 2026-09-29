import { useEffect, useMemo, useState } from 'react'
import type { DashboardData, TraderRow } from './types'
import { fmtMoney, fmtPct, toneClass } from './utils'
import './styles.css'

type Page = 'overview' | 'futures' | 'invest'

function Metric({ label, value, note, tone = '' }: { label: string; value: string; note?: string; tone?: string }) {
  return <div className="metric-card"><span>{label}</span><strong className={tone}>{value}</strong>{note && <small>{note}</small>}</div>
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [page, setPage] = useState<Page>('overview')
  const [periodKey, setPeriodKey] = useState('')
  const [trader, setTrader] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/dashboard.json`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<DashboardData>
      })
      .then((payload) => {
        setData(payload)
        setPeriodKey(payload.periods.at(-1)?.key ?? '')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки данных'))
  }, [])

  const rows = useMemo(() => data?.data[periodKey] ?? [], [data, periodKey])
  const selectedRows = trader === 'all' ? rows : rows.filter((r) => r.name === trader)
  const period = data?.periods.find((p) => p.key === periodKey)
  const futuresPnl = selectedRows.reduce((s, r) => s + r.pnl, 0)
  const futuresAllocation = selectedRows.reduce((s, r) => s + (r.capitalStart || 0), 0)
  const futuresRoi = futuresAllocation ? futuresPnl / futuresAllocation * 100 : 0
  const invest = data?.investHistory[periodKey] ?? { realized: 0, allocation: 0, note: '' }
  const investPnl = trader === 'all' ? invest.realized : 0
  const totalPnl = futuresPnl + investPnl
  const totalBase = futuresAllocation + (trader === 'all' ? invest.allocation : 0)
  const totalRoi = totalBase ? totalPnl / totalBase * 100 : 0
  const positive = selectedRows.filter((r) => r.pnl > 0).length

  if (error) return <div className="loading">Ошибка: {error}</div>
  if (!data || !period) return <div className="loading">Загрузка Trigonum Trader Intelligence…</div>

  const sorted = [...selectedRows].sort((a, b) => b.pnl - a.pnl)
  const worst = selectedRows.length ? selectedRows.reduce((a, b) => a.pnl < b.pnl ? a : b) : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <div className="kicker">TRIGONUM · TRADER INTELLIGENCE</div>
            <h1>Динамика трейдеров</h1>
            <p>{period.label} 2026 · Futures + Invest Ideas</p>
          </div>
        </div>
        <div className="controls">
          <label>Период
            <select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)}>
              {data.periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label>Трейдер
            <select value={trader} onChange={(e) => setTrader(e.target.value)}>
              <option value="all">Все трейдеры</option>
              {data.traders.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main>
        <nav className="tabs">
          {(['overview','futures','invest'] as Page[]).map((key, i) => (
            <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}>
              0{i + 1} · {key === 'overview' ? 'Сводка' : key === 'futures' ? 'Фьючерсы' : 'Инвестпредложения'}
            </button>
          ))}
        </nav>

        {page === 'overview' && <>
          <section className="grid metrics">
            <Metric label="Общий PNL" value={fmtMoney(totalPnl)} tone={toneClass(totalPnl)} note={period.label} />
            <Metric label="Общий ROI" value={fmtPct(totalRoi)} tone={toneClass(totalRoi)} note={`База ${fmtMoney(totalBase, 0).replace('+','')}`} />
            <Metric label="Futures PNL" value={fmtMoney(futuresPnl)} tone={toneClass(futuresPnl)} note={`ROI ${fmtPct(futuresRoi)}`} />
            <Metric label="Invest Ideas PNL" value={trader === 'all' ? fmtMoney(invest.realized) : 'Командный показатель'} tone={trader === 'all' ? toneClass(invest.realized) : ''} />
          </section>
          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">PERFORMANCE BRIDGE</span><h2>Источники результата</h2></div><span className="pill">{fmtMoney(totalPnl)}</span></div>
            <div className="bridge">
              <Bar label="Фьючерсы" value={futuresPnl} max={Math.max(Math.abs(futuresPnl), Math.abs(investPnl), 1)} />
              <Bar label="Инвестидеи" value={investPnl} max={Math.max(Math.abs(futuresPnl), Math.abs(investPnl), 1)} />
            </div>
          </section>
          {trader !== 'all' && <TraderCard row={selectedRows[0]} team={data.investTeams[trader]} />}
        </>}

        {page === 'futures' && <>
          <section className="grid metrics">
            <Metric label="Team PNL" value={fmtMoney(futuresPnl)} tone={toneClass(futuresPnl)} />
            <Metric label="Team ROI" value={fmtPct(futuresRoi)} tone={toneClass(futuresRoi)} />
            <Metric label="Profitable traders" value={`${positive} из ${selectedRows.length}`} />
            <Metric label="Worst result" value={worst ? fmtMoney(worst.pnl) : '—'} tone={worst ? toneClass(worst.pnl) : ''} note={worst?.name} />
          </section>

          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">INSTITUTIONAL LEADERBOARD</span><h2>Рейтинг трейдеров</h2></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Трейдер</th><th>PNL общий</th><th>ROI</th><th>Bybit</th><th>MEXC</th><th>LMAX</th><th>Спот</th></tr></thead>
                <tbody>{sorted.map((r, i) => <tr key={r.name}><td><b className="rank">{String(i+1).padStart(2,'0')}</b> {r.name}</td><td className={toneClass(r.pnl)}>{fmtMoney(r.pnl)}</td><td className={toneClass(r.roi)}>{fmtPct(r.roi)}</td><td>{fmtMoney(r.bybit)}</td><td>{fmtMoney(r.mexc)}</td><td>{fmtMoney(r.lmax)}</td><td>{fmtMoney(r.spot)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">MONTHLY / PERIOD SNAPSHOTS</span><h2>Динамика по трейдерам</h2></div></div>
            <div className="cards">{data.traders.map((name) => {
              const r = rows.find((x) => x.name === name)
              return r ? <button className="trader-btn" key={name} onClick={() => setTrader(name)}><span>{name}</span><strong className={toneClass(r.pnl)}>{fmtMoney(r.pnl)}</strong></button> : null
            })}</div>
            {trader !== 'all' && selectedRows[0] && <TraderCard row={selectedRows[0]} team={data.investTeams[trader]} />}
          </section>
        </>}

        {page === 'invest' && <>
          <section className="grid metrics five">
            <Metric label="Команды" value="3" note="по 2 трейдера" />
            <Metric label="Идей всего" value="7" note="5 в работе · 2 закрыто" />
            <Metric label="Realized PNL" value="+$9 912" tone="pos" />
            <Metric label="Realized ROI" value="+13,2%" tone="pos" />
            <Metric label="Активная аллокация" value="$125K" />
          </section>
          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">TEAMS & ALLOCATION</span><h2>Команды и результаты</h2></div></div>
            <div className="table-wrap">
              <table><thead><tr><th>Команда</th><th>Аллокация</th><th>В работе</th><th>Закрыто</th><th>PNL</th><th>ROI</th></tr></thead>
              <tbody>{['Никита','Родион','Лиза'].map((name) => {
                const t = data.investTeams[name]
                return <tr key={name}><td>{t.team}</td><td>{fmtMoney(t.allocation,0).replace('+','')}</td><td>{t.open}</td><td>{t.closed}</td><td className={toneClass(t.pnl)}>{fmtMoney(t.pnl)}</td><td className={toneClass(t.roi)}>{fmtPct(t.roi)}</td></tr>
              })}</tbody></table>
            </div>
          </section>
          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">PORTFOLIO STATUS</span><h2>Инвестидеи</h2></div></div>
            <div className="ideas">{Object.values(data.investTeams).filter((t, i, a) => a.findIndex(x => x.team === t.team) === i).flatMap((t) => t.ideas).map((idea) => <div className="idea" key={idea.name}><b>{idea.name}</b><span className={idea.status === 'closed' ? 'cyan' : 'pos'}>{idea.status === 'closed' ? 'Закрыта' : 'В работе'}</span><small>{idea.detail}</small></div>)}</div>
          </section>
        </>}
      </main>

      <footer>Данные обновлены: {new Date(data.updatedAt).toLocaleDateString('ru-RU')}</footer>
    </div>
  )
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(2, Math.abs(value) / max * 100)
  return <div className="bar-row"><span>{label}</span><div className="bar-track"><i style={{ width: `${width}%` }} /></div><strong className={toneClass(value)}>{fmtMoney(value)}</strong></div>
}

function TraderCard({ row, team }: { row?: TraderRow; team?: DashboardData['investTeams'][string] }) {
  if (!row) return null
  return <div className="trader-card">
    <div><span>Трейдер</span><strong>{row.name}</strong></div>
    <div><span>PNL</span><strong className={toneClass(row.pnl)}>{fmtMoney(row.pnl)}</strong></div>
    <div><span>ROI</span><strong className={toneClass(row.roi)}>{fmtPct(row.roi)}</strong></div>
    <div><span>Капитал</span><strong>{fmtMoney(row.capitalAfter)}</strong></div>
    {team && <div><span>Invest team</span><strong>{team.team}</strong></div>}
  </div>
}

export default App
