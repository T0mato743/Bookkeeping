const api = require('../../utils/api')
const { computeRealHourly, fmtMoney } = require('../../utils/calc')

const FIELDS = [
  { key: 'net_monthly', label: '到手月薪 (¥)', type: 'digit' },
  { key: 'pay_months', label: '发薪月数', type: 'digit' },
  { key: 'monthly_cost', label: '月工作成本 (¥)', type: 'digit' },
  { key: 'work_days', label: '每月工作日', type: 'digit' },
  { key: 'onsite_hours', label: '每日在场小时', type: 'digit' },
  { key: 'commute_min', label: '单程通勤 (分钟)', type: 'number' },
  { key: 'overtime_hours', label: '每日加班小时', type: 'digit' },
  { key: 'freedom_target', label: '自由基金目标 (¥)', type: 'digit' },
  { key: 'safety_target', label: '安全垫目标 (¥)', type: 'digit' },
]

Page({
  data: {
    err: '',
    form: [],
    rateText: '¥0.00',
    email: '',
    saving: false,
  },

  onShow() {
    if (!api.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const a = api.getAuth()
    this.setData({ email: a.email })
    this.load()
  },

  async load() {
    try {
      const a = api.getAuth()
      const s = await api.getSettings(a.user_id)
      this._settings = s
      this.setData({
        err: '',
        form: FIELDS.map((f) => ({ ...f, value: String(s[f.key] ?? '') })),
        rateText: fmtMoney(computeRealHourly(s).rate),
      })
    } catch (e) {
      this.setData({ err: '加载失败：' + e.message })
    }
  },

  onField(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const form = this.data.form.map((f, i) => (i === idx ? { ...f, value: e.detail.value } : f))
    const draft = { ...this._settings }
    form.forEach((f) => { draft[f.key] = Number(f.value) || 0 })
    this.setData({ form, rateText: fmtMoney(computeRealHourly(draft).rate) })
  },

  async save() {
    if (this.data.saving) return
    const a = api.getAuth()
    const payload = { user_id: a.user_id }
    this.data.form.forEach((f) => { payload[f.key] = Number(f.value) || 0 })
    this.setData({ saving: true })
    try {
      await api.saveSettings(payload)
      this.setData({ saving: false })
      wx.showToast({ title: '已保存并同步', icon: 'success' })
      this.load()
    } catch (e) {
      this.setData({ saving: false })
      wx.showModal({ title: '保存失败', content: e.message + '，重试？', cancelText: '取消', confirmText: '重试', success: (r) => { if (r.confirm) this.save() } })
    }
  },

  async logout() {
    await api.signOut()
    getApp().globalData.userId = ''
    wx.redirectTo({ url: '/pages/login/login' })
  },
})
