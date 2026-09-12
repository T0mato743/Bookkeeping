// ---------- 分类 ----------
// 这些分类的支出算「固定支出」，其余算「弹性支出」
export const FIXED_CATEGORIES = ['房租', '水电煤', '话费网费', '订阅服务', '保险']

export const EXPENSE_CATEGORIES = [
  '餐饮', '交通', '房租', '水电煤', '话费网费', '订阅服务',
  '购物', '娱乐', '医疗', '健身', '保险', '人情', '其他',
]
export const INCOME_CATEGORIES = ['工资', '加班费', '兼职', '理财收益', '报销', '其他']

export const CATEGORY_ICONS = {
  餐饮: '🍜', 交通: '🚇', 房租: '🏠', 水电煤: '💡', 话费网费: '📶', 订阅服务: '📺',
  购物: '🛍️', 娱乐: '🎮', 医疗: '💊', 健身: '🏋️', 保险: '🛡️', 人情: '🎁', 其他: '📦',
  工资: '💰', 加班费: '🌙', 兼职: '💼', 理财收益: '📈', 报销: '🧾',
}

export function catIcon(category) {
  return CATEGORY_ICONS[category] || '📦'
}

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

// ---------- 周期记账 ----------
// 规则的下次记账日描述
export function nextOccurrenceText(dayOfMonth, lastGenerated) {
  const today = todayStr()
  const [y, m] = today.split('-').map(Number)
  const daysInMonth = (yy, mm) => new Date(yy, mm, 0).getDate()
  const mk = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(dayOfMonth, daysInMonth(yy, mm))).padStart(2, '0')}`
  const nextMonth = (yy, mm) => (mm === 12 ? [yy + 1, 1] : [yy, mm + 1])
  let next = mk(y, m)
  if ((lastGenerated && lastGenerated >= next) || next < today) {
    const [ny, nm] = nextMonth(y, m)
    next = mk(ny, nm)
  }
  return `每月 ${dayOfMonth} 日 · 下次 ${next.slice(5).replace('-', '/')}`
}

// ---------- 搜索与按月筛选 ----------
export function buildMonthOptions(transactions) {
  const months = new Set()
  for (const t of transactions) {
    if (t.occurred_at) months.add(t.occurred_at.slice(0, 7))
  }
  months.add(currentMonth())
  return [...months].sort().reverse()
}

export function filterTransactions(transactions, { month = 'all', q = '', kind = 'all' } = {}) {
  const kw = (q || '').trim().toLowerCase()
  return transactions.filter((t) => {
    if (month !== 'all' && (t.occurred_at || '').slice(0, 7) !== month) return false
    if (kind !== 'all' && t.kind !== kind) return false
    if (kw && !(`${t.category}${t.note || ''}`.toLowerCase().includes(kw))) return false
    return true
  })
}

// ---------- 分类饼图 ----------
export const PIE_COLORS = [
  '#0f766e', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6',
  '#d946ef', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#94a3b8',
]

export function categoryBreakdown(transactions, month) {
  const byCat = {}
  let total = 0
  for (const t of transactions) {
    if (t.kind !== 'expense' || !t.occurred_at) continue
    if (month && month !== 'all' && t.occurred_at.slice(0, 7) !== month) continue
    const amt = Number(t.amount) || 0
    byCat[t.category] = (byCat[t.category] || 0) + amt
    total += amt
  }
  return Object.entries(byCat)
    .map(([category, amt], i) => ({
      category,
      total: amt,
      pct: total > 0 ? (amt / total) * 100 : 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .sort((a, b) => b.total - a.total)
}

// ---------- 趋势周报（最近 N 周，周一起算） ----------
function pad2(n) {
  return String(n).padStart(2, '0')
}

export function weeklyExpense(transactions, weeks = 8, now = new Date()) {
  const dow = (now.getDay() + 6) % 7 // 周一=0
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
  const out = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(cur)
    start.setDate(start.getDate() - 7 * i)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const s = `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}`
    const e = `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`
    let expense = 0
    let income = 0
    const byCat = {}
    for (const t of transactions) {
      if (!t.occurred_at || t.occurred_at < s || t.occurred_at > e) continue
      const amt = Number(t.amount) || 0
      if (t.kind === 'expense') {
        expense += amt
        byCat[t.category] = (byCat[t.category] || 0) + amt
      } else income += amt
    }
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
    out.push({
      start: s,
      end: e,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      expense,
      income,
      topCategory: top ? top[0] : null,
    })
  }
  return out
}

export function weeklyInsights(weekly) {
  if (!weekly.length) return []
  const lines = []
  const cur = weekly[weekly.length - 1]
  const prev = weekly[weekly.length - 2]
  lines.push(`本周（${cur.label} 起）支出 ${fmtMoney(cur.expense, 0)}`)
  if (prev) {
    if (prev.expense > 0) {
      const diff = ((cur.expense - prev.expense) / prev.expense) * 100
      lines.push(`较上周${diff >= 0 ? '多' : '少'} ${Math.abs(diff).toFixed(0)}%`)
    } else if (cur.expense > 0) {
      lines.push('上周几乎没花钱')
    }
  }
  if (cur.topCategory) lines.push(`本周花销大头：${cur.topCategory}`)
  const last4 = weekly.slice(-4).filter((w) => w.expense > 0)
  if (last4.length) {
    const avg = last4.reduce((s, w) => s + w.expense, 0) / last4.length
    lines.push(`近 4 周平均 ${fmtMoney(avg, 0)}/周`)
  }
  return lines
}

// ---------- 预算 ----------
export function budgetState(budgetMonthly, monthExpense) {
  const b = Number(budgetMonthly) || 0
  if (b <= 0) return { off: true, pct: 0, level: 'ok' }
  const pct = (monthExpense / b) * 100
  const level = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
  return { off: false, pct, level, remain: b - monthExpense }
}

// ---------- CSV 导出 ----------
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(transactions) {
  const rows = [['日期', '类型', '分类', '金额', '备注', '来源']]
  for (const t of transactions) {
    rows.push([
      t.occurred_at || '',
      t.kind === 'income' ? '收入' : '支出',
      t.category || '',
      Number(t.amount) || 0,
      t.note || '',
      t.rule_id ? '周期' : '手动',
    ])
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename, csv) {
  // \uFEFF BOM 保证 Excel 直接打开不乱码
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
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
