<template>
  <BaseChart
    :data="chartData"
    :options="mergedOptions"
    type="doughnut"
    :responsive="responsive"
    :maintain-aspect-ratio="maintainAspectRatio"
    :width="width"
    :height="height"
    :loading="loading"
    @error="handleError"
    @ready="handleReady"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import type { ChartData, ChartOptions } from 'chart.js'

interface Props {
  data: ChartData<'doughnut'>
  options?: ChartOptions<'doughnut'>
  responsive?: boolean
  maintainAspectRatio?: boolean
  width?: number
  height?: number
  loading?: boolean
  animate?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  cutout?: number | string
  centerText?: string
  centerColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  responsive: false,
  maintainAspectRatio: false,
  animate: true,
  showLegend: true,
  showTooltip: true,
  cutout: '60%',
  centerColor: '#374151'
})

const emit = defineEmits<{
  error: [error: Error]
  ready: [chart: any]
  sliceClick: [index: number, data: any]
  legendClick: [label: string, index: number]
}>()

// 合并配置
const mergedOptions = computed((): ChartOptions<'doughnut'> => ({
  animation: props.animate ? {
    animateRotate: true,
    animateScale: true,
    duration: 1000
  } : false,
  cutout: props.cutout,
  plugins: {
    legend: props.showLegend ? {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          size: 12
        },
        generateLabels: (chart) => {
          const data = chart.data
          if (data.labels && data.datasets.length > 0) {
            const dataset = data.datasets[0]
            return data.labels.map((label, i) => {
              const value = dataset.data[i] as number
              const total = (dataset.data as number[]).reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor?.[i] as string || '#999',
                strokeStyle: dataset.borderColor?.[i] as string || '#fff',
                lineWidth: dataset.borderWidth?.[i] as number || 1,
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      },
      onClick: (event, legendItem, legend) => {
        emit('legendClick', legendItem.text, legendItem.index)
      }
    } : { display: false },
    tooltip: props.showTooltip ? {
      callbacks: {
        label: (context) => {
          const dataset = context.dataset
          const total = (dataset.data as number[]).reduce((a, b) => a + b, 0)
          const value = context.raw as number
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    } : { enabled: false }
  },
  onHover: (event, activeElements) => {
    if (event.native?.target instanceof HTMLCanvasElement) {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default'
    }
  },
  onClick: (event, activeElements) => {
    if (activeElements.length > 0) {
      const elementIndex = activeElements[0].index
      const chartData = props.data
      emit('sliceClick', elementIndex, chartData)
    }
  },
  ...props.options
}))

// Chart.js数据
const chartData = computed(() => props.data)

const handleError = (error: Error) => {
  emit('error', error)
}

const handleReady = (chart: any) => {
  emit('ready', chart)
}
</script>

<style scoped>
/* DoughnutChart样式由BaseChart处理 */
</style>