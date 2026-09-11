import { currentMonth, monthSummary, fmtMoney } from '../utils'

export default function MonthlySummary({ transactions }) {
  const m = monthSummary(transactions, currentMonth())
  const [y, mo] = currentMonth().split('-')

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
      <p className="sum-hint">「房租 / 水电煤 / 话费网费 / 订阅服务 / 保险」算固定支出，其余算弹性支出。</p>
    </section>
  )
}
