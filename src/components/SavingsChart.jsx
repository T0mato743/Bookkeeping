import { useMemo } from 'react'
import { monthlyCumulative, fmtMoney } from '../utils'

// 原生 SVG 存款曲线：每月累计结余 + 自由基金目标线 + 安全垫线
export default function SavingsChart({ transactions, settings }) {
  const W = 640
  const H = 300
  const PAD = { l: 64, r: 16, t: 24, b: 34 }

  const chart = useMemo(() => {
    const series = monthlyCumulative(transactions)
    if (!series.length) return null
    const freedom = Number(settings.freedom_target) || 0
    const safety = Number(settings.safety_target) || 0
    const maxVal = Math.max(freedom, safety, ...series.map((s) => s.balance), 1) * 1.06
    const minVal = Math.min(0, ...series.map((s) => s.balance)) * 1.1
    const span = maxVal - minVal || 1
    const iw = W - PAD.l - PAD.r
    const ih = H - PAD.t - PAD.b
    const x = (i) => PAD.l + (series.length === 1 ? iw / 2 : (i * iw) / (series.length - 1))
    const y = (v) => PAD.t + ih - ((v - minVal) / span) * ih
    const points = series.map((s, i) => `${x(i).toFixed(1)},${y(s.balance).toFixed(1)}`)
    const yTicks = [0, 1, 2, 3].map((k) => {
      const v = minVal + (span * k) / 3
      return { v, y: y(v) }
    })
    const labelStep = Math.max(1, Math.ceil(series.length / 8))
    return { series, freedom, safety, maxVal, minVal, x, y, points, yTicks, labelStep }
  }, [transactions, settings])

  return (
    <section className="card c-chart">
      <div className="card-head">
        <h2>存款曲线</h2>
        <span className="card-tag">按月累计</span>
      </div>
      {!chart ? (
        <div className="empty">记几笔账，这里会长出你的曲线 📈</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="存款曲线">
          {/* 网格与 Y 轴刻度 */}
          {chart.yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={PAD.l - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">
                {fmtMoney(t.v, 0)}
              </text>
            </g>
          ))}
          {/* 自由基金目标线 */}
          {chart.freedom > 0 && (
            <g>
              <line
                x1={PAD.l} y1={chart.y(chart.freedom)} x2={W - PAD.r} y2={chart.y(chart.freedom)}
                stroke="#d97706" strokeWidth="1.5" strokeDasharray="6 4"
              />
              <text x={W - PAD.r - 4} y={chart.y(chart.freedom) - 6} textAnchor="end" fontSize="11" fill="#d97706">
                自由基金目标 {fmtMoney(chart.freedom, 0)}
              </text>
            </g>
          )}
          {/* 安全垫线 */}
          {chart.safety > 0 && (
            <g>
              <line
                x1={PAD.l} y1={chart.y(chart.safety)} x2={W - PAD.r} y2={chart.y(chart.safety)}
                stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 4"
              />
              <text x={W - PAD.r - 4} y={chart.y(chart.safety) - 6} textAnchor="end" fontSize="11" fill="#10b981">
                安全垫 {fmtMoney(chart.safety, 0)}
              </text>
            </g>
          )}
          {/* 面积 + 折线 */}
          <polygon
            points={`${PAD.l},${chart.y(Math.max(chart.minVal, 0))} ${chart.points.join(' ')} ${chart.x(chart.series.length - 1)},${chart.y(Math.max(chart.minVal, 0))}`}
            fill="#6366f1"
            opacity="0.12"
          />
          <polyline points={chart.points.join(' ')} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {chart.series.map((s, i) => (
            <circle key={s.month} cx={chart.x(i)} cy={chart.y(s.balance)} r="3" fill="#6366f1">
              <title>{s.month}: {fmtMoney(s.balance, 0)}</title>
            </circle>
          ))}
          {/* X 轴月份标签 */}
          {chart.series.map((s, i) =>
            i % chart.labelStep === 0 || i === chart.series.length - 1 ? (
              <text key={s.month} x={chart.x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#9ca3af">
                {Number(s.month.slice(5))}月
              </text>
            ) : null,
          )}
        </svg>
      )}
    </section>
  )
}
