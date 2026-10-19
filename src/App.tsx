import { useEffect, useMemo, useState } from 'react'
import LineChart, { type ChartSeries } from './components/LineChart'
import type { DashboardData } from './types'
import { fmtMoney, fmtPct, statusFor, toneClass } from './utils'
import './styles.css'
import teamBg from './assets/trigonum-studio-hero.webp'
import Metric from './components/Metric'
import PnlDistribution from './components/PnlDistribution'
import './studio.css'
import Icon from './components/Icon'
import TeamChart from './components/TeamChart'
import { BrandWordmark } from './components/Brand'


const AUTH_USERNAME = 'admin'
const AUTH_PASSWORD_SHA256 = '221da04596b5df0c1ace6ea9264197315862ddc512ababbaacd06147bf435fed'
const AUTH_SESSION_KEY = 'trigonum-dashboard-auth'

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [periodKey, setPeriodKey] = useState('')
  const [detailTrader, setDetailTrader] = useState('Никита')
  const [chartRange, setChartRange] = useState(90)
  const [tableSearch, setTableSearch] = useState('')
  const [exchangeFilter, setExchangeFilter] = useState<'all' | 'bybit' | 'mexc' | 'lmax'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'profit' | 'loss' | 'flat'>('all')
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
  const selectedRows = rows
  const period = data?.periods.find((p) => p.key === periodKey)
  const futuresPnl = selectedRows.reduce((s, r) => s + r.pnl, 0)
  const futuresAllocation = selectedRows.reduce((s, r) => s + (r.capitalStart || 0), 0)
  const futuresRoi = typeof period?.reportedTeamRoi === 'number'
    ? period.reportedTeamRoi
    : (futuresAllocation ? futuresPnl / futuresAllocation * 100 : 0)
  const openTradeRows = selectedRows.filter((r) => typeof r.openTrades === 'number')
  const rowOpenTradesTotal = openTradeRows.reduce((sum, r) => sum + (r.openTrades ?? 0), 0)
  const aggregateOpenTradesTotal = typeof period?.openTradesTotal === 'number' ? period.openTradesTotal : null
  const openTradesTotal = aggregateOpenTradesTotal ?? rowOpenTradesTotal
  const hasOpenTradesTotal = aggregateOpenTradesTotal !== null || (openTradeRows.length === selectedRows.length && selectedRows.length > 0)
  const openInvestIdeasTotal = typeof period?.openInvestIdeasTotal === 'number' ? period.openInvestIdeasTotal : null

  if (!authenticated) return <LoginScreen onLogin={handleLogin} />
  if (error) return <div className="loading">Ошибка: {error}</div>
  if (!data || !period) return <div className="loading">Загрузка Trigonum Trader Intelligence…</div>

  const rankedRows = [...selectedRows].sort((a, b) => b.pnl - a.pnl)
  const tableRows = rankedRows.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(tableSearch.trim().toLowerCase())
    const matchesExchange =
      exchangeFilter === 'all' ||
      (exchangeFilter === 'bybit' && row.bybit !== 0) ||
      (exchangeFilter === 'mexc' && row.mexc !== 0) ||
      (exchangeFilter === 'lmax' && row.lmax !== 0)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'profit' && row.pnl > 0) ||
      (statusFilter === 'loss' && row.pnl < 0) ||
      (statusFilter === 'flat' && row.pnl === 0)
    return matchesSearch && matchesExchange && matchesStatus
  })
  const detailRow = rows.find((r) => r.name === detailTrader) ?? rows[0]

  const exportCsv = () => {
    const header = ['Трейдер', 'Bybit', 'MEXC', 'LMAX', 'PNL', 'ROI', 'Открытые сделки']
    const body = tableRows.map((row) => [
      row.name,
      row.bybit,
      row.mexc,
      row.lmax,
      row.pnl,
      row.roi,
      typeof row.openTrades === 'number' ? row.openTrades : '',
    ])
    const csv = [header, ...body]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `trigonum-futures-${periodKey}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const trendPeriods = data.periods.slice(0, data.periods.findIndex(p => p.key === periodKey) + 1)
  const pnlTrend = trendPeriods.map(p => (data.data[p.key] ?? []).reduce((sum, r) => sum + r.pnl, 0))
  const roiTrend = trendPeriods.map((p, i) => {
    const capital = (data.data[p.key] ?? []).reduce((sum, r) => sum + r.capitalStart, 0)
    return p.reportedTeamRoi ?? (capital ? pnlTrend[i] / capital * 100 : 0)
  })
  const traderSeries: ChartSeries[] = detailRow ? [
    { name: 'PNL общий', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.pnl ?? 0 })) },
    { name: 'Bybit', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.bybit ?? 0 })) },
    { name: 'MEXC', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.mexc ?? 0 })) },
    { name: 'LMAX', points: data.periods.map((p) => ({ label: p.label, value: (data.data[p.key] ?? []).find((r) => r.name === detailTrader)?.lmax ?? 0 })) },
  ] : []

  return (
    <div className="app reference-dashboard studio-dashboard">
      <header className="studio-topbar">
        <a className="studio-brand" href="#overview" onClick={() => setActiveSection('overview')} aria-label="Trigonum — главная">
          <svg className="studio-symbol" viewBox="0 0 48 48" aria-hidden="true"><path d="M2 6h13l10 11H2Z" fill="#aaff36" /><path d="M25 17 36 6h10v11Z" fill="#ed23f5" /><path d="M25 17v25l-11 6V28Z" fill="#00d8e9" /></svg>
          <BrandWordmark className="reference-wordmark" />
        </a>
        <nav className="studio-topnav" aria-label="Разделы">
          <a href="#overview" className={activeSection === 'overview' ? 'active' : ''} onClick={() => setActiveSection('overview')}>Обзор</a>
          <a href="#trader" className={activeSection === 'trader' ? 'active' : ''} onClick={() => setActiveSection('trader')}>Команда</a>
          <a href="#leaderboard" className={activeSection === 'leaderboard' ? 'active' : ''} onClick={() => setActiveSection('leaderboard')}>Трейдеры</a>
          <a href="#investments" className={activeSection === 'investments' ? 'active' : ''} onClick={() => setActiveSection('investments')}>Инвестиции</a>
          <a href="#dynamics" className={activeSection === 'dynamics' ? 'active' : ''} onClick={() => setActiveSection('dynamics')}>Аналитика</a>
        </nav>
        <div className="reference-nav-controls">
          <label className="reference-select"><Icon name="calendar" />
            <select aria-label="Отчётный период" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)}>
              {data.periods.map((p) => <option key={p.key} value={p.key}>{p.label} 2026</option>)}
            </select>
          </label>
          <button className="reference-logout" onClick={handleLogout} title="Выйти" aria-label="Выйти"><Icon name="logout" /></button>
          <span className="studio-user" title="Администратор">T</span>
        </div>
      </header>
      <aside className="studio-sidebar">
        <nav aria-label="Боковая навигация">
          {([['overview', 'home', 'Главная'], ['trader', 'users', 'Команда'], ['leaderboard', 'users', 'Трейдеры'], ['investments', 'briefcase', 'Инвестиции'], ['dynamics', 'chart', 'Аналитика'], ['quality', 'layers', 'Источники']] as const).map(([anchor, icon, label]) => <a key={anchor} href={`#${anchor}`} aria-label={label} aria-current={activeSection === anchor ? 'location' : undefined} className={activeSection === anchor ? 'active' : ''} onClick={() => setActiveSection(anchor)}><Icon name={icon} /><span>{label}</span></a>)}
        </nav>
        <div className="studio-sidebar-copy">ЛЮДИ<br />СТРАТЕГИИ<br />КАПИТАЛ<br />РОСТ</div>
        <div className="studio-sidebar-art" aria-hidden="true" />
        <span className="studio-sidebar-caption">TRIGONUM<br /><b>TRADER INTELLIGENCE</b></span>
      </aside>

      <main className="reference-main">
        <section
          id="overview"
          className="reference-hero reference-hero--v2"
          style={{ backgroundImage: `linear-gradient(90deg, #030611 0%, rgba(3,6,17,.84) 25%, transparent 58%), url(${teamBg})` }}
        >
          <div className="reference-hero-copy reference-hero-copy--v2">
            <span className="studio-kicker">TRIGONUM</span>
            <h1>БОЛЬШЕ ЧЕМ<br /><span>ТОРГОВЛЯ</span></h1>
            <p>Командная аналитика. Контроль.<br />Реальные результаты.</p>
            <a className="studio-hero-action" href="#leaderboard" onClick={() => setActiveSection('leaderboard')}>Смотреть результаты <span>→</span></a>
          </div>

          <div className="reference-hero-words" aria-hidden="true">
            <span>ТЕХНОЛОГИИ.</span><span>ЛЮДИ.</span><span>КАПИТАЛ.</span><span>БОЛЬШИЕ</span><span>ВОЗМОЖНОСТИ.</span><i>⟶</i>
          </div>
        </section>

        <section className="grid metrics premium-metrics reference-metrics">
          <Metric label="Командный PNL" value={fmtMoney(futuresPnl)} tone={toneClass(futuresPnl)} note={`Общий результат команды · ${period.label}`} icon="pnl" accent="lime" badge="FUTURES" trend={pnlTrend} />
          <Metric label="ROI" value={fmtPct(futuresRoi)} tone={toneClass(futuresRoi)} note="Доходность команды за период" icon="roi" accent="cyan" badge="ОТЧЁТ" trend={roiTrend} />
          <Metric label="Открыто сделок" value={hasOpenTradesTotal ? String(openTradesTotal) : '—'} note={hasOpenTradesTotal ? 'Текущих активных сделок' : 'Нет подтверждённых данных в срезе'} icon="trade" accent="purple" badge={hasOpenTradesTotal ? 'АКТИВНО' : 'Н/Д'} />
          <Metric label="Инвестпредложения" value={openInvestIdeasTotal == null ? '—' : String(openInvestIdeasTotal)} note="Последнее подтверждённое значение" icon="briefcase" accent="violet" badge="ИДЕИ" />
        </section>

        <section id="dynamics" className="reference-analytics-grid">
          <div className="reference-chart-panel">
            <div className="reference-panel-head">
              <div className="reference-panel-title">
                <span className="reference-panel-icon"><Icon name="chart" /></span>
                <div>
                  <h2>Динамика команды</h2>
                </div>
              </div>
              <div className="reference-range">
                {[7, 30, 90, 0].map(range => <button key={range} type="button" className={chartRange === range ? 'active' : ''} aria-pressed={chartRange === range} onClick={() => setChartRange(range)}>{range ? `${range}Д` : 'Все'}</button>)}
              </div>
            </div>
            <div className="reference-chart-body">
            <TeamChart data={data} periodKey={periodKey} range={chartRange} />
            <div className="reference-chart-summary">
              <div><strong className={toneClass(futuresPnl)}>{fmtMoney(futuresPnl)}</strong><span>Командный PNL</span></div>
              <div><strong className={toneClass(futuresRoi)}>{fmtPct(futuresRoi)}</strong><span>ROI команды</span></div>
              <div><strong>{hasOpenTradesTotal ? openTradesTotal : '—'}</strong><span>Открытых сделок</span></div>
            </div>
            </div>
          </div>

          <PnlDistribution rows={rows} />
          <div className="reference-leaderboard">
            <div className="reference-panel-head compact">
              <div className="reference-panel-title">
                <span className="reference-panel-icon trophy"><Icon name="trophy" /></span>
                <div>
                  <h2>Топ трейдеров команды</h2>
                </div>
              </div>
              <a className="reference-see-all" href="#leaderboard">Смотреть всех →</a>
            </div>
            <div className="reference-leaderboard-columns">
              <span>Трейдер</span><span>PNL ($)</span><span>ROI</span><span>Сделок</span><span />
            </div>
            <div className="reference-leaderboard-list">
              {rankedRows.slice(0, 6).map((r, i) => (
                <div className="reference-leaderboard-row" key={r.name}>
                  <div className="reference-rank">{i + 1}</div>
                  <div className="reference-trader">
                    <span className="reference-avatar">{r.name.slice(0, 1)}</span>
                    <strong>{r.name} {i === 0 && r.pnl > 0 && <span className="trader-crown">♛</span>}</strong>
                  </div>
                  <div className={toneClass(r.pnl)}>{fmtMoney(r.pnl)}</div>
                  <div className={toneClass(r.roi)}>{fmtPct(r.roi)}</div>
                  <div className="reference-trades">{r.openTrades ?? '—'}</div>
                  <div className="reference-progress"><i style={{ width: `${Math.min(100, Math.abs(r.pnl) / Math.max(1, ...rankedRows.map(row => Math.abs(row.pnl))) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="leaderboard" className="reference-detail-panel">
          <div className="reference-detail-head">
            <div className="reference-panel-title">
              <span className="reference-panel-icon"><Icon name="users" /></span>
              <div>
                <h2>Детализация по трейдерам</h2>
              </div>
            </div>
            <div className="reference-detail-filters">
              <label className="reference-search">
                <Icon name="search" />
                <input aria-label="Поиск трейдера" value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Поиск трейдера..." />
              </label>
              <label className="reference-select small">

                <select aria-label="Биржа" value={exchangeFilter} onChange={(e) => setExchangeFilter(e.target.value as 'all' | 'bybit' | 'mexc' | 'lmax')}>
                  <option value="all">Все биржи</option>
                  <option value="bybit">Bybit</option>
                  <option value="mexc">MEXC</option>
                  <option value="lmax">LMAX</option>
                </select>
              </label>
              <label className="reference-select small">

                <select aria-label="Статус" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'profit' | 'loss' | 'flat')}>
                  <option value="all">Все статусы</option>
                  <option value="profit">Прибыль</option>
                  <option value="loss">Просадка</option>
                  <option value="flat">Без движения</option>
                </select>
              </label>
              <button className="reference-export" type="button" onClick={exportCsv}><Icon name="download" /> Экспорт</button>
            </div>
          </div>

          <div className="table-wrap reference-table-wrap">
            <table className="ranking-table reference-table">
              <thead>
                <tr>
                  <th>Трейдер</th>
                  <th>Статус</th>
                  <th>Bybit<small>PNL ($)</small></th>
                  <th>MEXC<small>PNL ($)</small></th>
                  <th>LMAX<small>PNL ($)</small></th>
                  <th>Общий PNL</th>
                  <th>ROI</th>
                  <th>Открытые сделки</th>
                  <th>Инвестпредложения</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => {
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
                      <td>—</td>
                      <td>
                        <button
                          className="reference-row-action"
                          type="button"
                          title="Открыть карточку трейдера"
                          onClick={() => {
                            setDetailTrader(r.name)
                            document.querySelector('#trader')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                        >
                          <Icon name="chart" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {tableRows.length === 0 && <div className="table-empty">Трейдеры не найдены. Измените поиск или фильтры.</div>}
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
                  <button key={name} className={detailTrader === name ? 'active' : ''} onClick={() => setDetailTrader(name)}>
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

        <section id="investments" className="panel reference-lower-panel investment-panel">
          <div className="section-head"><div><span className="eyebrow">INVEST IDEAS</span><h2>Инвестпредложения</h2><p>Последние данные направления · {data.investMeta.asOf}</p></div><span className="profile-period">{data.investMeta.openIdeas} открыто</span></div>
          <div className="investment-grid">{Array.from(new Map(Object.values(data.investTeams).map(team => [team.team, team])).values()).map(team => <article className="investment-card" key={team.team}><h3>{team.team}</h3><div className="investment-stats"><span>PNL <b className={toneClass(team.pnl)}>{fmtMoney(team.pnl)}</b></span><span>ROI <b className={toneClass(team.roi)}>{fmtPct(team.roi)}</b></span></div><ul>{team.ideas.map(idea => <li key={idea.name}><strong>{idea.name}</strong><span>{idea.status === 'open' ? 'Открыто' : 'Закрыто'}</span><p>{idea.detail}</p></li>)}</ul></article>)}</div>
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

      <footer className="reference-footer">
        <span>TRIGONUM · данные обновлены {new Date(data.updatedAt).toLocaleDateString('ru-RU')}</span>
        <button type="button" onClick={handleLogout}>Выйти</button>
      </footer>
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
        <BrandWordmark className="auth-brand-logo" />
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