import { useMemo } from 'react'
import { weeklyExpense, weeklyInsights } from '../utils'
import EChart, { shortMoney, chartPalette } from './EChart'
import { useTheme } from '../theme'

// 趋势周报：最近 8 周支出柱状图 + 简要结论
export default function WeeklyTrend({ transactions }) {
  const { theme } = useTheme()

  const { lines, option } = useMemo(() => {
    const weekly = weeklyExpense(transactions, 8)
    const lines = weeklyInsights(weekly)
    const p = chartPalette(theme === 'dark')
    const option = {
      grid: { left: 6, right: 8, top: 22, bottom: 2, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: p.tooltipBg,
        borderColor: p.tooltipBorder,
        textStyle: { color: p.tooltipText },
        valueFormatter: (v) => '¥' + Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 }),
      },
      xAxis: {
        type: 'category',
        data: weekly.map((w) => w.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: p.axisLine } },
        axisLabel: { color: p.axisLabel, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: p.axisLabel, formatter: shortMoney },
        splitLine: { lineStyle: { color: p.splitLine } },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 30,
          data: weekly.map((w, i) => ({
            value: Number(w.expense.toFixed(2)),
            itemStyle: {
              color: i === weekly.length - 1 ? '#0f766e' : p.barPast,
              borderRadius: [5, 5, 0, 0],
            },
          })),
        },
      ],
    }
    return { lines, option }
  }, [transactions, theme])

  return (
    <section className="card c-weekly">
      <div className="card-head">
        <h2>趋势周报</h2>
        <span className="card-tag">最近 8 周</span>
      </div>
      <EChart option={option} height={220} />
      <ul className="trend-lines">
        {lines.map((l) => <li key={l}><i className="ri-arrow-right-s-line tl-ic" />{l}</li>)}
      </ul>
    </section>
  )
}
