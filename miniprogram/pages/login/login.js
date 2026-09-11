const api = require('../../utils/api')

Page({
  data: {
    mode: 'login',
    email: '',
    password: '',
    busy: false,
    err: '',
    notice: '',
  },

  onInputEmail(e) { this.setData({ email: e.detail.value, err: '' }) },
  onInputPwd(e) { this.setData({ password: e.detail.value, err: '' }) },
  setMode(e) { this.setData({ mode: e.currentTarget.dataset.mode, err: '', notice: '' }) },

  async submit() {
    if (this.data.busy) return
    const email = this.data.email.trim()
    const pwd = this.data.password
    if (!email || pwd.length < 6) {
      this.setData({ err: '请输入邮箱和至少 6 位密码' })
      return
    }
    this.setData({ busy: true, err: '', notice: '' })
    try {
      if (this.data.mode === 'login') {
        await api.signIn(email, pwd)
      } else {
        const res = await api.signUp(email, pwd)
        if (!res.access_token) {
          this.setData({ busy: false, notice: '注册成功，请到邮箱点确认链接后再登录' })
          return
        }
      }
      const app = getApp()
      const a = api.getAuth()
      app.globalData.userId = a.user_id
      app.globalData.email = a.email
      wx.switchTab({ url: '/pages/index/index' })
    } catch (e) {
      this.setData({ err: e.message })
    } finally {
      this.setData({ busy: false })
    }
  },
})
