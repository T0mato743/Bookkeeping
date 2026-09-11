// Supabase REST 封装：认证（token 自动刷新）+ 数据读写
// 与网页版共用同一账号体系和数据表
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'

const AUTH_KEY = 'wb_auth'

function request({ path, method = 'GET', data, headers = {}, token }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: SUPABASE_URL + path,
      method,
      data,
      timeout: 15000,
      header: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error((res.data && (res.data.msg || res.data.message || res.data.error_description || res.data.error)) || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => reject(new Error((err && err.errMsg) || '网络请求失败')),
    })
  })
}

// ---------- 认证 ----------
export function getAuth() {
  return wx.getStorageSync(AUTH_KEY) || null
}

export function isLoggedIn() {
  const a = getAuth()
  return !!(a && a.access_token && a.user_id)
}

export async function signIn(email, password) {
  const data = await request({
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    data: { email, password },
  })
  saveAuth(data)
  return data
}

export async function signUp(email, password) {
  const data = await request({
    path: '/auth/v1/signup',
    method: 'POST',
    data: { email, password },
  })
  // 项目未关邮箱确认时没有 session，需要去邮箱点确认后登录
  if (data.access_token) saveAuth(data)
  return data
}

export async function signOut() {
  wx.removeStorageSync(AUTH_KEY)
}

function saveAuth(data) {
  const expiresAt = data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600)
  wx.setStorageSync(AUTH_KEY, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user_id: (data.user && data.user.id) || data.user_id,
    email: (data.user && data.user.email) || '',
  })
}

async function ensureToken() {
  const a = getAuth()
  if (!a) throw new Error('未登录')
  const nowSec = Math.floor(Date.now() / 1000)
  if (a.expires_at - 60 > nowSec) return a.access_token
  // 刷新 token
  const data = await request({
    path: '/auth/v1/token?grant_type=refresh_token',
    method: 'POST',
    data: { refresh_token: a.refresh_token },
  })
  saveAuth(data)
  return data.access_token
}

function authHeaders(token) {
  return { Authorization: 'Bearer ' + token }
}

// ---------- 数据读写（401 时刷新一次重试） ----------
async function authed(fn) {
  try {
    const token = await ensureToken()
    return await fn(token)
  } catch (e) {
    if (String(e.message).includes('401') || String(e.message).toLowerCase().includes('jwt')) {
      wx.removeStorageSync(AUTH_KEY)
      throw new Error('登录已过期，请重新登录')
    }
    throw e
  }
}

export function listTransactions() {
  return authed((token) =>
    request({
      path: '/rest/v1/transactions?select=*&order=occurred_at.desc,created_at.desc&limit=1000',
      token,
      headers: authHeaders(token),
    }),
  )
}

export function addTransaction(payload) {
  return authed((token) =>
    request({
      path: '/rest/v1/transactions',
      method: 'POST',
      data: payload,
      token,
      headers: { ...authHeaders(token), Prefer: 'return=representation' },
    }),
  )
}

export function updateTransaction(id, patch) {
  return authed((token) =>
    request({
      path: `/rest/v1/transactions?id=eq.${id}`,
      method: 'PATCH',
      data: patch,
      token,
      headers: { ...authHeaders(token), Prefer: 'return=representation' },
    }),
  )
}

export function deleteTransaction(id) {
  return authed((token) =>
    request({
      path: `/rest/v1/transactions?id=eq.${id}`,
      method: 'DELETE',
      token,
      headers: authHeaders(token),
    }),
  )
}

export function getSettings(userId) {
  return authed(async (token) => {
    const rows = await request({
      path: `/rest/v1/user_settings?select=*&user_id=eq.${userId}`,
      token,
      headers: authHeaders(token),
    })
    if (rows && rows.length) return rows[0]
    // 首次使用：云端建默认设置
    const created = await request({
      path: '/rest/v1/user_settings?on_conflict=user_id',
      method: 'POST',
      data: { user_id: userId },
      token,
      headers: { ...authHeaders(token), Prefer: 'resolution=merge-duplicates,return=representation' },
    })
    return created[0]
  })
}

export function saveSettings(payload) {
  return authed((token) =>
    request({
      path: '/rest/v1/user_settings?on_conflict=user_id',
      method: 'POST',
      data: payload,
      token,
      headers: { ...authHeaders(token), Prefer: 'resolution=merge-duplicates,return=representation' },
    }),
  )
}
