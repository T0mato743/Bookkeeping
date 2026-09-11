const api = require('../../utils/api')
const {
  monthSummary, totalBalance, avgMonthlyExpense, monthlyCumulative,
  currentMonth, fmtMoney,
} = require('../../utils/calc')

Page({
  data: {
    err: '',
    income: '¥0', fixed: '¥0', flexible: '¥0', balance: '¥0',
    fundPct: 0, fundText: '', safetyPct: 0, safetyText: '',
    totalText: '¥0',
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
      const m = monthSummary(txs, currentMonth())
      const total = totalBalance(txs)
      const avgExp = avgMonthlyExpense(txs)
      const cushion = avgExp > 0 ? total / avgExp : null
      const ft = Number(settings.freedom_target) || 0
      const st = Number(settings.safety_target) || 0
      this.setData({
        err: '',
        income: fmtMoney(m.income, 0),
        fixed: fmtMoney(m.fixed, 0),
        flexible: fmtMoney(m.flexible, 0),
        balance: fmtMoney(m.balance, 0),
        totalText: fmtMoney(total, 0),
        fundPct: ft > 0 ? Math.min(100, (total / ft) * 100) : 0,
        fundText: ft > 0 ? fmtMoney(total, 0) + ' / ' + fmtMoney(ft, 0) : '',
        safetyPct: st > 0 ? Math.min(100, (total / st) * 100) : 0,
        safetyText: cushion == null ? '' : `可撑 ${cushion.toFixed(1)} 个月 · ` + fmtMoney(total, 0) + ' / ' + fmtMoney(st, 0),
      })
      this.drawChart(txs, settings)
    } catch (e) {
      this.setData({ err: '加载失败：' + e.message })
    }
  },

  // 原生 canvas 画每月累计结余曲线
  drawChart(txs, settings) {
    const series = monthlyCumulative(txs)
    const query = wx.createSelectorQuery()
    query.select('#chart').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)
      const W = res[0].width
      const H = res[0].height
      ctx.clearRect(0, 0, W, H)
      if (!series.length) return

      const pad = { l: 46, r: 10, t: 14, b: 22 }
      const ft = Number(settings.freedom_target) || 0
      const maxVal = Math.max(ft, ...series.map((s) => s.balance), 1) * 1.08
      const minVal = Math.min(0, ...series.map((s) => s.balance)) * 1.1
      const span = maxVal - minVal || 1
      const iw = W - pad.l - pad.r
      const ih = H - pad.t - pad.b
      const x = (i) => pad.l + (series.length === 1 ? iw / 2 : (i * iw) / (series.length - 1))
      const y = (v) => pad.t + ih - ((v - minVal) / span) * ih

      // 网格
      ctx.strokeStyle = '#e6e9ee'
      ctx.fillStyle = '#9ca3af'
      ctx.font = '10px sans-serif'
      ctx.lineWidth = 1
      for (let k = 0; k <= 3; k++) {
        const v = minVal + (span * k) / 3
        const yy = y(v)
        ctx.beginPath()
        ctx.moveTo(pad.l, yy)
        ctx.lineTo(W - pad.r, yy)
        ctx.stroke()
        ctx.fillText('¥' + Math.round(v).toLocaleString('zh-CN'), 2, yy + 3)
      }
      // 目标线
      if (ft > 0) {
        ctx.strokeStyle = '#d97706'
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(pad.l, y(ft))
        ctx.lineTo(W - pad.r, y(ft))
        ctx.stroke()
        ctx.setLineDash([])
      }
      // 曲线
      ctx.strokeStyle = '#0f766e'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.beginPath()
      series.forEach((s, i) => {
        if (i === 0) ctx.moveTo(x(i), y(s.balance))
        else ctx.lineTo(x(i), y(s.balance))
      })
      ctx.stroke()
      // 点
      ctx.fillStyle = '#0f766e'
      series.forEach((s, i) => {
        ctx.beginPath()
        ctx.arc(x(i), y(s.balance), 3, 0, Math.PI * 2)
        ctx.fill()
      })
      // X 轴标签
      const step = Math.max(1, Math.ceil(series.length / 6))
      ctx.fillStyle = '#9ca3af'
      series.forEach((s, i) => {
        if (i % step === 0 || i === series.length - 1) {
          ctx.fillText(Number(s.month.slice(5)) + '月', x(i) - 8, H - 6)
        }
      })
    })
  },
})
