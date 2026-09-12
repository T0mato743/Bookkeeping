import { useMemo } from 'react'
import { monthlyCumulative } from '../utils'
import EChart, { echarts, shortMoney } from './EChart'

// 存款曲线：每月累计结余 + 自由基金目标线 + 安全垫线
export default function SavingsChart({ transactions, settings }) {
  const option = useMemo(() => {
    const series = monthlyCumulative(transactions)
    if (!series.length) return null
    const freedom = Number(settings.freedom_target) || 0
    const safety = Number(settings.safety_target) || 0

    return {
      grid: { left: 6, right: 14, top: 30, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => '¥' + Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 }),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: series.map((s) => s.month),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e6e9ee' } },
        axisLabel: { color: '#9ca3af', formatter: (m) => `${Number(m.slice(0, 4)) % 100}/${Number(m.slice(5))}` },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9ca3af', formatter: shortMoney },
        splitLine: { lineStyle: { color: '#eef0f4' } },
      },
      series: [
        {
          name: '累计结余',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: series.map((s) => Number(s.balance.toFixed(2))),
          lineStyle: { width: 2.5, color: '#0f766e' },
          itemStyle: { color: '#0f766e' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(15, 118, 110, 0.22)' },
              { offset: 1, color: 'rgba(15, 118, 110, 0.02)' },
            ]),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              freedom > 0 && {
                yAxis: freedom,
                lineStyle: { type: 'dashed', color: '#d97706' },
                label: { formatter: '自由基金目标', color: '#d97706', position: 'insideEndTop' },
              },
              safety > 0 && {
                yAxis: safety,
                lineStyle: { type: 'dashed', color: '#10b981' },
                label: { formatter: '安全垫', color: '#10b981', position: 'insideEndTop' },
              },
            ].filter(Boolean),
          },
        },
      ],
    }
  }, [transactions, settings])

  return (
    <section className="card c-chart">
      <div className="card-head">
        <h2>存款曲线</h2>
        <span className="card-tag">按月累计</span>
      </div>
      {!option ? (
        <div className="empty">记几笔账，这里会长出你的曲线</div>
      ) : (
        <EChart option={option} height={280} />
      )}
    </section>
  )
}
