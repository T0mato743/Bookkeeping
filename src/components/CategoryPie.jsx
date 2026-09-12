import { useMemo } from 'react'
import { currentMonth, categoryBreakdown, fmtMoney } from '../utils'

// 本月支出分类饼图（原生 SVG 环形图）
export default function CategoryPie({ transactions, month = 'all' }) {
  const data = useMemo(() => categoryBreakdown(transactions, month), [transactions, month])
  const total = data.reduce((s, d) => s + d.total, 0)

  // 环形图几何参数
  const R = 62
  const C = 2 * Math.PI * R

  return (
    <section className="card c-pie">
      <div className="card-head">
        <h2>分类占比</h2>
        <span className="card-tag">{month === 'all' ? '全部月份' : month}</span>
      </div>
      {data.length === 0 ? (
        <div className="empty">这个月还没有支出记录</div>
      ) : (
        <div className="pie-wrap">
          <svg viewBox="0 0 160 160" className="pie-svg" role="img" aria-label="支出分类占比">
            <circle cx="80" cy="80" r={R} fill="none" stroke="#eef0f4" strokeWidth="22" />
            {(() => {
              let offset = 0
              return data.map((d) => {
                const len = (d.pct / 100) * C
                const el = (
                  <circle
                    key={d.category}
                    cx="80" cy="80" r={R}
                    fill="none"
                    stroke={d.color}
                    strokeWidth="22"
                    strokeDasharray={`${Math.max(len - 1, 0)} ${C - Math.max(len - 1, 0)}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 80 80)"
                  >
                    <title>{d.category}: {fmtMoney(d.total, 0)}（{d.pct.toFixed(1)}%）</title>
                  </circle>
                )
                offset += len
                return el
              })
            })()}
            <text x="80" y="76" textAnchor="middle" fontSize="11" fill="#7b8794">本月支出</text>
            <text x="80" y="94" textAnchor="middle" fontSize="15" fontWeight="700" fill="#16232e">
              {fmtMoney(total, 0)}
            </text>
          </svg>
          <ul className="pie-legend">
            {data.slice(0, 8).map((d) => (
              <li key={d.category}>
                <span className="dot" style={{ background: d.color }} />
                <span className="pl-name">{d.category}</span>
                <span className="pl-val">{fmtMoney(d.total, 0)}</span>
                <span className="pl-pct">{d.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
