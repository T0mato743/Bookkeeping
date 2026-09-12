import { useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../supabaseClient'
import {
  fmtMoney, buildMonthOptions, filterTransactions, buildCsv, downloadCsv,
  normalizeImportRows, dedupeImportRows,
} from '../utils'
import TxRow from './TxRow'
import MonthSelect from './MonthSelect'

// 记录列表：搜索 + 按月筛选 + CSV 导出
export default function Records({ userId, transactions, loading, markTxLocal, removeTxLocal, onWriteError }) {
  const [q, setQ] = useState('')
  const [month, setMonth] = useState('all')
  const [kind, setKind] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef(null)

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

  function onPickFile() {
    fileRef.current?.click()
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const { valid, invalid } = normalizeImportRows(data)
        if (!valid.length) {
          setImportMsg(`导入失败：没有有效记录（${invalid} 行格式不对，需包含 日期/类型/分类/金额 列）`)
          return
        }
        const deduped = dedupeImportRows(valid, transactions)
        const skipped = valid.length - deduped.length
        if (!deduped.length) {
          setImportMsg(`没有可导入的新记录（${skipped} 条与现有记录重复）`)
          return
        }
        if (!window.confirm(`解析到 ${valid.length} 条有效记录：将导入 ${deduped.length} 条${skipped ? `，跳过重复 ${skipped} 条` : ''}${invalid ? `，无效 ${invalid} 行` : ''}。确认导入？`)) {
          return
        }
        setImporting(true)
        const doImport = () => runImport(deduped, skipped, invalid)
        try {
          await runImport(deduped, skipped, invalid)
        } catch (err) {
          setImporting(false)
          onWriteError(err, doImport)
        }
      },
      error: (err) => setImportMsg('文件读取失败：' + err.message),
    })
  }

  async function runImport(rows, skipped, invalid) {
    // 分批插入，每批 500 条
    const CHUNK = 500
    let ok = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK).map((r) => ({ ...r, user_id: userId }))
      const { error } = await supabase.from('transactions').insert(batch)
      if (error) throw error
      ok += batch.length
    }
    setImporting(false)
    setImportMsg(`✓ 已导入 ${ok} 条${skipped ? `，跳过重复 ${skipped} 条` : ''}${invalid ? `，无效跳过 ${invalid} 行` : ''}`)
    setTimeout(() => setImportMsg(''), 8000)
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
        <span className="head-actions">
          <button className="link-btn" onClick={onPickFile} disabled={importing}>
            <i className="ri-upload-2-line" />
            {importing ? '导入中…' : '导入 CSV'}
          </button>
          <button className="link-btn" onClick={exportCsv} disabled={exporting}>
            <i className="ri-download-2-line" />
            {exporting ? '导出中…' : '导出 CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </span>
      </div>

      {importMsg && <div className="hint-warn">{importMsg}</div>}

      <div className="filter-row">
        <div className="search-wrap">
          <i className="ri-search-line search-ic" />
          <input
            className="search-input"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索分类或备注"
          />
        </div>
        <MonthSelect value={month} options={months} onChange={setMonth} />
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
