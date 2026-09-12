import { useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fmtMoney, catIcon, buildMonthOptions, filterTransactions, buildCsv, downloadCsv } from '../utils'
import TxRow from './TxRow'

// 记录列表：搜索 + 按月筛选 + CSV 导出
export default function Records({ transactions, loading, markTxLocal, removeTxLocal, onWriteError }) {
  const [q, setQ] = useState('')
  const [month, setMonth] = useState('all')
  const [kind, setKind] = useState('all')
  const [exporting, setExporting] = useState(false)

  const months = useMemo(() => buildMonthOptions(transactions), [transactions])
  const filtered = useMemo(
    () => filterTransactions(transactions, { month, q, kind }),
    [transactions, month, q, kind],
  )
  const shown = filtered.slice(0, 60)
  const filtering = q.trim() !== '' || month !== 'all' || kind !== 'all'
  const sum = filtered.reduce(
    (s, t) => s + (t.kind === 'income' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
    0,
  )

  async function exportCsv() {
    if (exporting) return
    setExporting(true)
    try {
      // 导出全部记录（不只当前筛选结果）
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(10000)
      if (error) throw error
      downloadCsv(`小账本备份_${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(data || []))
    } catch (e) {
      onWriteError(e, exportCsv)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <section className="card c-records">
        <div className="card-head"><h2>记录</h2></div>
        <div className="skel" style={{ height: 52 }} />
        <div className="skel" style={{ height: 52 }} />
        <div className="skel" style={{ height: 52 }} />
      </section>
    )
  }

  return (
    <section className="card c-records">
      <div className="card-head">
        <h2>记录</h2>
        <button className="link-btn" onClick={exportCsv} disabled={exporting}>
          {exporting ? '导出中…' : '导出 CSV'}
        </button>
      </div>

      <div className="filter-row">
        <input
          className="search-input"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 搜索分类或备注"
        />
        <select className="month-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">全部月份</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="kind-row">
        {[['all', '全部'], ['expense', '支出'], ['income', '收入']].map(([v, label]) => (
          <button key={v} className={`mini-chip ${kind === v ? 'on' : ''}`} onClick={() => setKind(v)}>
            {label}
          </button>
        ))}
        {filtering && (
          <span className="filter-meta">
            {filtered.length} 笔 · 净 {fmtMoney(sum, 0)}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">{filtering ? '没有符合条件的记录' : '还没有记录，记一笔吧'}</div>
      ) : (
        <ul className="tx-list">
          {shown.map((t) => (
            <TxRow key={t.id} tx={t} markTxLocal={markTxLocal} removeTxLocal={removeTxLocal} onWriteError={onWriteError} />
          ))}
        </ul>
      )}
      {filtered.length > shown.length && (
        <div className="filter-meta more-hint">还有 {filtered.length - shown.length} 笔未显示，试试缩小筛选范围</div>
      )}
    </section>
  )
}
