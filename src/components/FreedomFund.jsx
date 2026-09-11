import { totalBalance, avgMonthlyExpense, fmtMoney } from '../utils'

function Bar({ value, target, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function FreedomFund({ transactions, settings }) {
  const balance = totalBalance(transactions)
  const avgExp = avgMonthlyExpense(transactions)
  const cushionMonths = avgExp > 0 ? balance / avgExp : null
  const ft = Number(settings.freedom_target) || 0
  const st = Number(settings.safety_target) || 0

  return (
    <section className="card c-fund">
      <div className="card-head">
        <h2>自由基金 & 安全垫</h2>
      </div>

      <div className="fund-block">
        <div className="fund-line">
          <span>自由基金进度</span>
          <b>{ft > 0 ? `${((balance / ft) * 100).toFixed(1)}%` : '—'}</b>
        </div>
        <Bar value={balance} target={ft} color="linear-gradient(90deg,#6366f1,#8b5cf6)" />
        <div className="fund-sub">{fmtMoney(balance, 0)} / {fmtMoney(ft, 0)}</div>
      </div>

      <div className="fund-block">
        <div className="fund-line">
          <span>安全垫（可撑 {cushionMonths == null ? '—' : cushionMonths.toFixed(1)} 个月）</span>
          <b>{st > 0 ? `${((balance / st) * 100).toFixed(1)}%` : '—'}</b>
        </div>
        <Bar value={balance} target={st} color="linear-gradient(90deg,#10b981,#34d399)" />
        <div className="fund-sub">
          {fmtMoney(balance, 0)} / {fmtMoney(st, 0)}
          {avgExp > 0 && <> · 月均支出 {fmtMoney(avgExp, 0)}</>}
        </div>
      </div>

      {balance < 0 && <p className="sum-hint">当前总结余为负，先想办法让现金流转正吧 💪</p>}
    </section>
  )
}
