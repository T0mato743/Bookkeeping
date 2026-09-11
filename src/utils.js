// ---------- 分类 ----------
// 这些分类的支出算「固定支出」，其余算「弹性支出」
export const FIXED_CATEGORIES = ['房租', '水电煤', '话费网费', '订阅服务', '保险']

export const EXPENSE_CATEGORIES = [
  '餐饮', '交通', '房租', '水电煤', '话费网费', '订阅服务',
  '购物', '娱乐', '医疗', '健身', '保险', '人情', '其他',
]
export const INCOME_CATEGORIES = ['工资', '加班费', '兼职', '理财收益', '报销', '其他']

// 与 db/schema.sql 中 user_settings 的默认值保持一致
export const DEFAULT_SETTINGS = {
  net_monthly: 10000,
  pay_months: 13,
  monthly_cost: 1500,
  work_days: 21.75,
  onsite_hours: 9,
  commute_min: 60,
  overtime_hours: 2,
  freedom_target: 500000,
  safety_target: 60000,
}

// ---------- 真实时薪 ----------
// 真实时薪 =（年到手收入 − 年工作成本）÷ 年投入时间
// 年投入时间 =（在场 + 加班 + 往返通勤）× 每月工作日 × 12
export function computeRealHourly(s, overrides = {}) {
  const p = { ...s, ...overrides }
  // 表单值可能是字符串（输入框/加减按钮），全部强制转数字，避免 "9" + 2 变成字符串拼接
  const num = (v) => Number(v) || 0
  const annualIncome = num(p.net_monthly) * num(p.pay_months)
  const annualCost = num(p.monthly_cost) * 12
  const commuteHours = (num(p.commute_min) * 2) / 60
  const dailyHours = num(p.onsite_hours) + num(p.overtime_hours) + commuteHours
  const annualHours = dailyHours * num(p.work_days) * 12
  const annualNet = annualIncome - annualCost
  const rate = annualHours > 0 ? annualNet / annualHours : 0
  return { annualIncome, annualCost, commuteHours, dailyHours, annualHours, annualNet, rate }
}

// ---------- 格式化 ----------
export function fmtMoney(n, digits = 2) {
  const v = Number(n) || 0
  return (
    '¥' +
    v.toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  )
}

export function fmtHours(h) {
  const v = Number(h) || 0
  return (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' 小时'
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function currentMonth() {
  return todayStr().slice(0, 7)
}

// ---------- 统计 ----------
export function monthSummary(transactions, month) {
  let income = 0
  let fixed = 0
  let flexible = 0
  for (const t of transactions) {
    if (!t.occurred_at || t.occurred_at.slice(0, 7) !== month) continue
    const amt = Number(t.amount) || 0
    if (t.kind === 'income') income += amt
    else if (FIXED_CATEGORIES.includes(t.category)) fixed += amt
    else flexible += amt
  }
  return { income, fixed, flexible, balance: income - fixed - flexible }
}

export function totalBalance(transactions) {
  return transactions.reduce(
    (s, t) => s + (t.kind === 'income' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
    0,
  )
}

export function avgMonthlyExpense(transactions) {
  const byMonth = {}
  for (const t of transactions) {
    if (t.kind !== 'expense' || !t.occurred_at) continue
    const m = t.occurred_at.slice(0, 7)
    byMonth[m] = (byMonth[m] || 0) + (Number(t.amount) || 0)
  }
  const vals = Object.values(byMonth)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

// 按月累计结余序列：[{ month: '2026-01', balance: 1234 }, ...]
export function monthlyCumulative(transactions) {
  const byMonth = {}
  for (const t of transactions) {
    const m = (t.occurred_at || '').slice(0, 7)
    if (!m) continue
    byMonth[m] = (byMonth[m] || 0) + (t.kind === 'income' ? Number(t.amount) || 0 : -(Number(t.amount) || 0))
  }
  const months = Object.keys(byMonth).sort()
  if (!months.length) return []
  const [sy, sm] = months[0].split('-').map(Number)
  const [ey, em] = currentMonth().split('-').map(Number)
  const series = []
  let acc = 0
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    acc += byMonth[key] || 0
    series.push({ month: key, balance: acc })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    if (series.length > 240) break
  }
  return series
}
