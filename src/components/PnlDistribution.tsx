import type { TraderRow } from '../types'
import { fmtMoney } from '../utils'

const colors = ['#9b32ff', '#00dfc1', '#008cff', '#f34ac8', '#b7ff38', '#6768ff']

export default function PnlDistribution({ rows }: { rows: TraderRow[] }) {
  const total = rows.reduce((sum, row) => sum + Math.abs(row.pnl), 0)
  const net = rows.reduce((sum, row) => sum + row.pnl, 0)
  const sorted = [...rows].filter(row => row.pnl !== 0).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
  const segments = sorted.map((row, index) => {
    const share = total ? Math.abs(row.pnl) / total * 100 : 0
    const offset = total ? sorted.slice(0, index).reduce((sum, previous) => sum + Math.abs(previous.pnl), 0) / total * 100 : 0
    return { ...row, share, offset, color: colors[index % colors.length] }
  })
  return <section className="distribution-panel" aria-labelledby="distribution-title">
    <div className="distribution-head"><h2 id="distribution-title">Вклад в PNL</h2><span>ПО ТРЕЙДЕРАМ</span></div>
    <div className="distribution-visual">
      <svg viewBox="0 0 180 180" role="img" aria-label={segments.length ? segments.map(row => `${row.name}: ${fmtMoney(row.pnl)}, ${row.share.toFixed(1)}% абсолютного PNL`).join('; ') : 'PNL равен нулю'}>
        <circle cx="90" cy="90" r="66" fill="none" stroke="#16203e" strokeWidth="21" />
        {segments.map(row => <circle key={row.name} cx="90" cy="90" r="66" pathLength="100" fill="none" stroke={row.color} strokeWidth="21" strokeDasharray={`${row.share} ${100 - row.share}`} strokeDashoffset={-row.offset} transform="rotate(-90 90 90)"><title>{row.name}: {fmtMoney(row.pnl)}</title></circle>)}
      </svg>
      <div className="distribution-total"><strong>{fmtMoney(net)}</strong><span>Чистый PNL</span></div>
    </div>
    <div className="distribution-legend">{segments.length ? segments.map(row => <div key={row.name}><i style={{ background: row.color }} /><span>{row.name}</span><b>{row.share < .1 ? '<0,1' : row.share.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%</b></div>) : <p>Нет ненулевых результатов</p>}</div>
    <p className="distribution-note">Доли рассчитаны по абсолютным значениям PNL, включая убытки.</p>
  </section>
}
