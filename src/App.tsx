import { useEffect, useMemo, useState } from 'react'
import LineChart, { type ChartSeries } from './components/LineChart'
import type { DashboardData } from './types'
import { fmtMoney, fmtPct, intervalValue, statusFor, toneClass } from './utils'
import './styles.css'
import teamBg from './assets/trigonum-team-bg.svg'


const AUTH_USERNAME = 'admin'
const AUTH_PASSWORD_SHA256 = '221da04596b5df0c1ace6ea9264197315862ddc512ababbaacd06147bf435fed'
const AUTH_SESSION_KEY = 'trigonum-dashboard-auth'

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function Metric({ label, value, note, tone = '' }: { label: string; value: string; note?: string; tone?: string }) {
  return <div className="metric-card"><span>{label}</span><strong className={tone}>{value}</strong>{note && <small>{note}</small>}</div>
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [periodKey, setPeriodKey] = useState('')
  const [trader, setTrader] = useState('all')
  const [detailTrader, setDetailTrader] = useState('Никита')
  const [error, setError] = useState('')
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(AUTH_SESSION_KEY) === '1')

  useEffect(() => {
    if (!authenticated) return
    fetch(`${import.meta.env.BASE_URL}data/dashboard.json`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<DashboardData>
      })
      .then((payload) => {
        setData(payload)
        setPeriodKey(payload.periods.at(-1)?.key ?? '')
        setDetailTrader(payload.traders[0] ?? '')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки данных'))
  }, [authenticated])

  const handleLogin = async (username: string, password: string) => {
    const passwordHash = await sha256(password)
    if (username !== AUTH_USERNAME || passwordHash !== AUTH_PASSWORD_SHA256) return false
    sessionStorage.setItem(AUTH_SESSION_KEY, '1')
    setAuthenticated(true)
    return true
  }

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setAuthenticated(false)
    setData(null)
    setError('')
  }

  const rows = useMemo(() => data?.data[periodKey] ?? [], [data, periodKey])
  const selectedRows = trader === 'all' ? rows : rows.filter((r) => r.name === trader)
  const period = data?.periods.find((p) => p.key === periodKey)
  const futuresPnl = selectedRows.reduce((s, r) => s + r.pnl, 0)
  const futuresAllocation = selectedRows.reduce((s, r) => s + (r.capitalStart || 0), 0)
  const futuresRoi = futuresAllocation ? futuresPnl / futuresAllocation * 100 : 0
  const positive = selectedRows.filter((r) => r.pnl > 0).length
  const openTradeRows = selectedRows.filter((r) => typeof r.openTrades === 'number')
  const rowOpenTradesTotal = openTradeRows.reduce((sum, r) => sum + (r.openTrades ?? 0), 0)
  const aggregateOpenTradesTotal = trader === 'all' && typeof period?.openTradesTotal === 'number' ? period.openTradesTotal : null
  const openTradesTotal = aggregateOpenTradesTotal ?? rowOpenTradesTotal
  const hasOpenTradesTotal = aggregateOpenTradesTotal !== null || (openTradeRows.length === selectedRows.length && selectedRows.length > 0)
  const openInvestIdeasTotal = trader === 'all' && typeof period?.openInvestIdeasTotal === 'number' ? period.openInvestIdeasTotal : null

  if (!authenticated) return <LoginScreen onLogin={handleLogin} />
  if (error) return <div className="loading">Ошибка: {error}</div>
  if (!data || !period) return <div className="loading">Загрузка Trigonum Trader Intelligence…</div>

  const sorted = [...selectedRows].sort((a, b) => b.pnl - a.pnl)
  const worst = selectedRows.length ? selectedRows.reduce((a, b) => a.pnl < b.pnl ? a : b) : null
  const detailRow = rows.find((r) => r.name === detailTrader) ?? rows[0]
  const teamSeries: ChartSeries[] = [
    { name: 'PNL среза', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).reduce((sum, row) => sum + row.pnl, 0) })) },
    { name: 'Недельная дельта', points: data.intervals.map((item) => ({ label: item.label, value: intervalValue(data, item) })) },
  ]
  const traderSeries: ChartSeries[] = detailRow ? [
    { name: 'PNL общий', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.pnl ?? 0 })) },
    { name: 'Bybit', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.bybit ?? 0 })) },
    { name: 'MEXC', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.mexc ?? 0 })) },
    { name: 'LMAX', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.lmax ?? 0 })) },
  ] : []

  return (
    <div className="app">
      <div className="dashboard-shell">
        <aside className="side-nav">
          <div className="side-brand">
            <div className="side-brand-mark">T</div>
            <div>
              <strong>TRIGONUM</strong>
              <span>TEAM INTELLIGENCE</span>
            </div>
          </div>
          <nav>
            <a className="active" href="#overview"><span>◈</span>Команда</a>
            <a href="#dynamics"><span>⌁</span>Аналитика</a>
            <a href="#leaderboard"><span>▥</span>Трейдеры</a>
            <a href="#trader"><span>△</span>Карточка трейдера</a>
            <a href="#quality"><span>◇</span>Качество данных</a>
          </nav>
          <div className="side-pro">
            <span>TRIGONUM</span>
            <strong>Больше чем торговля</strong>
            <small>Аналитика. Контроль. Результат.</small>
          </div>
        </aside>
        <section className="workspace">
      <header className="topbar">
        <div className="brand">
          <div>
            <div className="kicker">TRIGONUM · КОМАНДНЫЙ ДАШБОРД</div>
            <h1>Аналитика команды</h1>
            <p>{period.label} 2026 · Futures</p>
          </div>
        </div>
        <div className="controls">
          <label>Период
            <select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)}>
              {data.periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label>Трейдер
            <select value={trader} onChange={(e) => { setTrader(e.target.value); if (e.target.value !== 'all') setDetailTrader(e.target.value) }}>
              <option value="all">Все трейдеры</option>
              {data.traders.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <button className="logout-btn" onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <main>

          <section id="overview" className="team-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(2,5,12,.97) 0%, rgba(2,5,12,.86) 36%, rgba(2,5,12,.34) 74%, rgba(2,5,12,.18) 100%), url(${teamBg})` }}>
            <div className="team-hero-copy">
              <div className="team-hero-kicker">TRIGONUM · КОМАНДНЫЙ ДАШБОРД</div>
              <h2>Больше чем <span>торговля</span></h2>
              <p>Командная аналитика. Контроль. Реальные результаты.</p>
              <div className="team-hero-meta">
                <span>Фьючерсы</span>
                <span>Инвестпредложения</span>
                <span>{period.label} 2026</span>
              </div>
            </div>
          </section>

          <section className="grid metrics">
            <Metric label="Командный PNL" value={fmtMoney(futuresPnl)} tone={toneClass(futuresPnl)} note="Фактический результат" />
            <Metric label="ROI команды" value={fmtPct(futuresRoi)} tone={toneClass(futuresRoi)} note="С начала периода" />
            <Metric label="Открыто сделок" value={hasOpenTradesTotal ? String(openTradesTotal) : '—'} note="Текущая экспозиция" />
            <Metric label="Открыто инвестпредложений" value={openInvestIdeasTotal == null ? '—' : String(openInvestIdeasTotal)} note="Активные идеи" />
          </section>

          <section id="dynamics" className="panel hero-panel">
            <div className="section-head"><div><span className="eyebrow">ДИНАМИКА КОМАНДЫ</span><h2>Недельная динамика</h2><p>Фактический результат команды по отчетным срезам.</p></div><span className="pill warn">PNL — только закрытые сделки</span></div>
            <div className="two-col dashboard-overview-grid">
              <LineChart title="Командный PNL" yLabel="PNL, $" series={teamSeries} />
              <div className="leaderboard-card">
                <div className="leaderboard-card-head"><div><span className="eyebrow">РЕЙТИНГ</span><h3>Лучшие трейдеры</h3></div><span>с начала октября</span></div>
                <div className="leaderboard-list">
                  {sorted.slice(0, 6).map((r, i) => (
                    <div className="leaderboard-row" key={r.name}>
                      <b>{i + 1}</b>
                      <span>{r.name}</span>
                      <strong className={toneClass(r.pnl)}>{fmtMoney(r.pnl)}</strong>
                      <em className={toneClass(r.roi)}>{fmtPct(r.roi)}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="leaderboard" className="panel">
            <div className="section-head"><div><span className="eyebrow">КОМАНДА</span><h2>Рейтинг трейдеров: с начала октября</h2><p>Фактический результат с начала октября: PNL, ROI, количество открытых сделок и разложение по Bybit / MEXC / LMAX / Spot.</p></div></div>
            <div className="table-wrap"><table className="ranking-table"><thead><tr><th>Трейдер</th><th>PNL общий</th><th>ROI</th><th>Открытых сделок</th><th>Bybit</th><th>MEXC</th><th>LMAX</th><th>Спот</th><th>Статус</th></tr></thead><tbody>
              {sorted.map((r, i) => { const [status, tone] = statusFor(r.pnl); return <tr key={r.name}><td><b className="rank">{String(i+1).padStart(2,'0')}</b> {r.name}</td><td className={toneClass(r.pnl)}><strong>{fmtMoney(r.pnl)}</strong></td><td className={toneClass(r.roi)}>{fmtPct(r.roi)}</td><td><span className={typeof r.openTrades === 'number' && r.openTrades > 0 ? 'open-trades-badge active' : 'open-trades-badge'}>{typeof r.openTrades === 'number' ? r.openTrades : '—'}</span></td><td className={toneClass(r.bybit)}>{fmtMoney(r.bybit)}</td><td className={toneClass(r.mexc)}>{fmtMoney(r.mexc)}</td><td className={toneClass(r.lmax)}>{fmtMoney(r.lmax)}</td><td>{fmtMoney(r.spot)}</td><td><span className={`status-badge ${tone}`}>{status}</span></td></tr> })}
            </tbody></table></div>
          </section>

          <section id="trader" className="panel">
            <div className="section-head"><div><span className="eyebrow">ПРОФИЛЬ ТРЕЙДЕРА</span><h2>Карточка трейдера</h2><p>Недельная динамика фьючерсной торговли и капитала выбранного трейдера.</p></div></div>
            <div className="trader-layout">
              <div className="trader-list">{data.traders.map((name) => {
                const r = rows.find((x) => x.name === name)
                return <button key={name} className={detailTrader === name ? 'active' : ''} onClick={() => { setDetailTrader(name); setTrader(name) }}><span>{name}</span><strong className={r ? toneClass(r.pnl) : ''}>{r ? fmtMoney(r.pnl) : '—'}</strong></button>
              })}</div>
              <div className="detail-panel">
                <div className="detail-heading"><h3>{detailTrader}</h3><span>{period.label}</span></div>
                {detailRow && <div className="detail-grid"><div className="mini"><span>PNL selected snapshot</span><strong className={toneClass(detailRow.pnl)}>{fmtMoney(detailRow.pnl)}</strong></div><div className="mini"><span>ROI selected snapshot</span><strong className={toneClass(detailRow.roi)}>{fmtPct(detailRow.roi)}</strong></div><div className="mini"><span>Capital after</span><strong>{detailRow.capitalAfter == null ? 'нет данных' : fmtMoney(detailRow.capitalAfter).replace('+','')}</strong></div></div>}
                <LineChart title={`${detailTrader} exchange breakdown`} yLabel="PNL, $" series={traderSeries} height={340} footer={(data.capitalEvents[detailTrader] ?? []).length ? <ul className="events">{data.capitalEvents[detailTrader].map((event) => <li key={`${event.date}-${event.text}`}><time>{event.date}</time><span>{event.text}</span></li>)}</ul> : null} />
              </div>
            </div>
          </section>

          <section id="quality" className="panel">
            <div className="section-head"><div><span className="eyebrow">КАЧЕСТВО ДАННЫХ</span><h2>События и качество данных</h2><p>Ограничения источников, которые нужно учитывать в управленческих выводах.</p></div></div>
            <div className="note-grid">{data.dataQualityNotes.map((note) => <div className="note" key={note.title}><strong>{note.title}</strong>{note.text}</div>)}</div>
          </section>

      </main>

      <footer>Данные обновлены: {new Date(data.updatedAt).toLocaleDateString('ru-RU')}</footer>
        </section>
      </div>
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (username: string, password: string) => Promise<boolean> }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const ok = await onLogin(username, password)
    setSubmitting(false)
    if (!ok) {
      setLoginError('Неверный логин или пароль')
      return
    }
    setLoginError('')
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">T</div>
        <div className="kicker">TRIGONUM · TRADER INTELLIGENCE</div>
        <h1>Вход в dashboard</h1>
        <p>Введите логин и пароль для доступа к отчётности трейдеров.</p>
        <label>
          Логин
          <input autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Пароль
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {loginError && <div className="auth-error">{loginError}</div>}
        <button type="submit" disabled={submitting}>{submitting ? 'Проверка…' : 'Войти'}</button>
      </form>
    </div>
  )
}

export default App
