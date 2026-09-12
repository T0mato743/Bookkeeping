import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  MarkLineComponent, TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart, PieChart, BarChart,
  GridComponent, TooltipComponent, LegendComponent,
  MarkLineComponent, TitleComponent,
  CanvasRenderer,
])

// ECharts 容器：初始化 / 自适应尺寸 / 数据变化时更新 / 卸载时销毁
export default function EChart({ option, height = 260, className = '' }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    if (chartRef.current && option) chartRef.current.setOption(option, true)
  }, [option])

  return <div ref={ref} className={`echart-box ${className}`} style={{ height }} />
}

export { echarts }

// 图表在亮/暗主题下的公共配色
export function chartPalette(dark) {
  return dark
    ? {
        axisLabel: '#8fa0b0',
        axisLine: '#26333f',
        splitLine: '#223040',
        tooltipBg: '#1b2835',
        tooltipBorder: '#26333f',
        tooltipText: '#dbe4ec',
        legendText: '#c6d0da',
        centerText: '#dbe4ec',
        centerSub: '#8fa0b0',
        pieBorder: '#16212c',
        barPast: '#2f6b64',
      }
    : {
        axisLabel: '#9ca3af',
        axisLine: '#e6e9ee',
        splitLine: '#eef0f4',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e6e9ee',
        tooltipText: '#16232e',
        legendText: '#37474f',
        centerText: '#16232e',
        centerSub: '#7b8794',
        pieBorder: '#ffffff',
        barPast: '#9fc7c2',
      }
}

// 金额简写：1.2万 / 3,450
export function shortMoney(v) {
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + '万'
  return Number(v).toLocaleString('zh-CN')
}
