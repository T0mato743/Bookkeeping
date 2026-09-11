// 小程序回归测试：模拟 wx API，验证认证流程与 Supabase 请求构造
// 运行：node --test tests/miniprogram.test.mjs
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// ---------- wx 模拟 ----------
const storage = new Map()
let lastRequest = null
let responder = null // (options) => { statusCode, data }

globalThis.wx = {
  getStorageSync: (k) => (storage.has(k) ? storage.get(k) : ''),
  setStorageSync: (k, v) => storage.set(k, v),
  removeStorageSync: (k) => storage.delete(k),
  request(options) {
    lastRequest = options
    const r = responder ? responder(options) : { statusCode: 200, data: [] }
    setTimeout(() => options.success(r), 0)
  },
}

const { computeRealHourly, monthSummary, monthlyCumulative, totalBalance } = await import('../miniprogram/utils/calc.js')
const api = await import('../miniprogram/utils/api.js')

const TOKEN = 'test-access-token'
const USER_ID = 'u-1234'

function authResponse() {
  return {
    statusCode: 200,
    data: {
      access_token: TOKEN,
      refresh_token: 'rt',
      expires_in: 3600,
      user: { id: USER_ID, email: 't@t.co' },
    },
  }
}

beforeEach(() => {
  storage.clear()
  lastRequest = null
  responder = null
})

test('小程序 calc：与网页版公式一致（字符串输入不拼接）', () => {
  const c = computeRealHourly({
    net_monthly: '10000', pay_months: 13, monthly_cost: '1500', work_days: 21.75,
    onsite_hours: '9.5', commute_min: 60, overtime_hours: '2',
  })
  assert.ok(Math.abs(c.dailyHours - 13.5) < 1e-9)
  assert.ok(Number.isFinite(c.rate) && c.rate > 0)
})

test('小程序 calc：月度总结/累计曲线', () => {
  const tx = [
    { kind: 'income', amount: 8000, category: '工资', occurred_at: '2026-09-01' },
    { kind: 'expense', amount: 2800, category: '房租', occurred_at: '2026-09-02' },
  ]
  const m = monthSummary(tx, '2026-09')
  assert.equal(m.income, 8000)
  assert.equal(m.fixed, 2800)
  assert.equal(totalBalance(tx), 5200)
  const series = monthlyCumulative(tx)
  assert.equal(series[0].balance, 5200)
})

test('登录成功后保存 token，后续请求带 Authorization', async () => {
  responder = () => authResponse()
  await api.signIn('t@t.co', 'secret123')
  assert.ok(api.isLoggedIn())
  assert.equal(api.getAuth().user_id, USER_ID)

  responder = () => ({ statusCode: 200, data: [{ id: 't1', amount: 10 }] })
  const rows = await api.listTransactions()
  assert.equal(rows.length, 1)
  assert.ok(lastRequest.url.includes('/rest/v1/transactions'))
  assert.equal(lastRequest.header.Authorization, 'Bearer ' + TOKEN)
  assert.ok(lastRequest.header.apikey)
})

test('新增流水：POST + Prefer return=representation', async () => {
  responder = () => authResponse()
  await api.signIn('t@t.co', 'secret123')
  responder = () => ({ statusCode: 201, data: [{ id: 'n1' }] })
  await api.addTransaction({ user_id: USER_ID, kind: 'expense', amount: 12.5, category: '餐饮', occurred_at: '2026-09-12' })
  assert.equal(lastRequest.method, 'POST')
  assert.ok(lastRequest.url.includes('/rest/v1/transactions'))
  assert.ok(String(lastRequest.header.Prefer).includes('return=representation'))
})

test('删除流水：DELETE ?id=eq.', async () => {
  responder = () => authResponse()
  await api.signIn('t@t.co', 'secret123')
  responder = () => ({ statusCode: 204, data: '' })
  await api.deleteTransaction('abc')
  assert.equal(lastRequest.method, 'DELETE')
  assert.ok(lastRequest.url.includes('/rest/v1/transactions?id=eq.abc'))
})

test('getSettings：无记录时自动 upsert 默认值', async () => {
  responder = () => authResponse()
  await api.signIn('t@t.co', 'secret123')
  responder = (opts) =>
    opts.method === 'POST'
      ? { statusCode: 201, data: [{ user_id: USER_ID, net_monthly: 10000 }] }
      : { statusCode: 200, data: [] }
  const s = await api.getSettings(USER_ID)
  assert.equal(s.net_monthly, 10000)
  const upsert = lastRequest
  assert.equal(upsert.method, 'POST')
  assert.ok(upsert.url.includes('on_conflict=user_id'))
  assert.ok(String(upsert.header.Prefer).includes('resolution=merge-duplicates'))
})

test('token 过期时自动用 refresh_token 刷新', async () => {
  responder = () => authResponse()
  await api.signIn('t@t.co', 'secret123')
  // 人为把 token 设为即将过期
  const a = api.getAuth()
  storage.set('wb_auth', { ...a, expires_at: Math.floor(Date.now() / 1000) - 10 })
  responder = (opts) =>
    opts.url.includes('grant_type=refresh_token')
      ? authResponse()
      : { statusCode: 200, data: [] }
  await api.listTransactions()
  // 第一个请求应是刷新，第二个才是数据请求
  assert.ok(api.getAuth().expires_at > Math.floor(Date.now() / 1000))
})

test('保存设置：upsert 到 user_settings', async () => {
  responder = () => authResponse()
  await api.signIn('t@t.co', 'secret123')
  responder = () => ({ statusCode: 201, data: [{ user_id: USER_ID }] })
  await api.saveSettings({ user_id: USER_ID, net_monthly: 12000 })
  assert.equal(lastRequest.method, 'POST')
  assert.ok(lastRequest.url.includes('/rest/v1/user_settings'))
  assert.equal(lastRequest.data.net_monthly, 12000)
})
