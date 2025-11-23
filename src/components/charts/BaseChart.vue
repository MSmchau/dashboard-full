<template>
  <div class="chart-wrapper" :style="wrapperStyle">
    <canvas 
      ref="chartCanvas" 
      :style="canvasStyle"
      @error="handleCanvasError"
    ></canvas>
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    <div v-if="error" class="chart-error">
      <i class="icon-warning"></i>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js'
// 移除响应式相关导入

// 注册Chart.js组件
Chart.register(...registerables)

interface Props {
  data: any
  options?: any
  type: ChartType
  responsive?: boolean
  maintainAspectRatio?: boolean
  width?: number
  height?: number
  loading?: boolean
  autoResize?: boolean
  minWidth?: number
  minHeight?: number
  aspectRatio?: number
}

const props = withDefaults(defineProps<Props>(), {
  responsive: false,
  maintainAspectRatio: false,
  loading: false,
  autoResize: false,
  width: 400,
  height: 300,
  aspectRatio: 4/3
})

const emit = defineEmits<{
  error: [error: Error]
  ready: [chart: Chart]
  destroy: []
  resize: [width: number, height: number]
}>()

const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null
const error = ref<string | null>(null)

// 移除响应式相关逻辑，使用固定尺寸
const wrapperStyle = computed(() => {
  return {
    position: 'relative',
    width: `${props.width || 400}px`,
    height: `${props.height || 300}px`
  }
})

const canvasStyle = computed(() => {
  return {
    width: '100%',
    height: '100%'
  }
})

const createChart = async () => {
  if (!chartCanvas.value || !props.data) return

  try {
    error.value = null
    
    // 移除响应式配置，使用固定配置
    const chartOptions = {
      responsive: false,
      maintainAspectRatio: props.maintainAspectRatio,
      aspectRatio: props.aspectRatio,
      devicePixelRatio: window.devicePixelRatio || 1,
      ...props.options
    }

    const chartConfig: ChartConfiguration = {
      type: props.type,
      data: props.data,
      options: chartOptions
    }

    chartInstance = new Chart(chartCanvas.value, chartConfig)
    emit('ready', chartInstance)
    emit('resize', props.width || 400, props.height || 300)

  } catch (err) {
    console.error('Chart creation error:', err)
    error.value = '图表创建失败'
    emit('error', err as Error)
  }
}

const updateChart = () => {
  if (!chartInstance || !props.data) return

  try {
    // 更新数据
    chartInstance.data = props.data
    
    // 更新配置
    if (props.options) {
      chartInstance.options = { 
        ...chartInstance.options, 
        ...props.options
      }
    }
    
    // 移除响应式更新
    chartInstance.update('active')
    emit('resize', props.width || 400, props.height || 300)
  } catch (err) {
    console.error('Chart update error:', err)
    error.value = '图表更新失败'
    emit('error', err as Error)
  }
}

const handleCanvasError = (event: Event) => {
  const target = event.target as HTMLCanvasElement
  error.value = 'Canvas渲染失败'
  console.error('Canvas error:', target)
}

const destroyChart = () => {
  if (chartInstance) {
    try {
      chartInstance.destroy()
      chartInstance = null
      emit('destroy')
    } catch (err) {
      console.error('Chart destruction error:', err)
    }
  }
}

// 监听数据变化
watch(() => props.data, () => {
  if (chartInstance) {
    updateChart()
  } else {
    createChart()
  }
}, { deep: true })

watch(() => props.options, () => {
  if (chartInstance && props.options) {
    chartInstance.options = { ...chartInstance.options, ...props.options }
    chartInstance.update('active')
  }
}, { deep: true })

// 移除响应式监听器
// const handleResize = () => {
//   if (props.autoResize) {
//     calculateSize()
//     if (chartInstance) {
//       chartInstance.resize(chartSize.value.width, chartSize.value.height)
//       emit('resize', chartSize.value.width, chartSize.value.height)
//     }
//   }
// }

onMounted(async () => {
  await nextTick()
  createChart()
  // 移除响应式监听器
})

onUnmounted(() => {
  destroyChart()
  // 移除响应式事件监听
})

// 暴露方法给父组件
defineExpose({
  chartInstance,
  updateChart,
  resize: () => {} // 移除响应式尺寸计算
})
</script>

<style scoped>
.chart-wrapper {
  @apply relative;
}

.chart-loading {
  @apply absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75;
}

.loading-spinner {
  @apply w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2;
}

.chart-loading p {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.chart-error {
  @apply absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400;
}

.chart-error i {
  @apply text-2xl mb-2;
}

.chart-error p {
  @apply text-sm;
}
</style>