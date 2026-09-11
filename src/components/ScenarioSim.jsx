import { useState } from 'react'
import { computeRealHourly, fmtMoney } from '../utils'

export default function ScenarioSim({ settings }) {
  const [commuteDelta, setCommuteDelta] = useState(0)   // 分钟
  const [overtimeDelta, setOvertimeDelta] = useState(0) // 小时
  const [raisePct, setRaisePct] = useState(0)           // %

  const base = computeRealHourly(settings)
  const sim = computeRealHourly(settings, {
    commute_min: Math.max(0, settings.commute_min + commuteDelta),
    overtime_hours: Math.max(0, settings.overtime_hours + overtimeDelta),
    net_monthly: settings.net_monthly * (1 + raisePct / 100),
  })

  const diff = sim.rate - base.rate
  const pct = base.rate > 0 ? (diff / base.rate) * 100 : 0
  const yearGain = diff * base.annualHours

  return (
    <section className="card c-sim">
      <div className="card-head">
        <h2>情景模拟：换个活法，时薪怎么变？</h2>
        <span className="card-tag">拖动滑块试试</span>
      </div>

      <div className="sim-grid">
        <Slider
          label={`通勤变化：${commuteDelta > 0 ? '+' : ''}${commuteDelta} 分钟/单程`}
          min={-60} max={120} step={5} value={commuteDelta} onChange={setCommuteDelta}
        />
        <Slider
          label={`加班变化：${overtimeDelta > 0 ? '+' : ''}${overtimeDelta} 小时/天`}
          min={-3} max={4} step={0.5} value={overtimeDelta} onChange={setOvertimeDelta}
        />
        <Slider
          label={`涨薪：${raisePct > 0 ? '+' : ''}${raisePct}%`}
          min={-30} max={50} step={1} value={raisePct} onChange={setRaisePct}
        />
      </div>

      <div className="sim-result">
        <div className="sim-cell">
          <span className="sum-label">基准真实时薪</span>
          <span className="sim-val">{fmtMoney(base.rate)}</span>
        </div>
        <div className="sim-arrow">→</div>
        <div className="sim-cell">
          <span className="sum-label">模拟真实时薪</span>
          <span className={`sim-val ${diff >= 0 ? 'in' : 'out'}`}>{fmtMoney(sim.rate)}</span>
        </div>
        <div className="sim-cell">
          <span className="sum-label">变化</span>
          <span className={`sim-val ${diff >= 0 ? 'in' : 'out'}`}>
            {diff >= 0 ? '+' : ''}{fmtMoney(diff)}（{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%）
          </span>
        </div>
        <div className="sim-cell">
          <span className="sum-label">折合一年</span>
          <span className={`sim-val ${diff >= 0 ? 'in' : 'out'}`}>
            {diff >= 0 ? '+' : ''}{fmtMoney(yearGain, 0)}
          </span>
        </div>
      </div>

      <p className="sum-hint">
        {commuteDelta < 0 && `🚇 每天少通勤 ${-commuteDelta} 分钟，一年约省下 ${((-commuteDelta * 2 * settings.work_days * 12) / 60).toFixed(0)} 小时。`}
        {overtimeDelta < 0 && ` 🌙 每天少加班 ${-overtimeDelta} 小时，一年拿回 ${(-overtimeDelta * settings.work_days * 12).toFixed(0)} 小时人生。`}
        {raisePct > 0 && ` 💰 涨薪 ${raisePct}% 大约等于真实时薪提升 ${(((sim.rate - base.rate) / (base.rate || 1)) * 100).toFixed(1)}%。`}
        {commuteDelta === 0 && overtimeDelta === 0 && raisePct === 0 && '拖动上面的滑块，看看少通勤、少加班、涨工资哪个对真实时薪影响最大。'}
      </p>
    </section>
  )
}

function Slider({ label, min, max, step, value, onChange }) {
  return (
    <label className="sim-slider">
      <span className="sim-slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
