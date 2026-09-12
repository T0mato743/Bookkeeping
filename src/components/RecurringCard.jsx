import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fmtMoney, catIcon, nextOccurrenceText, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils'

// 周期自动记账：房租/工资等每月固定收支，云端函数自动补账
export default function RecurringCard({ userId, onWriteError, migrationNeeded }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ kind: 'expense', amount: '', category: '房租', note: '', day: 1 })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setRules(data || [])
    } catch (e) {
      // 表不存在等情况静默降级，由 migrationNeeded 提示
      if (!migrationNeeded) onWriteError(e, load)
    } finally {
      setLoading(false)
    }
  }

  const cats = form.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  function setKind(kind) {
    setForm((f) => ({ ...f, kind, category: kind === 'expense' ? '房租' : '工资' }))
  }

  async function addRule() {
    if (busy) return
    const amt = Number(form.amount)
    const day = Number(form.day)
    if (!Number.isFinite(amt) || amt <= 0) {
      onWriteError(new Error('金额要大于 0'), addRule)
      return
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      onWriteError(new Error('日期要在 1~31 之间（当月没有该日时记在月末）'), addRule)
      return
    }
    const payload = {
      user_id: userId,
      kind: form.kind,
      amount: amt,
      category: form.category,
      note: form.note.trim(),
      day_of_month: day,
    }
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      setRules((l) => [data, ...l])
      setForm((f) => ({ ...f, amount: '', note: '' }))
      setShowForm(false)
      // 立即跑一次补账，本月已到期的马上入账
      await supabase.rpc('run_recurring', { p_user: userId })
    } catch (e) {
      onWriteError(e, addRule)
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(rule) {
    const next = !rule.active
    setRules((l) => l.map((r) => (r.id === rule.id ? { ...r, active: next } : r)))
    try {
      const { error } = await supabase
        .from('recurring_rules')
        .update({ active: next })
        .eq('id', rule.id)
      if (error) throw error
    } catch (e) {
      setRules((l) => l.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r)))
      onWriteError(e, () => toggleActive(rule))
    }
  }

  async function del(rule) {
    setRules((l) => l.filter((r) => r.id !== rule.id))
    try {
      const { error } = await supabase.from('recurring_rules').delete().eq('id', rule.id)
      if (error) throw error
    } catch (e) {
      setRules((l) => [rule, ...l])
      onWriteError(e, () => del(rule))
    }
  }

  return (
    <section className="card c-recurring">
      <div className="card-head">
        <h2>周期记账</h2>
        <button className="link-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '收起' : '+ 添加规则'}
        </button>
      </div>

      {migrationNeeded && (
        <div className="hint-warn">需要先升级数据库：在 Supabase SQL Editor 执行 db/migration-2.sql 后此功能可用</div>
      )}

      {showForm && (
        <div className="rule-form">
          <div className="seg">
            <button type="button" className={`seg-btn ${form.kind === 'expense' ? 'on' : ''}`} onClick={() => setKind('expense')}>支出</button>
            <button type="button" className={`seg-btn ${form.kind === 'income' ? 'on' : ''}`} onClick={() => setKind('income')}>收入</button>
          </div>
          <div className="rule-form-row">
            <label className="field grow">
              <span>金额 (¥)</span>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </label>
            <label className="field">
              <span>每月几号 (1~31)</span>
              <input type="number" inputMode="numeric" min="1" max="31" value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })} />
            </label>
          </div>
          <div className="rule-form-row">
            <label className="field grow">
              <span>分类</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="field grow">
              <span>备注（可选）</span>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="如：房租 / 月薪" />
            </label>
          </div>
          <div className="form-hint">29~31 号：当月没有该日时自动记在当月最后一天（如 2 月记在 2/28）</div>
          <button className="btn-primary btn-block" onClick={addRule} disabled={busy}>
            {busy ? '保存中…' : '保存规则'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="skel" style={{ height: 48 }} />
      ) : rules.length === 0 ? (
        <div className="empty">
          {migrationNeeded ? '升级数据库后可添加' : '还没有周期规则，添加后房租/工资每月自动入账'}
        </div>
      ) : (
        <ul className="rule-list">
          {rules.map((r) => (
            <li key={r.id} className={`rule-row ${r.active ? '' : 'off'}`}>
              <span className="tx-avatar"><i className={catIcon(r.category)} /></span>
              <div className="tx-main">
                <span className="tx-cat">
                  {r.category}
                  {r.note && <span className="tx-note"> {r.note}</span>}
                </span>
                <span className="tx-date">
                  {r.active ? nextOccurrenceText(r.day_of_month, r.last_generated) : '已停用'}
                </span>
              </div>
              <span className={`tx-amount ${r.kind === 'income' ? 'in' : 'out'}`}>
                {r.kind === 'income' ? '+' : '−'}{fmtMoney(r.amount, 0)}
              </span>
              <span className="tx-actions">
                <button
                  className={`switch ${r.active ? 'on' : ''}`}
                  role="switch"
                  aria-checked={r.active}
                  title={r.active ? '点击停用' : '点击启用'}
                  onClick={() => toggleActive(r)}
                />
                <button className="icon-btn" title="删除" onClick={() => del(r)}>🗑️</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
