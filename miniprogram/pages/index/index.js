const api = require('../../utils/api')
const {
  computeRealHourly, fmtMoney, todayStr, catIcon,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, monthSummary, totalBalance, currentMonth,
} = require('../../utils/calc')

Page({
  data: {
    ready: false,
    err: '',
    rate: 0,
    rateText: '¥0.00',
    balanceText: '¥0',
    kind: 'expense',
    amount: '',
    category: '餐饮',
    note: '',
    cats: [],
    catsWithIcon: [],
    recent: [],
    saving: false,
    savedText: '',
  },

  onShow() {
    if (!api.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.load()
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh())
  },

  async load() {
    try {
      const a = api.getAuth()
      const [txs, settings] = await Promise.all([
        api.listTransactions(),
        api.getSettings(a.user_id),
      ])
      const calc = computeRealHourly(settings)
      const m = monthSummary(txs, currentMonth())
      this.setData({
        ready: true,
        err: '',
        rate: calc.rate,
        rateText: fmtMoney(calc.rate),
        balanceText: fmtMoney(m.balance, 0),
        cats: this.data.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES,
        catsWithIcon: (this.data.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => ({ name: c, icon: catIcon(c) })),
        recent: txs.slice(0, 10).map((t) => ({
          ...t,
          icon: catIcon(t.category),
          sign: t.kind === 'income' ? '+' : '−',
          amountText: fmtMoney(t.amount),
          dateText: (t.occurred_at || '').slice(5).replace('-', '/'),
        })),
      })
      this._txs = txs
      this._settings = settings
    } catch (e) {
      this.setData({ ready: true, err: '加载失败：' + e.message + '，下拉重试' })
    }
  },

  setKind(e) {
    const kind = e.currentTarget.dataset.kind
    const cats = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    this.setData({
      kind,
      cats,
      catsWithIcon: cats.map((c) => ({ name: c, icon: catIcon(c) })),
      category: kind === 'expense' ? '餐饮' : '工资',
    })
  },

  setCat(e) { this.setData({ category: e.currentTarget.dataset.name }) },
  onAmount(e) { this.setData({ amount: e.detail.value }) },
  onNote(e) { this.setData({ note: e.detail.value }) },

  async save() {
    if (this.data.saving) return
    const amt = Number(this.data.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      wx.showToast({ title: '金额要大于 0', icon: 'none' })
      return
    }
    const a = api.getAuth()
    const payload = {
      user_id: a.user_id,
      kind: this.data.kind,
      amount: amt,
      category: this.data.category,
      note: this.data.note.trim(),
      occurred_at: todayStr(),
    }
    this.setData({ saving: true })
    try {
      const row = await api.addTransaction(payload)
      const list = Array.isArray(row) ? row[0] : row
      this._txs = [list, ...(this._txs || [])]
      const conv = this.data.rate > 0 ? ` ≈ ${(amt / this.data.rate).toFixed(1)} 小时` : ''
      wx.showToast({ title: `${this.data.kind === 'expense' ? '−' : '+'}${fmtMoney(amt)}${conv}`, icon: 'none' })
      this.setData({
        amount: '',
        note: '',
        saving: false,
        savedText: 'ok',
        recent: [this.decorate(list), ...this.data.recent].slice(0, 10),
      })
      setTimeout(() => this.setData({ savedText: '' }), 2000)
    } catch (e) {
      this.setData({ saving: false })
      wx.showModal({ title: '保存失败', content: e.message + '，重试？', cancelText: '取消', confirmText: '重试', success: (r) => { if (r.confirm) this.save() } })
    }
  },

  decorate(t) {
    return {
      ...t,
      icon: catIcon(t.category),
      sign: t.kind === 'income' ? '+' : '−',
      amountText: fmtMoney(t.amount),
      dateText: (t.occurred_at || '').slice(5).replace('-', '/'),
    }
  },

  async del(e) {
    const id = e.currentTarget.dataset.id
    try {
      await api.deleteTransaction(id)
      this._txs = (this._txs || []).filter((t) => t.id !== id)
      this.setData({ recent: this.data.recent.filter((t) => t.id !== id) })
    } catch (err) {
      wx.showToast({ title: '删除失败：' + err.message, icon: 'none' })
    }
  },
})
