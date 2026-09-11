import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { fmtMoney, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils'

export default function RecentList({ transactions, loading, markTxLocal, removeTxLocal, onWriteError }) {
  if (loading) {
    return (
      <section className="card c-recent">
        <div className="card-head"><h2>最近记录</h2></div>
        <div className="skel" style={{ height: 48 }} />
        <div className="skel" style={{ height: 48 }} />
        <div className="skel" style={{ height: 48 }} />
        <div className="skel" style={{ height: 48 }} />
      </section>
    )
  }

  const recent = transactions.slice(0, 4)

  return (
    <section className="card c-recent">
      <div className="card-head">
        <h2>最近 4 笔</h2>
        <span className="card-tag">共 {transactions.length} 笔</span>
      </div>
      {recent.length === 0 ? (
        <div className="empty">还没有记录，去右边记一笔吧 →</div>
      ) : (
        <ul className="tx-list">
          {recent.map((t) => (
            <TxRow key={t.id} tx={t} markTxLocal={markTxLocal} removeTxLocal={removeTxLocal} onWriteError={onWriteError} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TxRow({ tx, markTxLocal, removeTxLocal, onWriteError }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)

  async function saveEdit() {
    const amt = Number(draft.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      onWriteError(new Error('金额要大于 0'), saveEdit)
      return
    }
    const patch = { amount: amt, category: draft.category, note: draft.note.trim(), kind: draft.kind }
    markTxLocal(tx.id, { ...patch, _pending: true })
    setEditing(false)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', tx.id)
        .select()
        .single()
      if (error) throw error
      markTxLocal(tx.id, { ...data, _pending: false })
    } catch (e) {
      markTxLocal(tx.id, { amount: tx.amount, category: tx.category, note: tx.note, kind: tx.kind, _pending: false })
      onWriteError(e, saveEdit)
    }
  }

  async function del() {
    markTxLocal(tx.id, { _pending: true })
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
      if (error) throw error
      removeTxLocal(tx.id)
    } catch (e) {
      markTxLocal(tx.id, { _pending: false })
      onWriteError(e, del)
    }
  }

  const isIncome = tx.kind === 'income'

  return (
    <li className={`tx-row ${tx._pending ? 'pending' : ''}`}>
      {editing ? (
        <div className="tx-edit">
          <div className="tx-edit-row">
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value, category: e.target.value === 'income' ? '工资' : '餐饮' })}
            >
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </div>
          <div className="tx-edit-row">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {(draft.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="备注"
            />
          </div>
          <div className="tx-edit-actions">
            <button className="btn-small" onClick={saveEdit}>保存</button>
            <button className="btn-small ghost" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      ) : (
        <>
          <div className="tx-main">
            <span className="tx-cat">{tx.category}</span>
            {tx.note && <span className="tx-note">{tx.note}</span>}
            <span className="tx-date">{tx.occurred_at}</span>
          </div>
          <div className="tx-side">
            <span className={`tx-amount ${isIncome ? 'in' : 'out'}`}>
              {isIncome ? '+' : '−'}{fmtMoney(tx.amount)}
            </span>
            <span className="tx-actions">
              <button
                className="icon-btn"
                title="编辑"
                onClick={() => { setDraft({ amount: tx.amount, category: tx.category, note: tx.note, kind: tx.kind }); setEditing(true) }}
              >
                ✏️
              </button>
              <button className="icon-btn" title="删除" onClick={del}>🗑️</button>
            </span>
          </div>
          {tx._pending && <span className="pending-dot" title="同步中…">◌</span>}
        </>
      )}
    </li>
  )
}
