import { useId } from 'react'
import type { DashboardData, Period } from '../types'
import { fmtMoney, fmtPct } from '../utils'

function reportDate(period: Period, updatedAt: string) {
  const match = /^(jul|aug|sep)(\d+)$/.exec(period.key)
  if (match) return Date.UTC(new Date(updatedAt).getUTCFullYear(), { jul: 6, aug: 7, sep: 8 }[match[1] as 'jul' | 'aug' | 'sep'], Number(match[2]))
  return new Date(updatedAt).getTime()
}

export default function TeamChart({ data, periodKey, range }: { data: DashboardData; periodKey: string; range: number }) {
  const id = useId().replaceAll(':', '')
  const selected = data.periods.find(p => p.key === periodKey)!
  const end = reportDate(selected, data.updatedAt)
  const periods = data.periods.filter(p => reportDate(p, data.updatedAt) <= end && (!range || reportDate(p, data.updatedAt) >= end - range * 86400000))
  const points = periods.map(p => {
    const rows = data.data[p.key] ?? []
    const pnl = rows.reduce((sum, row) => sum + row.pnl, 0)
    const capital = rows.reduce((sum, row) => sum + row.capitalStart, 0)
    return { label: p.label, pnl, roi: p.reportedTeamRoi ?? (capital ? pnl / capital * 100 : 0) }
  })
  const min = Math.min(0, ...points.map(p => p.pnl))
  const max = Math.max(1, ...points.map(p => p.pnl))
  const spread = max - min
  const y = (value: number) => 32 + (max + spread * .12 - value) / (spread * 1.24) * 146
  const roiMin = Math.min(0, ...points.map(p => p.roi))
  const roiMax = Math.max(.1, ...points.map(p => p.roi))
  const roiY = (value: number) => y(max) + (roiMax - value) / (roiMax - roiMin) * (y(min) - y(max))
  const x = (index: number) => points.length === 1 ? 414 : 83 + index * (646 / (points.length - 1))
  return <div className="team-chart">
    <div className="team-chart-legend"><span><i className="lime-dot" />PNL ($)</span><span><i className="cyan-dot" />ROI (%) · правая шкала</span><small>Отчётные срезы</small></div>
    <svg viewBox="0 0 800 218" role="img" aria-label={`PNL и ROI по ${points.length} отчётным срезам: ${points.map(p => `${p.label}: ${fmtMoney(p.pnl)}, ${fmtPct(p.roi)}`).join('; ')}`}>
      <defs>
        <linearGradient id={`${id}-bars`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#baff55" /><stop offset=".48" stopColor="#00e7f8" /><stop offset="1" stopColor="#b42fff" /></linearGradient>
        <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {[0, 1, 2, 3, 4].map(i => { const value = min + spread * i / 4; return <g key={i}><line x1="64" x2="754" y1={y(value)} y2={y(value)} stroke="#183247" strokeWidth=".7" /><text x="52" y={y(value) + 4} textAnchor="end">{Math.round(value).toLocaleString('ru-RU')}</text><text x="764" y={y(value) + 4}>{(roiMin + (roiMax - roiMin) * i / 4).toFixed(1)}%</text></g> })}
      <line x1="64" x2="754" y1={y(0)} y2={y(0)} stroke="#54748c" />
      {points.map((p, i) => <g key={p.label} tabIndex={0} className="chart-point"><title>{p.label}: PNL {fmtMoney(p.pnl)}, ROI {fmtPct(p.roi)}</title><line x1={x(i)} x2={x(i)} y1="26" y2="182" stroke="#102b3b" /><rect x={x(i) - Math.min(13, 180 / points.length)} y={Math.min(y(0), y(p.pnl))} width={Math.min(26, 360 / points.length)} height={Math.max(2, Math.abs(y(0) - y(p.pnl)))} fill={p.pnl < 0 ? '#d55aab' : `url(#${id}-bars)`} /><text x={x(i)} y="205" textAnchor="middle">{p.label.replace('1–', '').replace('1-', '').replace('июля', 'июл').replace('августа', 'авг').replace('сентября', 'сен').replace('октября', 'окт')}</text></g>)}
      <polyline points={points.map((p, i) => `${x(i)},${roiY(p.roi)}`).join(' ')} fill="none" stroke="#00dfff" strokeWidth="5" opacity=".5" filter={`url(#${id}-glow)`} />
      <polyline points={points.map((p, i) => `${x(i)},${roiY(p.roi)}`).join(' ')} fill="none" stroke="#00dfff" strokeWidth="1.8" />
      {points.map((p, i) => <circle key={p.label} cx={x(i)} cy={roiY(p.roi)} r="3" fill="#efffff" stroke="#00dfff"><title>{p.label}: ROI {fmtPct(p.roi)}</title></circle>)}
    </svg>
  </div>
}
