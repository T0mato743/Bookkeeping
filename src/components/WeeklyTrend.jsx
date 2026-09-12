import { useMemo } from 'react'
import { weeklyExpense, weeklyInsights, fmtMoney } from '../utils'

// 趋势周报：最近 8 周支出柱状图 + 简要结论
export default function WeeklyTrend({ transactions }) {
  const { weekly, lines, max } = useMemo(() => {
    const weekly = weeklyExpense(transactions, 8)
    const lines = weeklyInsights(weekly)
    const max = Math.max(...weekly.map((w) => w.expense), 1)
    return { weekly, lines, max }
  }, [transactions])

  const W = 560
  const H = 200
  const PAD = { l: 44, r: 10, t: 14, b: 26 }
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const slot = iw / weekly.length
  const barW = Math.min(slot * 0.55, 34)

  return (
    <section className="card c-weekly">
      <div className="card-head">
        <h2>趋势周报</h2>
        <span className="card-tag">最近 8 周</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="最近八周支出柱状图">
        {[0, 0.5, 1].map((k) => {
          const y = PAD.t + ih - k * ih
          return (
            <g key={k}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e6e9ee" />
              <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                {fmtMoney(max * k, 0)}
              </text>
            </g>
          )
        })}
        {weekly.map((w, i) => {
          const h = (w.expense / max) * ih
          const x = PAD.l + i * slot + (slot - barW) / 2
          const y = PAD.t + ih - h
          const isCur = i === weekly.length - 1
          return (
            <g key={w.start}>
              <rect
                x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4"
                fill={isCur ? '#0f766e' : '#99c9c4'}
              >
                <title>{w.label} 那周: {fmtMoney(w.expense, 0)}</title>
              </rect>
              {(i % 2 === 0 || isCur) && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={isCur ? '#0f766e' : '#9ca3af'}>
                  {w.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <ul className="trend-lines">
        {lines.map((l) => <li key={l}><i className="ri-arrow-right-s-line tl-ic" />{l}</li>)}
      </ul>
    </section>
  )
}
