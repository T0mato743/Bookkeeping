import { Component } from 'react'

// 渲染兜底：任何组件崩溃时显示错误提示而不是白屏
export default class ErrorBoundary extends Component {
  state = { err: null }

  static getDerivedStateFromError(err) {
    return { err }
  }

  render() {
    if (this.state.err) {
      return (
        <div className="card crash-card">
          <h2>⚠️ 页面渲染出错了</h2>
          <p className="crash-msg">{String(this.state.err?.message || this.state.err)}</p>
          <p className="sum-hint">你的数据安全地存在云端，刷新即可恢复。</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
