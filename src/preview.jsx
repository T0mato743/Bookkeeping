// 开发专用：用假数据渲染各视图，便于浏览器里做 UI 走查（不进生产构建）
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, useTheme } from './theme'
import { DEFAULT_SETTINGS, todayStr } from './utils'
import 'remixicon/fonts/remixicon.css'
import './styles.css'
import SettingsCard from './components/SettingsCard'
import QuickAdd from './components/QuickAdd'
import Records from './components/Records'
import RecurringCard from './components/RecurringCard'
import MonthlySummary from './components/MonthlySummary'
import FreedomFund from './components/FreedomFund'
import CategoryPie from './components/CategoryPie'
import WeeklyTrend from './components/WeeklyTrend'
import SavingsChart from './components/SavingsChart'
import ScenarioSim from './components/ScenarioSim'
import { computeRealHourly, monthSummary, totalBalance, currentMonth, fmtMoney, fmtHours, avgMonthlyExpense } from './utils'

const M = currentMonth()
const day = (md) => `${M}-${String(md).padStart(2, '0')}`

const SETTINGS = { ...DEFAULT_SETTINGS, user_id: 'demo', budget_monthly: 3500, updated_at: '' }
const TX = [
  { id: '1', user_id: 'demo', kind: 'expense', amount: 28, category: '餐饮', note: '楼下来碗面', occurred_at: todayStr() },
  { id: '2', user_id: 'demo', kind: 'expense', amount: 15, category: '交通', note: '地铁', occurred_at: todayStr() },
  { id: '3', user_id: 'demo', kind: 'income', amount: 11000, category: '工资', note: '十月月薪', occurred_at: day(10) },
  { id: '4', user_id: 'demo', kind: 'expense', amount: 2600, category: '房租', note: '十一月房租', occurred_at: day(10) },
  { id: '5', user_id: 'demo', kind: 'expense', amount: 156, category: '水电煤', note: '', occurred_at: day(8) },
  { id: '6', user_id: 'demo', kind: 'expense', amount: 89, category: '订阅服务', note: '视频会员', occurred_at: day(6) },
  { id: '7', user_id: 'demo', kind: 'expense', amount: 320, category: '购物', note: '秋冬睡衣', occurred_at: day(4) },
  { id: '8', user_id: 'demo', kind: 'expense', amount: 68, category: '娱乐', note: '电影', occurred_at: day(3) },
  { id: '9', user_id: 'demo', kind: 'income', amount: 300, category: '理财收益', note: '', occurred_at: day(2) },
  { id: '10', user_id: 'demo', kind: 'expense', amount: 2400, category: '房租', note: '十月房租', occurred_at: `${M === '2026-10' ? '2026-09' : M}-10` },
]
const RULES = [
  { id: 'r1', user_id: 'demo', kind: 'expense', amount: 2600, category: '房租', note: '房租', day_of_month: 10, active: true, last_generated: day(10) },
  { id: 'r2', user_id: 'demo', kind: 'income', amount: 11000, category: '工资', note: '月薪', day_of_month: 10, active: true, last_generated: day(10) },
  { id: 'r3', user_id: 'demo', kind: 'expense', amount: 30, category: '订阅服务', note: '音乐会员', day_of_month: 15, active: false, last_generated: null },
]

const noop = () => {}
const TABS = [
  { key: 'home', label: '首页', icon: 'ri-home-5-line', activeIcon: 'ri-home-5-fill' },
  { key: 'stats', label: '统计', icon: 'ri-bar-chart-grouped-line', activeIcon: 'ri-bar-chart-grouped-fill' },
  { key: 'plan', label: '规划', icon: 'ri-calendar-todo-line', activeIcon: 'ri-calendar-todo-fill' },
  { key: 'settings', label: '设置', icon: 'ri-settings-4-line', activeIcon: 'ri-settings-4-fill' },
]

function Preview() {
  const [view, setView] = useState('home')
  const { theme, setTheme } = useTheme()
  const rate = computeRealHourly(SETTINGS).rate
  const mBalance = monthSummary(TX, currentMonth()).balance

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <i className="ri-timer-flash-line topbar-logo" />
          打工人小账本
          <span className="sync-dot on" />
        </div>
        <nav className="tabs-top">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-pill ${view === t.key ? 'on' : ''}`} onClick={() => setView(t.key)}>
              <i className={view === t.key ? t.activeIcon : t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="user-email">demo@workbuddy.link</span>
          <button className="icon-btn theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
          </button>
          <button className="btn-ghost">退出</button>
        </div>
      </header>

      {view === 'home' && (
        <main className="grid view">
          <section className="hero">
            <div className="hero-label">我的真实时薪</div>
            <div className="hero-rate">{fmtMoney(rate)}<span className="hero-unit">/小时</span></div>
            <div className="hero-stats">
              <div className="hero-stat"><span className="hs-label">本月结余</span><span className={`hs-val ${mBalance >= 0 ? '' : 'neg'}`}>{fmtMoney(mBalance, 0)}</span></div>
              <div className="hero-stat"><span className="hs-label">累计结余</span><span className="hs-val">{fmtMoney(totalBalance(TX), 0)}</span></div>
              <div className="hero-stat"><span className="hs-label">安全垫</span><span className="hs-val">{fmtHours(totalBalance(TX) / avgMonthlyExpense(TX))}</span></div>
            </div>
          </section>
          <QuickAdd userId="demo" settings={SETTINGS} addTxLocal={noop} replaceTxLocal={noop} removeTxLocal={noop} onWriteError={noop} />
          <Records userId="demo" transactions={TX} loading={false} markTxLocal={noop} removeTxLocal={noop} onWriteError={noop} compact />
        </main>
      )}

      {view === 'stats' && (
        <main className="grid view">
          <MonthlySummary transactions={TX} settings={SETTINGS} />
          <CategoryPie transactions={TX} month={currentMonth()} />
          <WeeklyTrend transactions={TX} />
          <SavingsChart transactions={TX} settings={SETTINGS} />
        </main>
      )}

      {view === 'plan' && (
        <main className="grid view">
          <RecurringCard userId="demo" onWriteError={noop} migrationNeeded={false} rulesOverride={RULES} />
          <FreedomFund transactions={TX} settings={SETTINGS} />
          <ScenarioSim settings={SETTINGS} />
        </main>
      )}

      {view === 'settings' && (
        <main className="grid view">
          <SettingsCard settings={SETTINGS} onWriteError={noop} />
          <section className="card c-prefs">
            <div className="card-head"><h2>偏好与账号</h2></div>
            <div className="pref-row">
              <span className="pref-label"><i className="ri-contrast-2-line pref-ic" /> 外观</span>
              <div className="seg pref-seg">
                <button className={`seg-btn ${theme === 'light' ? 'on' : ''}`} onClick={() => setTheme('light')}><i className="ri-sun-line" /> 亮色</button>
                <button className={`seg-btn ${theme === 'dark' ? 'on' : ''}`} onClick={() => setTheme('dark')}><i className="ri-moon-line" /> 深色</button>
              </div>
            </div>
            <div className="pref-row">
              <span className="pref-label"><i className="ri-user-3-line pref-ic" /> 账号</span>
              <span className="pref-val">demo@workbuddy.link</span>
            </div>
            <div className="pref-row">
              <span className="pref-label"><i className="ri-database-2-line pref-ic" /> 数据</span>
              <span className="pref-val">CSV 导入 / 导出在「首页 → 记录」卡片右上角</span>
            </div>
            <button className="btn-logout"><i className="ri-logout-box-r-line" /> 退出登录</button>
          </section>
        </main>
      )}
      <nav className="tabbar-bottom">
        {TABS.map((t) => (
          <button key={t.key} className={`tabbar-item ${view === t.key ? 'on' : ''}`} onClick={() => setView(t.key)}>
            <i className={view === t.key ? t.activeIcon : t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <Preview />
  </ThemeProvider>,
)
