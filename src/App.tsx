import { useEffect, useMemo, useState } from 'react'
import LineChart, { type ChartSeries } from './components/LineChart'
import type { DashboardData } from './types'
import { fmtMoney, fmtPct, intervalValue, statusFor, toneClass } from './utils'
import './styles.css'
import teamBg from './assets/trigonum-team-bg.svg'
import trigonumLogo from './assets/trigonum-logo.svg'
import trigonumMark from './assets/trigonum-mark.svg'


const AUTH_USERNAME = 'admin'
const AUTH_PASSWORD_SHA256 = '221da04596b5df0c1ace6ea9264197315862ddc512ababbaacd06147bf435fed'
const AUTH_SESSION_KEY = 'trigonum-dashboard-auth'

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function Metric({ label, value, note, tone = '', icon = '◈', accent = 'cyan' }: { label: string; value: string; note?: string; tone?: string; icon?: string; accent?: 'lime' | 'cyan' | 'purple' | 'violet' }) {
  return (
    <div className={`metric-card metric-card--${accent}`}>
      <div className="metric-card-top">
        <span>{label}</span>
        <i className="metric-icon">{icon}</i>
      </div>
      <strong className={tone}>{value}</strong>
      {note && <small>{note}</small>}
      <div className="metric-signal" aria-hidden="true"><b /><b /><b /><b /><b /><b /></div>
    </div>
  )
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
    <div className="app reference-dashboard">
      <main className="reference-main">
        <section
          id="overview"
          className="reference-hero"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(1,3,8,.97) 0%, rgba(1,3,8,.86) 33%, rgba(1,3,8,.28) 68%, rgba(1,3,8,.12) 100%), url(${teamBg})` }}
        >
          <div className="reference-nav">
            <div className="reference-logo">
              <img src={trigonumLogo} alt="TRIGONUM" />
            </div>

            <nav className="reference-nav-pills" aria-label="Навигация по дашборду">
              <a className="active" href="#overview">⌂ <span>Дашборд</span></a>
              <a href="#leaderboard">◉ <span>Трейдеры</span></a>
              <a href="#dynamics">⌁ <span>Аналитика</span></a>
              <a href="#trader">◇ <span>Карточка трейдера</span></a>
              <a href="#quality">⚙ <span>Качество данных</span></a>
            </nav>

            <div className="reference-nav-controls">
              <label className="reference-select">
                <span>Период</span>
                <select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)}>
                  {data.periods.map((p) => <option key={p.key} value={p.key}>{p.label} 2026</option>)}
                </select>
              </label>
              <button className="reference-logout" onClick={handleLogout}>Выйти</button>
            </div>
          </div>

          <div className="reference-hero-copy">
            <div className="reference-hero-kicker">КОМАНДНЫЙ ДАШБОРД · TRIGONUM</div>
            <h1>БОЛЬШЕ<br />ЧЕМ <span>ТОРГОВЛЯ</span></h1>
            <p>Командная аналитика. Контроль.<br />Реальные результаты.</p>
          </div>

          <img className="reference-hero-mark" src={trigonumMark} alt="" aria-hidden="true" />
          <div className="reference-hero-words" aria-hidden="true">
            <span>ЛЮДИ</span>
            <span>СТРАТЕГИИ</span>
            <span>КАПИТАЛ</span>
            <span>РОСТ</span>
          </div>
        </section>

        <section className="grid metrics premium-metrics reference-metrics">
          <Metric label="Командный PNL" value={fmtMoney(futuresPnl)} tone={toneClass(futuresPnl)} note="Фактический результат команды" icon="↗" accent="lime" />
          <Metric label="ROI" value={fmtPct(futuresRoi)} tone={toneClass(futuresRoi)} note="Доходность команды за период" icon="◎" accent="cyan" />
          <Metric label="Открыто сделок" value={hasOpenTradesTotal ? String(openTradesTotal) : '—'} note="Текущих активных сделок" icon="⇄" accent="purple" />
          <Metric label="Открыто инвестпредложений" value={openInvestIdeasTotal == null ? '—' : String(openInvestIdeasTotal)} note="Активных предложений для инвесторов" icon="▣" accent="violet" />
        </section>

        <section id="dynamics" className="reference-analytics-grid">
          <div className="reference-chart-panel">
            <div className="reference-panel-head">
              <div className="reference-panel-title">
                <span className="reference-panel-icon">▥</span>
                <div>
                  <h2>Динамика команды</h2>
                  <p>Фактический командный PNL по отчетным срезам</p>
                </div>
              </div>
              <div className="reference-range">
                <span>7Д</span>
                <span className="active">30Д</span>
                <span>90Д</span>
                <span>Все</span>
              </div>
            </div>
            <LineChart title="Командный PNL" yLabel="PNL, $" series={teamSeries} height={330} />
            <div className="reference-chart-summary">
              <div><strong className={toneClass(futuresPnl)}>{fmtMoney(futuresPnl)}</strong><span>Командный PNL</span></div>
              <div><strong className={toneClass(futuresRoi)}>{fmtPct(futuresRoi)}</strong><span>ROI команды</span></div>
              <div><strong>{hasOpenTradesTotal ? openTradesTotal : '—'}</strong><span>Открытых сделок</span></div>
            </div>
          </div>

          <div className="reference-leaderboard">
            <div className="reference-panel-head compact">
              <div className="reference-panel-title">
                <span className="reference-panel-icon trophy">♛</span>
                <div>
                  <h2>Рейтинг трейдеров</h2>
                  <p>с начала октября</p>
                </div>
              </div>
            </div>
            <div className="reference-leaderboard-columns">
              <span>Трейдер</span><span>PNL</span><span>ROI</span>
            </div>
            <div className="reference-leaderboard-list">
              {sorted.slice(0, 6).map((r, i) => (
                <div className="reference-leaderboard-row" key={r.name}>
                  <div className="reference-rank">{i + 1}</div>
                  <div className="reference-trader">
                    <span className="reference-avatar">{r.name.slice(0, 1)}</span>
                    <strong>{r.name}</strong>
                  </div>
                  <div className={toneClass(r.pnl)}>{fmtMoney(r.pnl)}</div>
                  <div className={toneClass(r.roi)}>{fmtPct(r.roi)}</div>
                  <div className="reference-progress"><i style={{ width: `${Math.max(6, Math.min(100, Math.abs(r.roi) * 2.2))}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="leaderboard" className="reference-detail-panel">
          <div className="reference-detail-head">
            <div className="reference-panel-title">
              <span className="reference-panel-icon">♟</span>
              <div>
                <h2>Детализация по трейдерам</h2>
                <p>PNL, ROI и результат по биржам</p>
              </div>
            </div>
            <div className="reference-detail-filters">
              <label className="reference-select small">
                <span>Трейдер</span>
                <select value={trader} onChange={(e) => { setTrader(e.target.value); if (e.target.value !== 'all') setDetailTrader(e.target.value) }}>
                  <option value="all">Все трейдеры</option>
                  {data.traders.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <span className="reference-status-chip">Данные обновлены {new Date(data.updatedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>

          <div className="table-wrap reference-table-wrap">
            <table className="ranking-table reference-table">
              <thead>
                <tr>
                  <th>Трейдер</th>
                  <th>Статус</th>
                  <th>Bybit</th>
                  <th>MEXC</th>
                  <th>LMAX</th>
                  <th>Общий PNL</th>
                  <th>ROI</th>
                  <th>Открытые сделки</th>
                  <th>Инвестпредложения</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const [status, tone] = statusFor(r.pnl)
                  return (
                    <tr key={r.name}>
                      <td>
                        <div className="reference-table-trader">
                          <b className="reference-rank mini">{i + 1}</b>
                          <span className="reference-avatar small">{r.name.slice(0, 1)}</span>
                          <strong>{r.name}</strong>
                        </div>
                      </td>
                      <td><span className={`status-badge ${tone}`}>{status}</span></td>
                      <td className={toneClass(r.bybit)}>{fmtMoney(r.bybit)}</td>
                      <td className={toneClass(r.mexc)}>{fmtMoney(r.mexc)}</td>
                      <td className={toneClass(r.lmax)}>{fmtMoney(r.lmax)}</td>
                      <td className={toneClass(r.pnl)}><strong>{fmtMoney(r.pnl)}</strong></td>
                      <td className={toneClass(r.roi)}>{fmtPct(r.roi)}</td>
                      <td>{typeof r.openTrades === 'number' ? r.openTrades : '—'}</td>
                      <td>{trader === 'all' && openInvestIdeasTotal != null ? '—' : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="trader" className="panel trader-profile-panel reference-lower-panel">
          <div className="section-head"><div><span className="eyebrow">ПРОФИЛЬ ТРЕЙДЕРА</span><h2>Карточка трейдера</h2><p>Персональный срез результатов и динамики выбранного трейдера.</p></div><span className="profile-period">{period.label}</span></div>
          <div className="trader-premium-layout">
            <div className="trader-directory">
              <div className="trader-directory-title">Команда</div>
              {data.traders.map((name) => {
                const r = rows.find((x) => x.name === name)
                return (
                  <button key={name} className={detailTrader === name ? 'active' : ''} onClick={() => { setDetailTrader(name); setTrader(name) }}>
                    <span className="trader-avatar">{name.slice(0, 1)}</span>
                    <span className="trader-directory-name">{name}</span>
                    <strong className={r ? toneClass(r.pnl) : ''}>{r ? fmtMoney(r.pnl) : '—'}</strong>
                  </button>
                )
              })}
            </div>
            <div className="trader-profile-main">
              <div className="trader-profile-head">
                <div className="trader-profile-identity">
                  <div className="trader-profile-avatar">{detailTrader.slice(0, 1)}</div>
                  <div>
                    <span>TRIGONUM TRADER</span>
                    <h3>{detailTrader}</h3>
                    <small>Futures · {period.label} 2026</small>
                  </div>
                </div>
                <div className="profile-live"><i />ACTIVE</div>
              </div>
              {detailRow && (
                <div className="profile-kpis">
                  <div><span>PNL</span><strong className={toneClass(detailRow.pnl)}>{fmtMoney(detailRow.pnl)}</strong><small>фактический</small></div>
                  <div><span>ROI</span><strong className={toneClass(detailRow.roi)}>{fmtPct(detailRow.roi)}</strong><small>за период</small></div>
                  <div><span>Открыто сделок</span><strong>{typeof detailRow.openTrades === 'number' ? detailRow.openTrades : '—'}</strong><small>в рынке</small></div>
                  <div><span>Капитал</span><strong>{detailRow.capitalAfter == null ? '—' : fmtMoney(detailRow.capitalAfter).replace('+','')}</strong><small>после периода</small></div>
                </div>
              )}
              <LineChart title={`${detailTrader} · Динамика по площадкам`} yLabel="PNL, $" series={traderSeries} height={340} footer={(data.capitalEvents[detailTrader] ?? []).length ? <ul className="events">{data.capitalEvents[detailTrader].map((event) => <li key={`${event.date}-${event.text}`}><time>{event.date}</time><span>{event.text}</span></li>)}</ul> : null} />
            </div>
          </div>
        </section>

        <section id="quality" className="panel quality-panel reference-lower-panel">
          <div className="section-head"><div><span className="eyebrow">КАЧЕСТВО ДАННЫХ</span><h2>Контроль источников</h2><p>Ключевые ограничения и события, которые важно учитывать при интерпретации отчёта.</p></div><span className="quality-state"><i />Проверено</span></div>
          <div className="quality-grid">
            {data.dataQualityNotes.map((note, index) => (
              <div className="quality-card" key={note.title}>
                <div className="quality-card-index">{String(index + 1).padStart(2, '0')}</div>
                <div className="quality-card-content">
                  <strong>{note.title}</strong>
                  <p>{note.text}</p>
                </div>
                <span className="quality-card-mark">◇</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="reference-footer">TRIGONUM · данные обновлены {new Date(data.updatedAt).toLocaleDateString('ru-RU')}</footer>
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
