import { currentMonth, monthSummary, fmtMoney, budgetState } from '../utils'

export default function MonthlySummary({ transactions, settings }) {
  const m = monthSummary(transactions, currentMonth())
  const [y, mo] = currentMonth().split('-')
  const budget = budgetState(settings?.budget_monthly, m.fixed + m.flexible)

  return (
    <section className="card c-summary">
      <div className="card-head">
        <h2>本月总结</h2>
        <span className="card-tag">{y} 年 {Number(mo)} 月</span>
      </div>
      <div className="sum-grid">
        <div className="sum-item">
          <span className="sum-label">收入</span>
          <span className="sum-val in">{fmtMoney(m.income, 0)}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">固定支出</span>
          <span className="sum-val out">{fmtMoney(m.fixed, 0)}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">弹性支出</span>
          <span className="sum-val out">{fmtMoney(m.flexible, 0)}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">结余</span>
          <span className={`sum-val ${m.balance >= 0 ? 'in' : 'out'}`}>{fmtMoney(m.balance, 0)}</span>
        </div>
      </div>

      {!budget.off && (
        <div className={`budget-box ${budget.level}`}>
          <div className="fund-line">
            <span>月度预算</span>
            <b>{budget.pct.toFixed(0)}%</b>
          </div>
          <div className="bar">
            <div
              className={`bar-fill budget-${budget.level}`}
              style={{ width: `${Math.min(100, budget.pct)}%` }}
            />
          </div>
          <div className="fund-sub">
            已花 {fmtMoney(m.fixed + m.flexible, 0)} / {fmtMoney(Number(settings.budget_monthly), 0)}
            {budget.level === 'over' && <span className="budget-alert"> · 已超支 {fmtMoney(-budget.remain, 0)}！</span>}
            {budget.level === 'warn' && <span className="budget-warn"> · 只剩 {fmtMoney(budget.remain, 0)}</span>}
          </div>
        </div>
      )}
    </section>
  )
}
