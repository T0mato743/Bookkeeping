import { useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  computeRealHourly, fmtMoney, fmtHours, todayStr,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES,
} from '../utils'

export default function QuickAdd({ userId, settings, addTxLocal, replaceTxLocal, removeTxLocal, onWriteError }) {
  const [kind, setKind] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('餐饮')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const cats = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const rate = settings ? computeRealHourly(settings).rate : 0

  function switchKind(k) {
    setKind(k)
    setCategory(k === 'expense' ? '餐饮' : '工资')
  }

  async function save() {
    if (saving) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      onWriteError(new Error('金额要大于 0 才能记账哦'), () => {})
      return
    }
    const payload = {
      user_id: userId,
      kind,
      amount: amt,
      category,
      note: note.trim(),
      occurred_at: todayStr(),
    }
    const temp = {
      ...payload,
      id: 'tmp-' + crypto.randomUUID(),
      created_at: new Date().toISOString(),
      _pending: true,
    }
    addTxLocal(temp)
    setSaving(true)
    const doSave = async () => {
      addTxLocal(temp)
      await insert()
    }
    const insert = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        replaceTxLocal(temp.id, data)
        setSaving(false)
        setAmount('')
        setNote('')
        if (rate > 0) {
          setSavedMsg(
            (kind === 'expense' ? '花了 ' : '赚了 ') +
            fmtMoney(amt) + ' ≈ ' + fmtHours(amt / rate) + ' 工作时间',
          )
          setTimeout(() => setSavedMsg(''), 8000)
        } else {
          setSavedMsg('已保存到云端（填好时薪参数后可换算成工作时间）')
          setTimeout(() => setSavedMsg(''), 8000)
        }
      } catch (e) {
        removeTxLocal(temp.id)
        setSaving(false)
        onWriteError(e, doSave)
      }
    }
    await insert()
  }

  return (
    <section className="card c-add">
      <div className="card-head">
        <h2>10 秒记账</h2>
        <span className="card-tag">即时写回云端</span>
      </div>

      <div className="seg">
        <button type="button" className={`seg-btn ${kind === 'expense' ? 'on' : ''}`} onClick={() => switchKind('expense')}>
          支出
        </button>
        <button type="button" className={`seg-btn ${kind === 'income' ? 'on' : ''}`} onClick={() => switchKind('income')}>
          收入
        </button>
      </div>

      <div className="add-row">
        <label className="field grow">
          <span>金额 (¥)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="0.00"
            autoFocus
          />
        </label>
        <label className="field">
          <span>分类</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>备注（可选）</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="例如：午饭 / 打车 / 月薪"
        />
      </label>

      <button className="btn-primary btn-block" onClick={save} disabled={saving}>
        {saving ? '保存中…' : '记一笔 ⏎'}
      </button>

      {savedMsg && (
        <div className="add-result">
          ✅ {savedMsg}
          {rate > 0 && <span className="add-rate">（真实时薪 {fmtMoney(rate)}/小时）</span>}
        </div>
      )}
      {rate <= 0 && (
        <div className="add-tip">💡 先在「真实时薪计算器」里填好参数，每笔账就会自动换算成工作时间。</div>
      )}
    </section>
  )
}
