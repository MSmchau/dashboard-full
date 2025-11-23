<template>
  <BaseChart
    :data="chartData"
    :options="mergedOptions"
    type="bar"
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
  data: ChartData<'bar'>
  options?: ChartOptions<'bar'>
  responsive?: boolean
  maintainAspectRatio?: boolean
  width?: number
  height?: number
  loading?: boolean
  animate?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  orientation?: 'horizontal' | 'vertical'
  stacked?: boolean
  barThickness?: number | 'flex'
}

const props = withDefaults(defineProps<Props>(), {
  responsive: false,
  maintainAspectRatio: false,
  animate: true,
  showLegend: true,
  showTooltip: true,
  showGrid: true,
  orientation: 'vertical',
  stacked: false,
  barThickness: 'flex'
})

const emit = defineEmits<{
  error: [error: Error]
  ready: [chart: any]
  barClick: [index: number, data: any]
  legendClick: [label: string, index: number]
}>()

// 合并配置
const mergedOptions = computed((): ChartOptions<'bar'> => ({
  animation: props.animate ? {
    duration: 1000,
    easing: 'easeInOutQuart'
  } : false,
  indexAxis: props.orientation === 'horizontal' ? 'y' : 'x',
  plugins: {
    legend: props.showLegend ? {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12
        }
      },
      onClick: (event, legendItem, legend) => {
        emit('legendClick', legendItem.text, legendItem.index)
      }
    } : { display: false },
    tooltip: props.showTooltip ? {
      callbacks: {
        title: (context) => {
          if (props.orientation === 'horizontal') {
            return `分类: ${context[0].label}`
          }
          return context[0].label
        },
        label: (context) => {
          const value = context.parsed
          const unit = context.dataset.unit || ''
          const label = context.dataset.label || ''
          return `${label}: ${value}${unit}`
        }
      }
    } : { enabled: false }
  },
  scales: {
    x: {
      stacked: props.stacked,
      display: true,
      grid: props.showGrid ? {
        display: true,
        color: 'rgba(0,0,0,0.1)'
      } : { display: false },
      ticks: {
        font: {
          size: 10
        }
      }
    },
    y: {
      stacked: props.stacked,
      display: true,
      beginAtZero: true,
      grid: props.showGrid ? {
        display: true,
        color: 'rgba(0,0,0,0.1)'
      } : { display: false },
      ticks: {
        font: {
          size: 10
        },
        callback: function(value) {
          const numValue = value as number
          if (numValue >= 1000000) {
            return (numValue / 1000000).toFixed(1) + 'M'
          } else if (numValue >= 1000) {
            return (numValue / 1000).toFixed(1) + 'K'
          }
          return numValue.toString()
        }
      }
    }
  },
  onHover: (event, activeElements) => {
    if (event.native?.target instanceof HTMLCanvasElement) {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default'
    }
  },
  onClick: (event, activeElements) => {
    if (activeElements.length > 0) {
      const elementIndex = activeElements[0].index
      const datasetIndex = activeElements[0].datasetIndex
      const value = props.data.datasets[datasetIndex].data[elementIndex]
      emit('barClick', elementIndex, { dataset: datasetIndex, value, index: elementIndex })
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
/* BarChart样式由BaseChart处理 */
</style>