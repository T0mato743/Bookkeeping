import { useMemo } from 'react'
import { currentMonth, categoryBreakdown, fmtMoney } from '../utils'
import EChart, { chartPalette } from './EChart'
import { useTheme } from '../theme'

// 本月支出分类环形图
export default function CategoryPie({ transactions, month = 'all' }) {
  const { theme } = useTheme()

  const option = useMemo(() => {
    const data = categoryBreakdown(transactions, month)
    if (!data.length) return null
    const p = chartPalette(theme === 'dark')
    const total = data.reduce((s, d) => s + d.total, 0)

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: p.tooltipBg,
        borderColor: p.tooltipBorder,
        textStyle: { color: p.tooltipText },
        formatter: (item) => `${item.marker}${item.name}<br/>¥${Number(item.value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}（${item.percent}%）`,
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 10,
        textStyle: { color: p.legendText, fontSize: 12 },
        formatter: (name) => {
          const d = data.find((x) => x.category === name)
          return `${name}  ${d ? d.pct.toFixed(0) : 0}%`
        },
      },
      title: {
        text: fmtMoney(total, 0),
        subtext: '本月支出',
        left: '27%',
        top: '40%',
        textAlign: 'center',
        textStyle: { fontSize: 15, fontWeight: 700, color: p.centerText },
        subtextStyle: { fontSize: 11, color: p.centerSub },
      },
      series: [
        {
          type: 'pie',
          radius: ['56%', '80%'],
          center: ['30%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          emphasis: { scaleSize: 4 },
          itemStyle: { borderRadius: 4, borderColor: p.pieBorder, borderWidth: 2 },
          data: data.map((d) => ({
            name: d.category,
            value: d.total,
            itemStyle: { color: d.color },
          })),
        },
      ],
    }
  }, [transactions, month, theme])

  return (
    <section className="card c-pie">
      <div className="card-head">
        <h2>分类占比</h2>
        <span className="card-tag">{month === 'all' ? '全部月份' : month}</span>
      </div>
      {!option ? (
        <div className="empty">这个月还没有支出记录</div>
      ) : (
        <EChart option={option} height={230} />
      )}
    </section>
  )
}
