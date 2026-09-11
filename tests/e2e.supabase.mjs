// 端到端功能测试：走真实 Supabase（auth + REST + RLS）
// 运行：node tests/e2e.supabase.mjs
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL || 'https://hjcdzoxwkaxikfrbhgry.supabase.co'
const KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_D_f4QNgtDnMcJmdPKGRKng_4lzD_96m'

const EMAIL = `wb.e2e.${Date.now()}@gmail.com`
const PASSWORD = 'E2eTest#2026'

const supabase = createClient(URL, KEY)
let passed = 0
let failed = 0

function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log('  ✔', name)
  } else {
    failed++
    console.error('  ✘', name, extra)
  }
}

console.log('E2E 账号:', EMAIL)

// 1. 注册
const { data: su, error: suErr } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD })
check('注册返回无致命错误', !suErr, suErr?.message)
if (suErr && /already/i.test(suErr.message || '')) process.exit(1)
const session = su?.session
if (!session) {
  console.log('  ⚠ 项目开启了邮箱确认，无法自动登录做写入测试（其余测试跳过）。')
  console.log(`结果: ${passed} 通过, ${failed} 失败`)
  process.exit(0)
}
const uid = session.user.id
const authed = createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } } })

// 2. 设置：首次 upsert 默认值，再改一个字段
{
  const { data, error } = await authed.from('user_settings').upsert({ user_id: uid }).select().single()
  check('设置表 upsert 默认值', !error && data?.net_monthly == 10000, error?.message)
  const { data: d2, error: e2 } = await authed
    .from('user_settings')
    .update({ net_monthly: 12345 })
    .eq('user_id', uid)
    .select()
    .single()
  check('设置表更新 net_monthly=12345', !e2 && d2?.net_monthly == 12345, e2?.message)
}

// 3. 记账：插两笔
{
  const { data, error } = await authed
    .from('transactions')
    .insert([
      { user_id: uid, kind: 'expense', amount: 45.5, category: '餐饮', note: 'e2e-午饭', occurred_at: new Date().toISOString().slice(0, 10) },
      { user_id: uid, kind: 'income', amount: 10000, category: '工资', note: 'e2e-月薪', occurred_at: new Date().toISOString().slice(0, 10) },
    ])
    .select()
  check('插入两笔流水', !error && data?.length === 2, error?.message)
}

// 4. 读取校验（含 RLS：只能看到自己的）
{
  const { data, error } = await authed.from('transactions').select('*')
  check('读回流水中包含 e2e 记录', !error && data.some((t) => t.note === 'e2e-午饭'), error?.message)
}

// 5. 改一笔
{
  const { data: list } = await authed.from('transactions').select('id').limit(1)
  const { error } = await authed
    .from('transactions')
    .update({ amount: 66.6, note: 'e2e-改过' })
    .eq('id', list[0].id)
  const { data: after } = await authed.from('transactions').select('*').eq('id', list[0].id).single()
  check('更新一笔流水', !error && after?.amount == 66.6, error?.message)
}

// 6. 删一笔
{
  const { data: before } = await authed.from('transactions').select('id')
  const { error } = await authed.from('transactions').delete().eq('id', before[0].id)
  const { data: after } = await authed.from('transactions').select('id')
  check('删除一笔流水', !error && after.length === before.length - 1, error?.message)
}

// 7. RLS：未登录读不到数据
{
  const { data } = await supabase.from('transactions').select('*').limit(5)
  check('RLS：匿名用户读不到流水', Array.isArray(data) && data.length === 0)
}

console.log(`结果: ${passed} 通过, ${failed} 失败`)
process.exit(failed ? 1 : 0)
