// 回归测试：npm test（vitest）
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  computeRealHourly, monthSummary, totalBalance, avgMonthlyExpense,
  monthlyCumulative, fmtMoney, FIXED_CATEGORIES,
} from '../src/utils.js'

const BASE = {
  net_monthly: 10000, pay_months: 13, monthly_cost: 1500, work_days: 21.75,
  onsite_hours: 9, commute_min: 60, overtime_hours: 2,
  freedom_target: 500000, safety_target: 60000,
}

test('真实时薪：基准数字输入', () => {
  const c = computeRealHourly(BASE)
  assert.equal(c.annualIncome, 130000)
  assert.equal(c.annualCost, 18000)
  // 每日 = 9 + 2 + 2 = 13h
  assert.ok(Math.abs(c.dailyHours - 13) < 1e-9)
  assert.ok(Math.abs(c.annualHours - 13 * 21.75 * 12) < 1e-9)
  assert.ok(Math.abs(c.rate - (130000 - 18000) / (13 * 21.75 * 12)) < 1e-9)
})

test('真实时薪：回归——字符串输入不得触发拼接（2026-09 白屏 bug）', () => {
  const c = computeRealHourly({
    ...BASE,
    net_monthly: '10000', monthly_cost: '1500',
    onsite_hours: '9.5', overtime_hours: '2', commute_min: 60,
  })
  // 字符串 "9.5" + 2 若发生拼接会得到 "9.52" → dailyHours 必须仍是 13.5
  assert.ok(Math.abs(c.dailyHours - 13.5) < 1e-9, `dailyHours=${c.dailyHours}`)
  assert.ok(Number.isFinite(c.rate) && c.rate > 0)
})

test('真实时薪：空输入/零值不崩溃', () => {
  const c = computeRealHourly({ ...BASE, onsite_hours: '', overtime_hours: '', work_days: 0 })
  assert.equal(c.rate, 0)
  assert.ok(Math.abs(c.dailyHours - 2) < 1e-9) // 仅剩通勤 2h
})

test('情景模拟 overrides 生效', () => {
  const base = computeRealHourly(BASE)
  const sim = computeRealHourly(BASE, { overtime_hours: 0, commute_min: 0 })
  assert.ok(sim.rate > base.rate)
})

test('月度总结：固定/弹性分类', () => {
  const tx = [
    { kind: 'income', amount: 10000, category: '工资', occurred_at: '2026-09-01' },
    { kind: 'expense', amount: 3000, category: '房租', occurred_at: '2026-09-02' },
    { kind: 'expense', amount: 500, category: '餐饮', occurred_at: '2026-09-03' },
    { kind: 'expense', amount: 999, category: '餐饮', occurred_at: '2026-08-03' }, // 上月不计
  ]
  const m = monthSummary(tx, '2026-09')
  assert.equal(m.income, 10000)
  assert.equal(m.fixed, 3000)
  assert.equal(m.flexible, 500)
  assert.equal(m.balance, 6500)
})

test('累计结余与月均支出', () => {
  const tx = [
    { kind: 'income', amount: 5000, category: '工资', occurred_at: '2026-07-01' },
    { kind: 'expense', amount: 1000, category: '餐饮', occurred_at: '2026-07-15' },
    { kind: 'expense', amount: 2000, category: '购物', occurred_at: '2026-08-10' },
  ]
  assert.equal(totalBalance(tx), 2000)
  assert.ok(Math.abs(avgMonthlyExpense(tx) - 1500) < 1e-9)
  const series = monthlyCumulative(tx)
  // 序列从 2026-07 到当前月，检查前几个月的累计值
  assert.equal(series[0].month, '2026-07')
  assert.equal(series[0].balance, 4000)
  assert.equal(series[1].balance, 2000)
})

test('monthlyCumulative 空数据返回空数组', () => {
  assert.deepEqual(monthlyCumulative([]), [])
})

test('fmtMoney 格式化', () => {
  assert.equal(fmtMoney(1234.5), '¥1,234.50')
  assert.equal(fmtMoney(0), '¥0.00')
  assert.equal(fmtMoney(undefined), '¥0.00')
})

test('固定分类清单包含预期的关键词', () => {
  for (const c of ['房租', '水电煤', '话费网费', '订阅服务', '保险']) {
    assert.ok(FIXED_CATEGORIES.includes(c))
  }
})
