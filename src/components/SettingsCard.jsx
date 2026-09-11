import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { computeRealHourly, fmtMoney } from '../utils'

const FIELDS = [
  { key: 'net_monthly', label: '到手月薪 (¥)', step: 100, min: 0 },
  { key: 'pay_months', label: '发薪月数', step: 1, min: 1 },
  { key: 'monthly_cost', label: '月工作成本 (¥)', step: 50, min: 0 },
  { key: 'work_days', label: '每月工作日', step: 0.5, min: 1 },
  { key: 'onsite_hours', label: '每日在场小时', step: 0.5, min: 0 },
  { key: 'commute_min', label: '单程通勤 (分钟)', step: 5, min: 0 },
  { key: 'overtime_hours', label: '每日加班小时', step: 0.5, min: 0 },
  { key: 'freedom_target', label: '自由基金目标 (¥)', step: 10000, min: 0 },
  { key: 'safety_target', label: '安全垫目标 (¥)', step: 5000, min: 0 },
]

export default function SettingsCard({ settings, onWriteError }) {
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 云端数据到达时同步进表单；用户正在编辑时不覆盖
  useEffect(() => {
    if (!dirty && settings) setDraft({ ...settings })
  }, [settings, dirty])

  if (!draft) return null

  const calc = computeRealHourly(draft)

  function set(key, value) {
    setDirty(true)
    setSaved(false)
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function save() {
    if (saving) return
    setSaving(true)
    const payload = { user_id: draft.user_id }
    for (const f of FIELDS) {
      const v = Number(draft[f.key])
      payload[f.key] = Number.isFinite(v) ? v : 0
    }
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(payload)
        .select()
        .single()
      if (error) throw error
      setDraft({ ...data })
      setDirty(false)
      setSaved(true)
    } catch (e) {
      onWriteError(e, save)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card c-hourly">
      <div className="card-head">
        <h2>时薪参数</h2>
      </div>

      <div className="field-grid">
        {FIELDS.map((f) => (
          <label className="field" key={f.key}>
            <span>{f.label}</span>
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              min={f.min}
              value={draft[f.key] ?? 0}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <details className="formula" open>
        <summary>展开公式</summary>
        <div className="formula-body">
          <div className="formula-line">
            年到手收入 = {fmtMoney(draft.net_monthly, 0)} × {draft.pay_months} 个月 = <b>{fmtMoney(calc.annualIncome, 0)}</b>
          </div>
          <div className="formula-line">
            年工作成本 = {fmtMoney(draft.monthly_cost, 0)}/月 × 12 月 = <b>{fmtMoney(calc.annualCost, 0)}</b>
          </div>
          <div className="formula-line">
            年净结余 = {fmtMoney(calc.annualIncome, 0)} − {fmtMoney(calc.annualCost, 0)} = <b>{fmtMoney(calc.annualNet, 0)}</b>
          </div>
          <div className="formula-line">
            每日投入 = 在场 {Number(draft.onsite_hours) || 0}h + 加班 {Number(draft.overtime_hours) || 0}h + 通勤 {Number(draft.commute_min) || 0}×2 分钟 = <b>{calc.dailyHours.toFixed(1)} 小时</b>
          </div>
          <div className="formula-line">
            年投入时间 = {calc.dailyHours.toFixed(1)}h × {Number(draft.work_days) || 0} 天 × 12 月 = <b>{calc.annualHours.toFixed(0)} 小时</b>
          </div>
          <div className="formula-line formula-final">
            真实时薪 = {fmtMoney(calc.annualNet, 0)} ÷ {calc.annualHours.toFixed(0)}h = <b>{fmtMoney(calc.rate)}/小时</b>
          </div>
        </div>
      </details>

      <div className="card-foot">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? '保存中…' : dirty ? '保存' : '已保存'}
        </button>
        {saved && !dirty && <span className="ok-hint">✓ 已同步到云端</span>}
      </div>
    </section>
  )
}
