import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { computeRealHourly, monthSummary, totalBalance, currentMonth, fmtMoney, fmtHours, avgMonthlyExpense } from './utils'
import AuthView from './components/AuthView'
import SettingsCard from './components/SettingsCard'
import QuickAdd from './components/QuickAdd'
import RecentList from './components/RecentList'
import MonthlySummary from './components/MonthlySummary'
import FreedomFund from './components/FreedomFund'
import SavingsChart from './components/SavingsChart'
import ScenarioSim from './components/ScenarioSim'

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [loadState, setLoadState] = useState('idle') // idle | loading | ready | error
  const [loadErr, setLoadErr] = useState('')
  const [transactions, setTransactions] = useState([])
  const [settings, setSettings] = useState(null)
  const [writeErr, setWriteErr] = useState(null) // { msg, retry }
  const [synced, setSynced] = useState(false)

  // ---------- 认证 ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ---------- 拉取数据（界面先渲染，这里异步补数据） ----------
  const loadAll = useCallback(async (uid) => {
    setLoadState('loading')
    setLoadErr('')
    try {
      const [txRes, setRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('occurred_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
      ])
      if (txRes.error) throw txRes.error
      if (setRes.error) throw setRes.error
      setTransactions(txRes.data || [])
      if (setRes.data) {
        setSettings(setRes.data)
      } else {
        // 首次使用：用默认值在云端建一条设置记录
        const { data: created, error: insErr } = await supabase
          .from('user_settings')
          .upsert({ user_id: uid })
          .select()
          .single()
        if (insErr) throw insErr
        setSettings(created)
      }
      setSynced(true)
      setLoadState('ready')
    } catch (e) {
      setLoadState('error')
      setLoadErr(e.message || String(e))
    }
  }, [])

  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) {
      setTransactions([])
      setSettings(null)
      setLoadState('idle')
      return
    }
    loadAll(uid)
  }, [uid, loadAll])

  // ---------- Realtime 双向同步 ----------
  useEffect(() => {
    if (!uid) return
    const applyTx = (p) => {
      setTransactions((list) => {
        if (p.eventType === 'DELETE') return list.filter((t) => t.id !== p.old.id)
        const row = p.new
        if (list.some((t) => t.id === row.id)) {
          return list.map((t) => (t.id === row.id ? { ...row, _pending: false } : t))
        }
        return [row, ...list]
      })
      setSynced(true)
    }
    const applySettings = (p) => {
      if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
        setSettings((cur) => (cur && cur.updated_at > p.new.updated_at ? cur : p.new))
        setSynced(true)
      }
    }
    const ch = supabase
      .channel('wb-' + uid)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${uid}` },
        applyTx,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${uid}` },
        applySettings,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [uid])

  // ---------- 本地列表操作（供乐观更新使用） ----------
  const addTxLocal = useCallback((row) => setTransactions((l) => [row, ...l]), [])
  const replaceTxLocal = useCallback(
    (tempId, row) => setTransactions((l) => l.map((t) => (t.id === tempId ? row : t))),
    [],
  )
  const removeTxLocal = useCallback(
    (id) => setTransactions((l) => l.filter((t) => t.id !== id)),
    [],
  )
  const markTxLocal = useCallback(
    (id, patch) => setTransactions((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [],
  )

  // 写入失败提示 + 重试
  const reportWriteError = useCallback((err, retry) => {
    setWriteErr({ msg: err.message || String(err), retry })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  // ---------- 渲染 ----------
  if (!authReady) {
    return (
      <div className="app">
        <div className="hero skel-hero" />
        <div className="grid">
          <SkeletonCard h={260} cls="c-hourly" />
          <SkeletonCard h={260} cls="c-add" />
          <SkeletonCard h={200} cls="c-recent" />
          <SkeletonCard h={200} cls="c-summary" />
        </div>
      </div>
    )
  }

  if (!session) return <AuthView />

  const loading = loadState === 'loading'
  const skeleton = (cls, h) => <SkeletonCard h={h} cls={cls} />

  const rate = settings ? computeRealHourly(settings).rate : 0
  const mBalance = monthSummary(transactions, currentMonth()).balance
  const total = totalBalance(transactions)
  const avgExp = avgMonthlyExpense(transactions)
  const cushion = avgExp > 0 ? total / avgExp : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          ⏱️ 打工人小账本
          <span className={`sync-dot ${synced ? 'on' : ''}`} title={synced ? '云端已同步' : '同步中'} />
        </div>
        <div className="topbar-right">
          <span className="user-email">{session.user.email}</span>
          <button className="btn-ghost" onClick={signOut}>退出</button>
        </div>
      </header>

      {/* 英雄区：真实时薪 + 关键数字 */}
      {loading || !settings ? (
        <div className="hero skel-hero" />
      ) : (
        <section className="hero">
          <div className="hero-label">我的真实时薪</div>
          <div className="hero-rate">
            {fmtMoney(rate)}
            <span className="hero-unit">/小时</span>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hs-label">本月结余</span>
              <span className={`hs-val ${mBalance >= 0 ? '' : 'neg'}`}>{fmtMoney(mBalance, 0)}</span>
            </div>
            <div className="hero-stat">
              <span className="hs-label">累计结余</span>
              <span className={`hs-val ${total >= 0 ? '' : 'neg'}`}>{fmtMoney(total, 0)}</span>
            </div>
            <div className="hero-stat">
              <span className="hs-label">安全垫</span>
              <span className="hs-val">{cushion == null ? '—' : fmtHours(cushion)}</span>
            </div>
          </div>
        </section>
      )}

      {loadState === 'error' && (
        <div className="banner banner-err">
          <span>云端数据读取失败：{loadErr}</span>
          <div className="banner-actions">
            <button className="btn-small" onClick={() => loadAll(uid)}>重试</button>
          </div>
        </div>
      )}

      <main className="grid">
        {loading || !settings
          ? skeleton('c-hourly', 340)
          : <SettingsCard settings={settings} onWriteError={reportWriteError} />}

        {loading || !settings
          ? skeleton('c-add', 340)
          : <QuickAdd
              userId={uid}
              settings={settings}
              addTxLocal={addTxLocal}
              replaceTxLocal={replaceTxLocal}
              removeTxLocal={removeTxLocal}
              onWriteError={reportWriteError}
            />}

        <RecentList
          transactions={transactions}
          loading={loading}
          markTxLocal={markTxLocal}
          removeTxLocal={removeTxLocal}
          onWriteError={reportWriteError}
        />

        {loading ? skeleton('c-summary', 220) : <MonthlySummary transactions={transactions} />}

        {loading || !settings
          ? skeleton('c-fund', 220)
          : <FreedomFund transactions={transactions} settings={settings} />}

        {loading || !settings
          ? skeleton('c-chart', 320)
          : <SavingsChart transactions={transactions} settings={settings} />}

        {loading || !settings
          ? skeleton('c-sim', 240)
          : <ScenarioSim settings={settings} />}
      </main>

      {writeErr && (
        <div className="toast">
          <span>⚠️ 保存失败：{writeErr.msg}</span>
          <div className="banner-actions">
            <button className="btn-small toast-btn" onClick={() => { const r = writeErr.retry; setWriteErr(null); r && r() }}>
              重试
            </button>
            <button className="btn-small toast-btn ghost" onClick={() => setWriteErr(null)}>忽略</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SkeletonCard({ h, cls }) {
  return (
    <section className={`card ${cls}`} style={{ height: h }}>
      <div className="skel skel-title" />
      <div className="skel" style={{ height: 16, width: '70%' }} />
      <div className="skel" style={{ height: 16, width: '55%' }} />
      <div className="skel" style={{ height: 16, width: '80%' }} />
    </section>
  )
}
