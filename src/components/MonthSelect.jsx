import { useEffect, useRef, useState } from 'react'

// 自定义月份下拉：替代原生 select，样式统一可控
export default function MonthSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const esc = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const items = ['all', ...options]
  const label = value === 'all' ? '全部月份' : value

  return (
    <div className="msel" ref={ref}>
      <button
        type="button"
        className={`msel-btn ${value !== 'all' ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="ri-calendar-line" />
        <span>{label}</span>
        <i className={`ri-arrow-down-s-line msel-arrow ${open ? 'up' : ''}`} />
      </button>
      {open && (
        <div className="msel-pop">
          {items.map((m) => (
            <button
              type="button"
              key={m}
              className={`msel-item ${m === value ? 'on' : ''}`}
              onClick={() => { onChange(m); setOpen(false) }}
            >
              <i className={`msel-ic ${m === 'all' ? 'ri-apps-line' : 'ri-calendar-line'}`} />
              {m === 'all' ? '全部月份' : m}
              {m === value && <i className="ri-check-line msel-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
