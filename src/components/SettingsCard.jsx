import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { computeRealHourly, fmtMoney } from '../utils'

const FIELDS = [
  { key: 'net_monthly', label: '到手月薪 (¥)', step: 100, min: 0 },
  { key: 'pay_months', label: '发薪月数 (个月/年)', step: 1, min: 1 },
  { key: 'monthly_cost', label: '月工作成本 (¥)', step: 50, min: 0 },
  { key: 'work_days', label: '每月工作日 (天)', step: 0.5, min: 1 },
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
  const [savedAt, setSavedAt] = useState(null)

  // 云端数据到达时同步进表单；用户正在编辑时不覆盖
  useEffect(() => {
    if (!dirty && settings) setDraft({ ...settings })
  }, [settings, dirty])

  if (!draft) return null

  const calc = computeRealHourly(draft)

  function set(key, value) {
    setDirty(true)
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
    const doSave = () => save()
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(payload)
        .select()
        .single()
      if (error) throw error
      setDraft({ ...data })
      setDirty(false)
      setSavedAt(new Date())
    } catch (e) {
      onWriteError(e, doSave)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card c-hourly">
      <div className="card-head">
        <h2>真实时薪计算器</h2>
        <span className="card-tag">即个人设置 · 存云端</span>
      </div>

      <div className="rate-big">
        <span className="rate-num">{fmtMoney(calc.rate)}</span>
        <span className="rate-unit">/ 小时 · 这才是你真正的身价</span>
      </div>

      <div className="field-grid">
        {FIELDS.map((f) => (
          <label className="field" key={f.key}>
            <span>{f.label}</span>
            <input
              type="number"
              step={f.step}
              min={f.min}
              value={draft[f.key] ?? 0}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="formula">
        <div className="formula-title">公式展开</div>
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
          每日投入 = 在场 {draft.onsite_hours}h + 加班 {draft.overtime_hours}h + 通勤 {draft.commute_min}×2 分钟 = <b>{calc.dailyHours.toFixed(1)} 小时</b>
        </div>
        <div className="formula-line">
          年投入时间 = {calc.dailyHours.toFixed(1)}h × {draft.work_days} 天 × 12 月 = <b>{calc.annualHours.toFixed(0)} 小时</b>
        </div>
        <div className="formula-line formula-final">
          真实时薪 = {fmtMoney(calc.annualNet, 0)} ÷ {calc.annualHours.toFixed(0)}h = <b>{fmtMoney(calc.rate)}/小时</b>
        </div>
      </div>

      <div className="card-foot">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? '保存中…' : dirty ? '保存到云端' : '已保存'}
        </button>
        {savedAt && !dirty && <span className="ok-hint">✓ 已写入云端</span>}
      </div>
    </section>
  )
}
