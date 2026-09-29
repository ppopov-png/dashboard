import type { ReactNode } from 'react'

export interface ChartPoint {
  label: string
  value: number
}

export interface ChartSeries {
  name: string
  points: ChartPoint[]
}

interface LineChartProps {
  title: string
  yLabel: string
  series: ChartSeries[]
  height?: number
  footer?: ReactNode
}

const palette = ['#00d9ff', '#a83cff', '#9bea22', '#ff4fa3', '#66a3ff']

function compact(value: number) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`
  return `${Math.round(value)}`
}

function money(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`
}

export default function LineChart({ title, yLabel, series, height = 320, footer }: LineChartProps) {
  const width = 760
  const margin = { top: 42, right: 30, bottom: 66, left: 74 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom
  const all = series.flatMap((s) => s.points.map((p) => p.value))
  const pointCount = Math.max(1, ...series.map((s) => s.points.length))

  let min = Math.min(0, ...all)
  let max = Math.max(0, ...all)
  const spread = Math.max(max - min, 1)
  const pad = Math.max(spread * 0.14, 100)
  min -= pad
  max += pad

  const x = (index: number) => margin.left + (pointCount <= 1 ? innerW / 2 : (index / (pointCount - 1)) * innerW)
  const y = (value: number) => margin.top + ((max - value) / (max - min)) * innerH
  const ticks = [min, min + (max - min) / 2, max]
  const labels = series[0]?.points.map((p) => p.label) ?? []

  return (
    <div className="chart-shell">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text className="chart-title" x={margin.left} y={22}>{title}</text>
        <rect className="chart-frame" x={margin.left} y={margin.top} width={innerW} height={innerH} rx="8" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="chart-grid" x1={margin.left} y1={y(tick)} x2={width - margin.right} y2={y(tick)} />
            <text className="chart-label" x={margin.left - 10} y={y(tick) + 4} textAnchor="end">{compact(tick)}</text>
          </g>
        ))}
        <line className="zero-line" x1={margin.left} y1={y(0)} x2={width - margin.right} y2={y(0)} />
        {labels.map((label, index) => (
          <text key={`${label}-${index}`} className="chart-label chart-x-label" x={x(index)} y={height - 28} textAnchor="middle">{label}</text>
        ))}
        <text className="chart-label" x={20} y={margin.top + 14} transform={`rotate(-90 20 ${margin.top + 14})`}>{yLabel}</text>
        {series.map((s, sIndex) => {
          const color = palette[sIndex % palette.length]
          const d = s.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.value)}`).join(' ')
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {s.points.map((point, index) => (
                <circle key={`${s.name}-${point.label}-${index}`} cx={x(index)} cy={y(point.value)} r="4.2" fill={color} className="chart-dot">
                  <title>{`${s.name}: ${point.label}, ${money(point.value)}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
      <div className="chart-legend">
        {series.map((s, index) => <span key={s.name}><i style={{ background: palette[index % palette.length] }} />{s.name}</span>)}
      </div>
      {footer && <div className="chart-footer">{footer}</div>}
    </div>
  )
}
