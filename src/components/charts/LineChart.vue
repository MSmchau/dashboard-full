<template>
  <BaseChart
    :data="chartData"
    :options="mergedOptions"
    type="line"
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
  data: ChartData<'line'>
  options?: ChartOptions<'line'>
  responsive?: boolean
  maintainAspectRatio?: boolean
  width?: number
  height?: number
  loading?: boolean
  animate?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  tension?: number
  fill?: boolean | string | { target: string; above?: string; below?: string }
}

const props = withDefaults(defineProps<Props>(), {
  responsive: false,
  maintainAspectRatio: false,
  animate: true,
  showLegend: true,
  showTooltip: true,
  showGrid: true,
  tension: 0.4,
  fill: true
})

const emit = defineEmits<{
  error: [error: Error]
  ready: [chart: any]
  pointClick: [index: number, data: any]
  legendClick: [label: string, index: number]
}>()

// 合并配置
const mergedOptions = computed((): ChartOptions<'line'> => ({
  animation: props.animate ? {
    duration: 1000,
    easing: 'easeInOutQuart'
  } : false,
  interaction: {
    intersect: false,
    mode: 'index'
  },
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
      mode: 'index',
      intersect: false,
      callbacks: {
        title: (context) => {
          return `时间: ${context[0].label}`
        },
        label: (context) => {
          const value = context.parsed.y
          const unit = context.dataset.unit || ''
          return `${context.dataset.label}: ${value}${unit}`
        }
      }
    } : { enabled: false }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: '时间',
        font: {
          size: 12
        }
      },
      grid: props.showGrid ? {
        display: true,
        color: 'rgba(0,0,0,0.1)'
      } : { display: false },
      ticks: {
        maxTicksLimit: 10,
        font: {
          size: 10
        }
      }
    },
    y: {
      display: true,
      beginAtZero: true,
      title: {
        display: true,
        text: '数值',
        font: {
          size: 12
        }
      },
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
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
      hoverBorderWidth: 3
    },
    line: {
      tension: props.tension,
      borderWidth: 2,
      fill: props.fill
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
      const point = props.data.datasets[datasetIndex].data[elementIndex]
      emit('pointClick', elementIndex, { dataset: datasetIndex, point, index: elementIndex })
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
/* LineChart样式由BaseChart处理 */
</style>