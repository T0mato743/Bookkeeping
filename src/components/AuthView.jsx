import { useState } from 'react'
import { supabase } from '../supabaseClient'

const ERR_MAP = {
  'Invalid login credentials': '邮箱或密码不对，再试试。',
  'Email not confirmed': '邮箱还没确认：去收件箱点确认链接后再登录（或在 Supabase 控制台 Authentication → Sign In/Providers 里关闭 Confirm email）。',
  'User already registered': '这个邮箱已经注册过了，直接登录吧。',
  'Password should be at least 6 characters': '密码至少要 6 位。',
  'Unable to validate email address: invalid format': '邮箱格式不对。',
  'Signups not allowed for this instance': '该项目未开放注册，请检查 Supabase 认证设置。',
}

function zhErr(e) {
  return ERR_MAP[e.message] || `出错了：${e.message}`
}

export default function AuthView() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr('')
    setNotice('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error
        if (!data.session) {
          setNotice('注册成功！项目开启了邮箱确认：请先到收件箱点确认链接，再回来登录。（个人使用也可以在 Supabase 控制台关闭 Confirm email）')
        }
      }
    } catch (e2) {
      setErr(zhErr(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-logo"><i className="ri-timer-flash-fill" /></div>
        <h1 className="auth-title">打工人小账本</h1>
        <p className="auth-sub">算清真实时薪，把每一笔钱换算成生命时间</p>

        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${mode === 'login' ? 'on' : ''}`}
            onClick={() => { setMode('login'); setErr(''); setNotice('') }}
          >
            登录
          </button>
          <button
            type="button"
            className={`seg-btn ${mode === 'signup' ? 'on' : ''}`}
            onClick={() => { setMode('signup'); setErr(''); setNotice('') }}
          >
            注册
          </button>
        </div>

        <label className="field">
          <span>邮箱</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {err && <div className="form-err">⚠️ {err}</div>}
        {notice && <div className="form-ok">📮 {notice}</div>}

        <button className="btn-primary btn-block" disabled={busy}>
          {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
        </button>
        <p className="auth-foot">数据保存在 Supabase 云端，登录同一账号即可在任何设备同步。</p>
      </form>
    </div>
  )
}
