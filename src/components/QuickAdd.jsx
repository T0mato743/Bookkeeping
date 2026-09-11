import { useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  computeRealHourly, fmtMoney, fmtHours, todayStr, catIcon,
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
        const sign = kind === 'expense' ? '−' : '+'
        const conv = rate > 0 ? ` ≈ ${fmtHours(amt / rate)}` : ''
        setSavedMsg(`${sign}${fmtMoney(amt)}${conv}`)
        setTimeout(() => setSavedMsg(''), 6000)
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
        <h2>记一笔</h2>
      </div>

      <div className="seg">
        <button type="button" className={`seg-btn ${kind === 'expense' ? 'on' : ''}`} onClick={() => switchKind('expense')}>
          支出
        </button>
        <button type="button" className={`seg-btn ${kind === 'income' ? 'on' : ''}`} onClick={() => switchKind('income')}>
          收入
        </button>
      </div>

      <div className="amount-box">
        <span className="amount-cny">¥</span>
        <input
          className="amount-input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="0.00"
          autoFocus
        />
      </div>

      <div className="cat-grid">
        {cats.map((c) => (
          <button
            type="button"
            key={c}
            className={`cat-chip ${category === c ? 'on' : ''}`}
            onClick={() => setCategory(c)}
          >
            <span className="cat-icon">{catIcon(c)}</span>
            {c}
          </button>
        ))}
      </div>

      <input
        className="note-input"
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="备注（可选）"
      />

      <button className="btn-primary btn-block" onClick={save} disabled={saving}>
        {saving ? '保存中…' : '保存 ⏎'}
      </button>

      {savedMsg && <div className="add-result">✅ {savedMsg}</div>}
    </section>
  )
}
