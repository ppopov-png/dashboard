import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'

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
const BASE_TIME = 1767225600
const DAY = 86400

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

function shortLabel(label: string) {
  return label
    .replace('сентября', 'сен')
    .replace('августа', 'авг')
    .replace('июля', 'июл')
    .replace('Сентябрь', 'Сен')
    .replace('Август', 'Авг')
    .replace('Июль', 'Июл')
    .slice(0, 9)
}

export default function LineChart({ title, yLabel, series, height = 320, footer }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<{ label: string; values: Array<{ name: string; value: number; color: string }> } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || series.length === 0) return

    const labelByTime = new Map<number, string>()
    const maxPoints = Math.max(...series.map((item) => item.points.length), 0)

    for (let index = 0; index < maxPoints; index += 1) {
      const label = series.find((item) => item.points[index])?.points[index]?.label ?? ''
      labelByTime.set(BASE_TIME + index * DAY, label)
    }

    const chart = createChart(container, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71829a',
        fontFamily: 'Inter, Manrope, Segoe UI, Arial, sans-serif',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(83, 220, 255, 0.055)' },
        horzLines: { color: 'rgba(83, 220, 255, 0.075)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(0, 217, 255, 0.42)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0b1a35',
        },
        horzLine: {
          color: 'rgba(255,255,255,0.18)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0b1a35',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(83, 220, 255, 0.12)',
        scaleMargins: { top: 0.14, bottom: 0.14 },
      },
      timeScale: {
        borderColor: 'rgba(83, 220, 255, 0.12)',
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 0.5,
        barSpacing: 58,
        minBarSpacing: 22,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: (time: Time) => {
          const key = typeof time === 'number' ? time : 0
          return shortLabel(labelByTime.get(key) ?? '')
        },
      },
      localization: {
        locale: 'ru-RU',
        priceFormatter: (price: number) => compact(price),
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const created = series.map((item, index) => {
      const color = palette[index % palette.length]
      const api = chart.addSeries(LineSeries, {
        color,
        lineWidth: index === 0 ? 3 : 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#07101e',
        crosshairMarkerBackgroundColor: color,
        lastValueVisible: true,
        priceLineVisible: false,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: money,
        },
      })

      api.setData(item.points.map((point, pointIndex) => ({
        time: (BASE_TIME + pointIndex * DAY) as UTCTimestamp,
        value: point.value,
      })))

      return { api, name: item.name, color }
    })

    chart.timeScale().fitContent()

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setHover(null)
        return
      }

      const key = typeof param.time === 'number' ? param.time : 0
      const label = labelByTime.get(key)
      if (!label) {
        setHover(null)
        return
      }

      const values = created.flatMap(({ api, name, color }) => {
        const item = param.seriesData.get(api)
        if (!item || !('value' in item)) return []
        return [{ name, value: item.value, color }]
      })

      setHover({ label, values })
    })

    return () => {
      chart.remove()
    }
  }, [height, series])

  return (
    <div className="chart-shell">
      <div className="chart-header">
        <div>
          <div className="chart-title-text">{title}</div>
          <div className="chart-axis-caption">{yLabel}</div>
        </div>
        <div className="chart-hint">Колесо — масштаб · drag — перемещение</div>
      </div>

      <div className="lwc-wrap">
        <div ref={containerRef} className="lwc-chart" style={{ height }} />
        {hover && (
          <div className="chart-tooltip">
            <strong>{hover.label}</strong>
            {hover.values.map((item) => (
              <span key={item.name}>
                <i style={{ background: item.color }} />
                <b>{item.name}</b>
                <em>{money(item.value)}</em>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="chart-legend">
        {series.map((item, index) => (
          <span key={item.name}>
            <i style={{ background: palette[index % palette.length] }} />
            {item.name}
          </span>
        ))}
      </div>

      {footer && <div className="chart-footer">{footer}</div>}
      <div className="chart-attribution">
        Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a>
      </div>
    </div>
  )
}
