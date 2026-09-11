App({
  globalData: {
    userId: '',
    email: '',
  },
  onLaunch() {
    const api = require('./utils/api')
    if (api.isLoggedIn()) {
      const a = api.getAuth()
      this.globalData.userId = a.user_id
      this.globalData.email = a.email
    }
  },
})
