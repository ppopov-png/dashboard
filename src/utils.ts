import type { DashboardData, Interval, TraderRow } from './types'

export const fmtMoney = (value: number | null, decimals = 2) => {
  if (value === null || Number.isNaN(value)) return 'нет данных'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const abs = Math.abs(value).toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${sign}$${abs}`
}

export const fmtPct = (value: number) =>
  `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`

export const toneClass = (value: number) =>
  value > 0 ? 'pos' : value < 0 ? 'neg' : 'flat'

export const getRows = (dashboard: DashboardData, periodKey: string) =>
  dashboard.data[periodKey] ?? []

export const teamTotal = (dashboard: DashboardData, periodKey: string) =>
  getRows(dashboard, periodKey).reduce((sum, item) => sum + item.pnl, 0)

export const teamRoi = (dashboard: DashboardData, periodKey: string) => {
  const rows = getRows(dashboard, periodKey)
  const allocation = rows.reduce((sum, item) => sum + (item.capitalStart || 0), 0)
  return allocation ? (teamTotal(dashboard, periodKey) / allocation) * 100 : 0
}

export const findTrader = (
  dashboard: DashboardData,
  periodKey: string,
  name: string,
): TraderRow => {
  const rows = getRows(dashboard, periodKey)
  return rows.find((item) => item.name === name) ?? rows[0]
}

export const intervalValue = (
  dashboard: DashboardData,
  interval: Interval,
  traderName?: string,
) => {
  const to = traderName
    ? findTrader(dashboard, interval.to, traderName).pnl
    : teamTotal(dashboard, interval.to)

  if (!interval.from) return to

  const from = traderName
    ? findTrader(dashboard, interval.from, traderName).pnl
    : teamTotal(dashboard, interval.from)

  return to - from
}

export const statusFor = (value: number): [string, string] => {
  if (value > 0) return ['Прибыль', 'good']
  if (value < 0) return ['Просадка', 'bad']
  return ['Без движения', 'warn']
}
