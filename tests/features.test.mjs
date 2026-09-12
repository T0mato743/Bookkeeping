// 新功能回归测试：筛选/周报/饼图/CSV/预算/周期下次日期/导入
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  buildMonthOptions, filterTransactions, categoryBreakdown,
  weeklyExpense, weeklyInsights, budgetState, buildCsv,
  nextOccurrenceText, normalizeImportRows, dedupeImportRows,
} from '../src/utils.js'
import Papa from 'papaparse'

const TX = [
  { kind: 'expense', amount: 50, category: '餐饮', note: '午饭', occurred_at: '2026-09-01' },
  { kind: 'expense', amount: 2000, category: '房租', note: '九月份房租', occurred_at: '2026-09-02' },
  { kind: 'expense', amount: 30, category: '交通', note: '地铁', occurred_at: '2026-08-20' },
  { kind: 'income', amount: 9000, category: '工资', note: '月薪', occurred_at: '2026-09-01' },
]

test('按月筛选', () => {
  const r = filterTransactions(TX, { month: '2026-09' })
  assert.equal(r.length, 3)
  assert.ok(r.every((t) => t.occurred_at.startsWith('2026-09')))
})

test('搜索分类和备注（大小写不敏感）', () => {
  assert.equal(filterTransactions(TX, { q: '午饭' }).length, 1)
  assert.equal(filterTransactions(TX, { q: '房' }).length, 1)
  assert.equal(filterTransactions(TX, { q: '月薪' }).length, 1)
  assert.equal(filterTransactions(TX, { q: '' }).length, 4)
})

test('组合筛选：月份+类型', () => {
  const r = filterTransactions(TX, { month: '2026-09', kind: 'expense' })
  assert.equal(r.length, 2)
})

test('月份选项包含有记录的月份且倒序', () => {
  const opts = buildMonthOptions(TX)
  assert.ok(opts.includes('2026-09'))
  assert.ok(opts.includes('2026-08'))
  const i9 = opts.indexOf('2026-09')
  const i8 = opts.indexOf('2026-08')
  assert.ok(i9 < i8)
})

test('分类饼图：仅支出、按金额倒序、百分比正确', () => {
  const d = categoryBreakdown(TX, '2026-09')
  assert.equal(d.length, 2)
  assert.equal(d[0].category, '房租')
  assert.ok(d[0].total === 2000 && d[1].total === 50)
  assert.ok(Math.abs(d[0].pct + d[1].pct - 100) < 1e-6)
})

test('周报：8 周序列，支出计入正确的周', () => {
  // 以 2026-09-12（周六）为"今天"；当前周从周一 9/7 开始
  const now = new Date(2026, 8, 12)
  const w = weeklyExpense(TX, 8, now)
  assert.equal(w.length, 8)
  assert.equal(w[w.length - 1].expense, 0) // 本周（9/7 起）无支出
  assert.equal(w[w.length - 2].expense, 2050) // 上周（8/31~9/6）含 9-01、9-02
  const total = w.reduce((s, x) => s + x.expense, 0)
  assert.equal(total, 2080)
  const lines = weeklyInsights(w)
  assert.ok(lines.length >= 2)
})

test('周报：周一起算（周一的记录在当前周）', () => {
  const now = new Date(2026, 8, 9) // 周三
  const tx = [{ kind: 'expense', amount: 10, category: '餐饮', occurred_at: '2026-09-07' }] // 周一
  const w = weeklyExpense(tx, 4, now)
  assert.equal(w[w.length - 1].expense, 10)
})

test('预算状态：关闭/正常/预警/超支', () => {
  assert.equal(budgetState(0, 100).off, true)
  assert.equal(budgetState(1000, 100).level, 'ok')
  assert.equal(budgetState(1000, 850).level, 'warn')
  assert.equal(budgetState(1000, 1200).level, 'over')
  assert.ok(Math.abs(budgetState(1000, 500).pct - 50) < 1e-9)
})

test('CSV：papaparse 生成、转义、往返解析一致', () => {
  const rows = [
    { occurred_at: '2026-09-01', kind: 'expense', amount: 12.5, category: '餐饮', note: '含,逗号"引号"' },
    { occurred_at: '2026-09-02', kind: 'income', amount: 9, category: '工资', note: '', rule_id: 'r1' },
  ]
  const csv = buildCsv(rows)
  const lines = csv.split('\r\n')
  assert.equal(lines[0], '日期,类型,分类,金额,备注,来源')
  assert.ok(lines[1].includes('"含,逗号""引号"""'))
  assert.ok(lines[2].includes('周期'))
  // 往返：解析回来的数据与原始一致
  const back = Papa.parse(csv, { header: true, skipEmptyLines: true })
  assert.equal(back.data.length, 2)
  assert.equal(back.data[0]['分类'], '餐饮')
  assert.equal(Number(back.data[0]['金额']), 12.5)
  assert.equal(back.data[1]['来源'], '周期')
})

test('导入解析：校验与规范化', () => {
  const raw = [
    { '日期': '2026-09-01', '类型': '支出', '分类': '餐饮', '金额': '12.5', '备注': '午饭' },
    { '日期': '2026/9/2', '类型': '收入', '分类': '工资', '金额': '9000', '备注': '' }, // 斜杠日期可接受
    { '日期': '2026-13-01', '类型': '支出', '分类': '餐饮', '金额': '10', '备注': '' }, // 非法日期
    { '日期': '2026-09-03', '类型': '转账', '分类': '餐饮', '金额': '10', '备注': '' }, // 非法类型
    { '日期': '2026-09-04', '类型': '支出', '分类': '餐饮', '金额': '0', '备注': '' }, // 非法金额
    { '类型': '支出', '金额': '1' }, // 缺日期
  ]
  const { valid, invalid } = normalizeImportRows(raw)
  assert.equal(valid.length, 2)
  assert.equal(invalid, 4)
  assert.equal(valid[0].occurred_at, '2026-09-01')
  assert.equal(valid[0].kind, 'expense')
  assert.equal(valid[1].occurred_at, '2026-09-02')
  assert.equal(valid[1].kind, 'income')
})

test('导入去重：与现有记录完全相同的跳过', () => {
  const existing = [
    { occurred_at: '2026-09-01', kind: 'expense', category: '餐饮', note: '午饭', amount: 12.5 },
  ]
  const rows = [
    { occurred_at: '2026-09-01', kind: 'expense', category: '餐饮', note: '午饭', amount: 12.5 }, // 重复
    { occurred_at: '2026-09-01', kind: 'expense', category: '餐饮', note: '午饭', amount: 13 }, // 金额不同
    { occurred_at: '2026-09-05', kind: 'income', category: '工资', note: '', amount: 1 }, // 新记录
  ]
  const kept = dedupeImportRows(rows, existing)
  assert.equal(kept.length, 2)
})

test('周期规则下次日期', () => {
  // 2026-09-12 是今天；规则每月 5 号，lastGenerated=09-05 → 下次 10-05
  const t = nextOccurrenceText(5, '2026-09-05')
  assert.ok(t.includes('下次 10/05'))
  // 未生成过 → 本月 5 日就是"下次"（将被立即补账）
  const t2 = nextOccurrenceText(20, null)
  assert.ok(t2.includes('09/20'))
})

test('周期规则支持 29/30/31 号（当月无该日时落到月末）', () => {
  // 9 月有 30 天，今天 9/12
  assert.ok(nextOccurrenceText(29, null).includes('09/29'))
  assert.ok(nextOccurrenceText(31, null).includes('09/30')) // 9 月没有 31 号 → 30 号
  // 2 月只到 28 号，补账函数与显示函数都用 min(日, 月长) 兜底
})
