<template>
  <div class="gauge-chart" ref="gaugeChartRef">
    <div v-if="!data" class="gauge-empty">
      <div class="empty-icon">📊</div>
      <p>暂无仪表盘数据</p>
    </div>
    <div v-else class="gauge-container" :style="gaugeStyle">
      <!-- 多个仪表盘 -->
      <div 
        v-for="(metric, key) in displayMetrics" 
        :key="key"
        class="gauge-item"
        @click="handleGaugeClick(key)"
      >
        <div class="gauge-wrapper">
          <svg class="gauge-svg" :width="size" :height="size * 0.6">
            <!-- 背景圆弧 -->
            <path
              :d="getArcPath(0, 180, 0)"
              :stroke="trackColor"
              :stroke-width="strokeWidth"
              fill="none"
              stroke-linecap="round"
            />
            
            <!-- 进度圆弧 -->
            <path
              :d="getArcPath(0, Math.min(value, maxValue) / maxValue * 180, 0)"
              :stroke="getGaugeColor(metric.value)"
              :stroke-width="strokeWidth"
              fill="none"
              stroke-linecap="round"
              class="gauge-progress"
            />
            
            <!-- 指针 -->
            <g :transform="`translate(${size/2}, ${size*0.5})`">
              <line
                :x1="0"
                :y1="0"
                :x2="getPointerLength() * Math.cos(getAngle(metric.value) - Math.PI/2)"
                :y2="getPointerLength() * Math.sin(getAngle(metric.value) - Math.PI/2)"
                :stroke="pointerColor"
                :stroke-width="3"
                class="gauge-pointer"
              />
              <circle
                :cx="0"
                :cy="0"
                r="4"
                :fill="pointerColor"
              />
            </g>
          </svg>
          
          <!-- 数值显示 -->
          <div class="gauge-value">
            <span class="value-number">{{ formatValue(metric.value) }}</span>
            <span class="value-unit">{{ config.unit }}</span>
          </div>
          
          <!-- 标签 -->
          <div class="gauge-label">
            <span class="label-text">{{ getMetricLabel(key) }}</span>
            <span 
              class="status-indicator"
              :class="getStatusClass(metric.value)"
            >
              {{ getStatusText(metric.value) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 自动刷新控制 -->
    <div v-if="autoRefresh" class="gauge-controls">
      <div class="refresh-info">
        <span class="refresh-status" :class="{ active: refreshing }">
          <i class="icon-spinner" v-if="refreshing"></i>
          <i class="icon-pause" v-else></i>
        </span>
        <span class="refresh-text">
          {{ refreshing ? '刷新中...' : `每${refreshInterval/1000}秒自动刷新` }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface GaugeMetric {
  value: number
  timestamp?: number
  status?: 'normal' | 'warning' | 'critical' | 'error'
}

interface Props {
  data: Record<string, GaugeMetric>
  config: {
    minValue: number
    maxValue: number
    thresholds: number[]  // [70, 85, 95]
    colors: string[]      // ['#22c55e', '#f59e0b', '#ef4444', '#dc2626']
    unit: string
  }
  autoRefresh?: boolean
  refreshInterval?: number
  size?: number
  strokeWidth?: number
  trackColor?: string
  pointerColor?: string
  showValues?: boolean
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: false,
  refreshInterval: 5000,
  size: 120,
  strokeWidth: 8,
  trackColor: '#e5e7eb',
  pointerColor: '#374151',
  showValues: true,
  showStatus: true
})

const emit = defineEmits<{
  error: [error: Error]
  metricClick: [metric: string, value: number]
  refresh: [data: any]
}>()

const gaugeChartRef = ref<HTMLElement>()
const refreshing = ref(false)

const displayMetrics = computed(() => {
  if (!props.data) return {}
  
  const metrics: Record<string, GaugeMetric> = {}
  for (const [key, metric] of Object.entries(props.data)) {
    if (typeof metric === 'number') {
      metrics[key] = { value: metric, timestamp: Date.now() }
    } else if (typeof metric === 'object' && 'value' in metric) {
      metrics[key] = metric as GaugeMetric
    }
  }
  return metrics
})

const gaugeStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${props.size}px, 1fr))`,
  gap: '1.5rem',
  justifyItems: 'center'
}))

const maxValue = computed(() => props.config.maxValue)

const getMetricLabel = (key: string): string => {
  const labels: Record<string, string> = {
    cpuUsage: 'CPU使用率',
    memoryUsage: '内存使用率',
    diskUsage: '磁盘使用率',
    networkTraffic: '网络流量',
    uptime: '运行时间',
    responseTime: '响应时间',
    temperature: '温度',
    humidity: '湿度',
    pressure: '压力',
    throughput: '吞吐量',
    latency: '延迟',
    errors: '错误率'
  }
  return labels[key] || key
}

const formatValue = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1)
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1)
  }
  return value.toFixed(1)
}

const getAngle = (value: number): number => {
  const percentage = Math.min(value, maxValue.value) / maxValue.value
  return Math.PI * percentage // 0 到 π
}

const getGaugeColor = (value: number): string => {
  const percentage = (value / maxValue.value) * 100
  const { thresholds, colors } = props.config
  
  if (percentage <= thresholds[0]) {
    return colors[0] || '#22c55e'
  } else if (percentage <= thresholds[1]) {
    return colors[1] || '#f59e0b'
  } else if (percentage <= thresholds[2]) {
    return colors[2] || '#ef4444'
  } else {
    return colors[3] || '#dc2626'
  }
}

const getStatusClass = (value: number): string => {
  const percentage = (value / maxValue.value) * 100
  const { thresholds } = props.config
  
  if (percentage <= thresholds[0]) return 'status-normal'
  if (percentage <= thresholds[1]) return 'status-warning'
  if (percentage <= thresholds[2]) return 'status-critical'
  return 'status-error'
}

const getStatusText = (value: number): string => {
  const percentage = (value / maxValue.value) * 100
  const { thresholds } = props.config
  
  if (percentage <= thresholds[0]) return '正常'
  if (percentage <= thresholds[1]) return '警告'
  if (percentage <= thresholds[2]) return '严重'
  return '危险'
}

const getPointerLength = (): number => {
  return props.size * 0.3
}

const getArcPath = (startAngle: number, endAngle: number, offset: number = 0) => {
  const start = polarToCartesian(props.size/2, props.size*0.5, props.size * 0.3, endAngle)
  const end = polarToCartesian(props.size/2, props.size*0.5, props.size * 0.3, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  
  return [
    "M", start.x, start.y,
    "A", props.size * 0.3, props.size * 0.3, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ")
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  }
}

const handleGaugeClick = (metric: string) => {
  const metricData = displayMetrics.value[metric]
  if (metricData) {
    emit('metricClick', metric, metricData.value)
  }
}

const autoRefreshData = async () => {
  if (!props.autoRefresh) return
  
  try {
    refreshing.value = true
    emit('refresh', displayMetrics.value)
  } catch (error) {
    console.error('Auto refresh error:', error)
    emit('error', error as Error)
  } finally {
    refreshing.value = false
  }
}

let refreshIntervalId: NodeJS.Timeout | null = null

onMounted(async () => {
  await nextTick()
  
  if (props.autoRefresh) {
    refreshIntervalId = setInterval(autoRefreshData, props.refreshInterval)
  }
})

onUnmounted(() => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
  }
})

watch(() => props.autoRefresh, (newValue) => {
  if (newValue) {
    refreshIntervalId = setInterval(autoRefreshData, props.refreshInterval)
  } else if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
    refreshIntervalId = null
  }
})
</script>

<style scoped>
.gauge-chart {
  @apply w-full h-full p-4;
}

.gauge-empty {
  @apply flex flex-col items-center justify-center h-full text-gray-500;
}

.empty-icon {
  @apply text-4xl mb-4;
}

.gauge-container {
  @apply w-full;
}

.gauge-item {
  @apply cursor-pointer hover:transform hover:scale-105 transition-transform duration-200;
}

.gauge-wrapper {
  @apply flex flex-col items-center;
}

.gauge-svg {
  @apply relative;
}

.gauge-progress {
  @apply transition-all duration-300 ease-in-out;
}

.gauge-pointer {
  @apply transition-all duration-300 ease-in-out;
}

.gauge-value {
  @apply flex flex-col items-center mt-2;
}

.value-number {
  @apply text-2xl font-bold text-gray-900 dark:text-white;
}

.value-unit {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.gauge-label {
  @apply flex flex-col items-center mt-1;
}

.label-text {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.status-indicator {
  @apply text-xs px-2 py-1 rounded-full mt-1;
}

.status-normal {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.status-warning {
  @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200;
}

.status-critical {
  @apply bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200;
}

.status-error {
  @apply bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200;
}

.gauge-controls {
  @apply flex justify-center mt-4;
}

.refresh-info {
  @apply flex items-center space-x-2 text-sm text-gray-500;
}

.refresh-status {
  @apply flex items-center;
}

.refresh-status.active {
  @apply text-blue-500;
}

.refresh-text {
  @apply text-xs;
}

.icon-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .gauge-chart {
    @apply p-2;
  }
  
  .gauge-container {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  
  .value-number {
    @apply text-xl;
  }
}

/* 深色模式 */
.dark .gauge-svg {
  filter: brightness(1.1);
}

.dark .gauge-pointer {
  filter: brightness(1.2);
}
</style>