import { useId } from 'react'
import Icon from './Icon'

export default function Metric({ label, value, note, tone = '', icon = 'roi', accent = 'cyan', badge, trend = [] }: { label: string; value: string; note?: string; tone?: string; icon?: 'pnl' | 'roi' | 'trade' | 'briefcase'; accent?: 'lime' | 'cyan' | 'purple' | 'violet'; badge?: string; trend?: number[] }) {
  const id = useId().replaceAll(':', '')
  const min = Math.min(...trend)
  const max = Math.max(...trend)
  const points = trend.map((v, i) => `${4 + i / Math.max(1, trend.length - 1) * 126},${43 - (v - min) / (max - min || 1) * 36}`).join(' ')
  return <div className={`metric-card metric-card--${accent}`}>
    <div className="metric-card-top"><i className="metric-icon"><Icon name={icon} /></i><span>{label}</span></div>
    <div className="metric-value-row"><strong className={tone}>{value}</strong>{badge && <span className="metric-badge">{badge}</span>}</div>
    {note && <small>{note}</small>}
    {trend.length > 1 && <svg className="metric-sparkline" viewBox="0 0 134 52" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="currentColor" stopOpacity=".3" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><polygon points={`4,52 ${points} 130,52`} fill={`url(#${id})`} /><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>}
  </div>
}
