import { useEffect, useMemo, useState } from 'react'
import LineChart, { type ChartSeries } from './components/LineChart'
import type { DashboardData } from './types'
import { fmtMoney, fmtPct, intervalValue, statusFor, toneClass } from './utils'
import './styles.css'

type Page = 'overview' | 'futures'

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
  const [page, setPage] = useState<Page>('overview')
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
  const totalPnl = futuresPnl
  const totalBase = futuresAllocation
  const totalRoi = futuresRoi
  const positive = selectedRows.filter((r) => r.pnl > 0).length

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
            <select value={trader} onChange={(e) => { setTrader(e.target.value); if (e.target.value !== 'all') setDetailTrader(e.target.value) }}>
              <option value="all">Все трейдеры</option>
              {data.traders.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <button className="logout-btn" onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <main>
        <nav className="tabs">
          {(['overview','futures'] as Page[]).map((key, i) => (
            <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}>
              0{i + 1} · {key === 'overview' ? 'Сводка' : 'Фьючерсы'}
            </button>
          ))}
        </nav>

        {page === 'overview' && <>
          <section className="grid metrics">
            <Metric label="Общий PNL" value={fmtMoney(totalPnl)} tone={toneClass(totalPnl)} note={period.label} />
            <Metric label="Общий ROI" value={fmtPct(totalRoi)} tone={toneClass(totalRoi)} note={`База ${fmtMoney(totalBase, 0).replace('+','')}`} />
            <Metric label="Futures Allocation" value={fmtMoney(futuresAllocation, 0).replace('+','')} note="Капитал фьючерсной стратегии" />
            <Metric label="Profitable traders" value={`${positive} из ${selectedRows.length}`} note="Положительный PNL" />
          </section>

          <section className="panel hero-panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">FUTURES PERFORMANCE</span>
                <h2>Результат фьючерсной торговли</h2>
                <p>Сводка по фьючерсным стратегиям выбранного периода без учета инвестпредложений.</p>
              </div>
              <span className={`pill ${totalPnl > 0 ? 'good' : totalPnl < 0 ? 'bad' : 'warn'}`}>Net result {fmtMoney(totalPnl)}</span>
            </div>
            <div className="overview-two-col">
              <div className="bridge">
                <Bar label="Фьючерсы" value={futuresPnl} max={Math.max(Math.abs(futuresPnl), 1)} />
              </div>
              <div>
                <span className="eyebrow">CAPITAL ALLOCATION</span>
                <AllocationRow label="Фьючерсы" value={futuresAllocation} total={Math.max(futuresAllocation, 1)} />
                <div className="method-note">ROI рассчитывается только по фьючерсной торговле: Futures PNL / Futures Allocation.</div>
              </div>
            </div>
          </section>

          <div className="insight-banner"><strong>Ключевой итог · {period.label}:</strong> Futures PNL {fmtMoney(futuresPnl)} при ROI {fmtPct(futuresRoi)}.</div>
        </>}

        {page === 'futures' && <>
          <section className="grid metrics">
            <Metric label="Team PNL" value={fmtMoney(futuresPnl)} tone={toneClass(futuresPnl)} note={period.label} />
            <Metric label="Team ROI" value={fmtPct(futuresRoi)} tone={toneClass(futuresRoi)} note="PNL / Futures allocation" />
            <Metric label="Profitable traders" value={`${positive} из ${selectedRows.length}`} note="Стабильность команды" />
            <Metric label="Worst result" value={worst ? fmtMoney(worst.pnl) : '—'} tone={worst ? toneClass(worst.pnl) : ''} note={worst?.name} />
          </section>

          <section className="panel hero-panel">
            <div className="section-head"><div><span className="eyebrow">WEEKLY INTELLIGENCE</span><h2>Недельная динамика</h2><p>Дельты между накопительными отчетами, чтобы отделить движение недели от накопленного результата на дату.</p></div><span className="pill warn">7 июля: доливы уже отражены после этой даты</span></div>
            <div className="two-col">
              <LineChart title="Team performance" yLabel="PNL, $" series={teamSeries} />
              <div className="period-panel">
                <div className="panel-title"><span>Period moves</span><span>PNL</span></div>
                <div className="table-wrap compact-table"><table><thead><tr><th>Интервал</th><th>PNL</th><th>Контекст</th></tr></thead><tbody>
                  {data.intervals.map((item) => {
                    const value = intervalValue(data, item)
                    return <tr key={item.label}><td>{item.label}</td><td className={toneClass(value)}>{fmtMoney(value)}</td><td><span className={`status-badge ${value > 0 ? 'good' : value < 0 ? 'bad' : 'warn'}`}>{value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}</span> {item.note}</td></tr>
                  })}
                </tbody></table></div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">INSTITUTIONAL LEADERBOARD</span><h2>Рейтинг трейдеров</h2><p>Выбранный срез с общим PNL, ROI и разложением по Bybit / MEXC / LMAX / Spot.</p></div></div>
            <div className="table-wrap"><table className="ranking-table"><thead><tr><th>Трейдер</th><th>PNL общий</th><th>ROI</th><th>Bybit</th><th>MEXC</th><th>LMAX</th><th>Спот</th><th>Статус</th></tr></thead><tbody>
              {sorted.map((r, i) => { const [status, tone] = statusFor(r.pnl); return <tr key={r.name}><td><b className="rank">{String(i+1).padStart(2,'0')}</b> {r.name}</td><td className={toneClass(r.pnl)}><strong>{fmtMoney(r.pnl)}</strong></td><td className={toneClass(r.roi)}>{fmtPct(r.roi)}</td><td className={toneClass(r.bybit)}>{fmtMoney(r.bybit)}</td><td className={toneClass(r.mexc)}>{fmtMoney(r.mexc)}</td><td className={toneClass(r.lmax)}>{fmtMoney(r.lmax)}</td><td>{fmtMoney(r.spot)}</td><td><span className={`status-badge ${tone}`}>{status}</span></td></tr> })}
            </tbody></table></div>
          </section>

          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">TRADER TERMINAL</span><h2>Карточка трейдера</h2><p>Недельная динамика фьючерсной торговли и капитала выбранного трейдера.</p></div></div>
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

          <section className="panel">
            <div className="section-head"><div><span className="eyebrow">SYSTEM NOTES / DATA QUALITY</span><h2>События и качество данных</h2><p>Ограничения источников, которые нужно учитывать в управленческих выводах.</p></div></div>
            <div className="note-grid">{data.dataQualityNotes.map((note) => <div className="note" key={note.title}><strong>{note.title}</strong>{note.text}</div>)}</div>
          </section>
        </>}

      </main>

      <footer>Данные обновлены: {new Date(data.updatedAt).toLocaleDateString('ru-RU')}</footer>
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

function AllocationRow({ label, value, total }: { label: string; value: number; total: number }) {
  return <div className="allocation-row"><span>{label}</span><div className="allocation-bar"><i style={{ width: `${total ? value / total * 100 : 0}%` }} /></div><strong>{fmtMoney(value,0).replace('+','')}</strong></div>
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(2, Math.abs(value) / max * 100)
  return <div className="bar-row"><span>{label}</span><div className="bar-track"><i style={{ width: `${width}%` }} /></div><strong className={toneClass(value)}>{fmtMoney(value)}</strong></div>
}

export default App
