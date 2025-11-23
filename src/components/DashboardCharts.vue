<template>
  <div class="dashboard-charts" :class="chartClass">
    <!-- 图表容器 -->
    <div class="charts-grid" :style="gridStyle">
      <!-- 设备状态饼图 -->
      <div class="chart-container" :style="getContainerStyle('pie')">
        <div class="chart-header">
          <h3>{{ getChartTitle('deviceStatus') }}</h3>
          <div class="chart-controls">
            <button @click="refreshChart('deviceStatus')" :disabled="loading.deviceStatus">
              <i class="icon-refresh" :class="{ spinning: loading.deviceStatus }"></i>
            </button>
            <button @click="toggleFullscreen('deviceStatus')" title="全屏显示">
              <i class="icon-expand"></i>
            </button>
          </div>
        </div>
        <div class="chart-content" ref="deviceStatusChart">
          <ErrorBoundary
            :component-name="'PieChart'"
            :component-id="'deviceStatus'"
            :fallback-component="'DefaultErrorFallback'"
            @retry="retryChart('deviceStatus')"
            @report="reportChartError('deviceStatus', $event)"
          >
            <PieChart
              v-if="deviceStatusData.labels.length > 0"
              :data="deviceStatusData"
              :options="pieChartOptions"
              :responsive="false"
              @error="handleChartError('deviceStatus', $event)"
            />
            <EmptyState v-else :message="getEmptyMessage('deviceStatus')" />
          </ErrorBoundary>
        </div>
      </div>

      <!-- 性能趋势线图 -->
      <div class="chart-container" :style="getContainerStyle('line')">
        <div class="chart-header">
          <h3>{{ getChartTitle('performanceTrend') }}</h3>
          <div class="time-range-selector">
            <select v-model="performanceTrendTimeRange" @change="updatePerformanceTrendData">
              <option value="1h">最近1小时</option>
              <option value="6h">最近6小时</option>
              <option value="24h">最近24小时</option>
              <option value="7d">最近7天</option>
            </select>
          </div>
        </div>
        <div class="chart-content" ref="performanceTrendChart">
          <ErrorBoundary
            :component-name="'LineChart'"
            :component-id="'performanceTrend'"
            :fallback-component="'DefaultErrorFallback'"
            @retry="retryChart('performanceTrend')"
            @report="reportChartError('performanceTrend', $event)"
          >
            <LineChart
              v-if="performanceTrendData.datasets.length > 0"
              :data="performanceTrendData"
              :options="lineChartOptions"
              :responsive="false"
              @error="handleChartError('performanceTrend', $event)"
            />
            <EmptyState v-else :message="getEmptyMessage('performanceTrend')" />
          </ErrorBoundary>
        </div>
      </div>

      <!-- 资源使用柱状图 -->
      <div class="chart-container" :style="getContainerStyle('bar')">
        <div class="chart-header">
          <h3>{{ getChartTitle('resourceUsage') }}</h3>
          <div class="chart-controls">
            <button @click="refreshChart('resourceUsage')" :disabled="loading.resourceUsage">
              <i class="icon-refresh" :class="{ spinning: loading.resourceUsage }"></i>
            </button>
          </div>
        </div>
        <div class="chart-content" ref="resourceUsageChart">
          <ErrorBoundary
            :component-name="'BarChart'"
            :component-id="'resourceUsage'"
            :fallback-component="'DefaultErrorFallback'"
            @retry="retryChart('resourceUsage')"
            @report="reportChartError('resourceUsage', $event)"
          >
            <BarChart
              v-if="resourceUsageData.labels.length > 0"
              :data="resourceUsageData"
              :options="barChartOptions"
              :responsive="false"
              @error="handleChartError('resourceUsage', $event)"
            />
            <EmptyState v-else :message="getEmptyMessage('resourceUsage')" />
          </ErrorBoundary>
        </div>
      </div>

      <!-- 告警分布环形图 -->
      <div class="chart-container" :style="getContainerStyle('doughnut')">
        <div class="chart-header">
          <h3>{{ getChartTitle('alertDistribution') }}</h3>
          <div class="chart-controls">
            <button @click="refreshChart('alertDistribution')" :disabled="loading.alertDistribution">
              <i class="icon-refresh" :class="{ spinning: loading.alertDistribution }"></i>
            </button>
          </div>
        </div>
        <div class="chart-content" ref="alertDistributionChart">
          <ErrorBoundary
            :component-name="'DoughnutChart'"
            :component-id="'alertDistribution'"
            :fallback-component="'DefaultErrorFallback'"
            @retry="retryChart('alertDistribution')"
            @report="reportChartError('alertDistribution', $event)"
          >
            <DoughnutChart
              v-if="alertDistributionData.labels.length > 0"
              :data="alertDistributionData"
              :options="doughnutChartOptions"
              :responsive="false"
              @error="handleChartError('alertDistribution', $event)"
            />
            <EmptyState v-else :message="getEmptyMessage('alertDistribution')" />
          </ErrorBoundary>
        </div>
      </div>

      <!-- 设备列表表格 -->
      <div class="chart-container table-container" :style="getContainerStyle('table')">
        <div class="chart-header">
          <h3>{{ getChartTitle('deviceList') }}</h3>
          <div class="chart-controls">
            <button @click="refreshChart('deviceList')" :disabled="loading.deviceList">
              <i class="icon-refresh" :class="{ spinning: loading.deviceList }"></i>
            </button>
            <button @click="exportDeviceList" title="导出数据">
              <i class="icon-download"></i>
            </button>
          </div>
        </div>
        <div class="chart-content table-content">
          <ErrorBoundary
            :component-name="'DataTable'"
            :component-id="'deviceList'"
            :fallback-component="'DefaultErrorFallback'"
            @retry="retryChart('deviceList')"
            @report="reportChartError('deviceList', $event)"
          >
            <DataTable
              :data="deviceListData"
              :columns="deviceTableColumns"
              :loading="loading.deviceList"
              :error="errors.deviceList"
              @sort="handleSort"
              @filter="handleFilter"
              @error="handleTableError"
            />
          </ErrorBoundary>
        </div>
      </div>

      <!-- 实时指标仪表板 -->
      <div class="chart-container gauge-container" :style="getContainerStyle('gauge')">
        <div class="chart-header">
          <h3>{{ getChartTitle('realTimeMetrics') }}</h3>
          <div class="chart-controls">
            <button @click="toggleAutoRefresh" :class="{ active: autoRefresh }" :title="autoRefreshTitle">
              <i class="icon-pause" v-if="autoRefresh"></i>
              <i class="icon-play" v-else></i>
            </button>
          </div>
        </div>
        <div class="chart-content gauge-content">
          <ErrorBoundary
            :component-name="'GaugeChart'"
            :component-id="'realTimeMetrics'"
            :fallback-component="'DefaultErrorFallback'"
            @retry="retryChart('realTimeMetrics')"
            @report="reportChartError('realTimeMetrics', $event)"
          >
            <GaugeChart
              :data="gaugeMetricsData"
              :config="gaugeConfig"
              :auto-refresh="autoRefresh"
              :refresh-interval="refreshInterval"
              @error="handleChartError('realTimeMetrics', $event)"
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>

    <!-- 全屏显示模态框 -->
    <FullscreenModal
      v-if="fullscreenChart"
      :chart-type="fullscreenChart"
      :data="getFullscreenData"
      :options="getFullscreenOptions"
      @close="closeFullscreen"
    />

    <!-- 加载指示器 -->
    <LoadingOverlay v-if="globalLoading" :message="globalLoadingMessage" />

    <!-- 错误提示 -->
    <ErrorNotification
      v-if="showError"
      :error="currentError"
      @dismiss="dismissError"
      @retry="retryOperation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { api, type ApiResponse, type ApiError } from '@/services/api'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import { Chart, ChartType, registerables } from 'chart.js'
import BaseChart from './charts/BaseChart.vue'
import PieChart from './charts/PieChart.vue'
import LineChart from './charts/LineChart.vue'
import BarChart from './charts/BarChart.vue'
import DoughnutChart from './charts/DoughnutChart.vue'
import GaugeChart from './charts/GaugeChart.vue'
import ErrorBoundary from './ErrorBoundary.vue'

// 注册Chart.js组件
Chart.register(...registerables)

// 图表类型定义
interface ChartConfig {
  id: string
  type: ChartType
  title: string
  width: string
  height: string
}

interface Props {
  layout?: 'grid' | 'flex' | 'custom'
  responsive?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'grid',
  responsive: false,
  autoRefresh: true,
  refreshInterval: 30000
})

const emit = defineEmits<{
  'chart-error': [chartId: string, error: Error]
  'chart-ready': [chartId: string, chart: Chart]
  'data-updated': [chartId: string, data: any]
  'refresh-start': []
  'refresh-complete': []
}>()

// 错误和加载状态管理
const errors = ref<Record<string, Error>>({})
const loading = ref<Record<string, boolean>>({
  deviceStatus: false,
  performanceTrend: false,
  resourceUsage: false,
  alertDistribution: false,
  deviceList: false,
  realTimeMetrics: false
})

const isLoading = ref(false)
const isRefreshing = ref(false)
const error = ref<string | null>(null)
const refreshTimer = ref<NodeJS.Timeout>()

// 时间范围选择器
const performanceTrendTimeRange = ref('24h')

// 全屏显示
const fullscreenChart = ref<string | null>(null)

// 自动刷新配置
const autoRefresh = ref(props.autoRefresh)
const refreshInterval = props.refreshInterval

// 计算属性
const chartClass = computed(() => {
  return {
    'dashboard-charts-dark': true
  }
})

const gridStyle = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    height: '100%'
  }
})

const globalLoading = computed(() => {
  return Object.values(loading.value).some(l => l) || isLoading.value
})

const globalLoadingMessage = computed(() => {
  const loadingKeys = Object.entries(loading.value).filter(([_, l]) => l).map(([k, _]) => k)
  if (loadingKeys.length === 1) {
    const messages = {
      deviceStatus: '加载设备状态...',
      performanceTrend: '加载性能趋势...',
      resourceUsage: '加载资源使用...',
      alertDistribution: '加载告警分布...',
      deviceList: '加载设备列表...',
      realTimeMetrics: '加载实时指标...'
    }
    return messages[loadingKeys[0] as keyof typeof messages] || '加载中...'
  }
  return '加载所有数据...'
})

const getContainerStyle = (chartType: string) => {
  const styles = {
    deviceStatus: { gridColumn: 'span 1', gridRow: 'span 1' },
    performanceTrend: { gridColumn: 'span 2', gridRow: 'span 1' },
    resourceUsage: { gridColumn: 'span 1', gridRow: 'span 1' },
    alertDistribution: { gridColumn: 'span 1', gridRow: 'span 1' },
    deviceList: { gridColumn: 'span 2', gridRow: 'span 2' },
    realTimeMetrics: { gridColumn: 'span 1', gridRow: 'span 1' }
  }
  return styles[chartType as keyof typeof styles] || { gridColumn: 'span 1', gridRow: 'span 1' }
}

const getChartTitle = (chartId: string) => {
  const titles = {
    deviceStatus: '设备状态分布',
    performanceTrend: '性能趋势',
    resourceUsage: '资源使用情况',
    alertDistribution: '告警分布',
    deviceList: '设备列表',
    realTimeMetrics: '实时指标'
  }
  return titles[chartId as keyof typeof titles] || chartId
}

const getEmptyMessage = (chartId: string) => {
  const messages = {
    deviceStatus: '暂无设备状态数据',
    performanceTrend: '暂无性能数据',
    resourceUsage: '暂无资源使用数据',
    alertDistribution: '暂无告警数据',
    deviceList: '暂无设备列表数据',
    realTimeMetrics: '暂无实时指标数据'
  }
  return messages[chartId as keyof typeof messages] || '暂无数据'
}

const getFullscreenData = computed(() => {
  if (!fullscreenChart.value) return null
  
  const dataMap = {
    deviceStatus: deviceStatusData.value,
    performanceTrend: performanceData.value,
    resourceUsage: usageData.value,
    alertDistribution: distributionData.value,
    deviceList: [], // 表格数据
    realTimeMetrics: systemLoadData.value
  }
  
  return dataMap[fullscreenChart.value as keyof typeof dataMap]
})

const getFullscreenOptions = computed(() => {
  const optionsMap = {
    deviceStatus: pieChartOptions.value,
    performanceTrend: lineChartOptions.value,
    resourceUsage: barChartOptions.value,
    alertDistribution: doughnutChartOptions.value,
    deviceList: {},
    realTimeMetrics: {}
  }
  
  return optionsMap[fullscreenChart.value as keyof typeof optionsMap] || {}
})

// 错误状态
const showError = computed(() => {
  return Object.keys(errors.value).length > 0 || error.value
})

const currentError = computed(() => {
  if (error.value) return error.value
  const firstError = Object.values(errors.value)[0]
  return firstError?.message || '未知错误'
})

const autoRefreshTitle = computed(() => {
  return autoRefresh.value ? '停止自动刷新' : '开始自动刷新'
})

// 错误边界相关方法
const retryChart = async (chartId: string) => {
  loading.value[chartId] = true
  delete errors.value[chartId]
  
  try {
    const chartData = await loadChartData(chartId)
    updateChartData(chartId, chartData)
    emit('data-updated', chartId, chartData)
  } catch (err) {
    console.error(`Retry chart ${chartId} error:`, err)
    errors.value[chartId] = err as Error
  } finally {
    loading.value[chartId] = false
  }
}

const reportChartError = (chartId: string, errorInfo: any) => {
  console.error(`Chart ${chartId} reported error:`, errorInfo.message || errorInfo)
  console.error(`Chart ${chartId} error details:`, JSON.stringify(errorInfo, null, 2))
  errors.value[chartId] = new Error(errorInfo.message || `Chart ${chartId} error`)
  
  // 可以在这里添加错误上报逻辑
  // 例如发送到监控系统
  if (import.meta.env.PROD) {
    // 实际项目中可以发送到错误监控服务
    console.error('Error reported to monitoring service:', { chartId, error: errorInfo })
  }
}

const handleTableError = (error: Error) => {
  console.error('Table error:', error)
  errors.value.deviceList = error
}

// 图表操作方法
const toggleFullscreen = (chartId: string) => {
  fullscreenChart.value = fullscreenChart.value === chartId ? null : chartId
}

const closeFullscreen = () => {
  fullscreenChart.value = null
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  
  if (autoRefresh.value && !refreshTimer.value) {
    refreshTimer.value = setInterval(() => {
      loadDashboardData()
    }, refreshInterval)
  } else if (!autoRefresh.value && refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = undefined
  }
}

const updatePerformanceTrendData = () => {
  // 重新加载性能趋势数据基于时间范围选择
  loading.value.performanceTrend = true
  
  setTimeout(() => {
    // 模拟根据时间范围加载不同密度的数据
    const dataPoints = {
      '1h': 6,
      '6h': 12,
      '24h': 24,
      '7d': 7
    }[performanceTrendTimeRange.value] || 24
    
    const newLabels = []
    const newCpuData = []
    const newMemoryData = []
    
    const now = new Date()
    for (let i = dataPoints - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * (60 * 60 * 1000))
      newLabels.push(time.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
      newCpuData.push(Math.floor(Math.random() * 40) + 30)
      newMemoryData.push(Math.floor(Math.random() * 30) + 50)
    }
    
    performanceData.value = {
      labels: newLabels,
      datasets: [{
        label: 'CPU使用率',
        data: newCpuData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }, {
        label: '内存使用率',
        data: newMemoryData,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    }
    
    loading.value.performanceTrend = false
  }, 500)
}

const exportDeviceList = () => {
  // 模拟导出功能
  const data = deviceListData.value
  const csv = convertToCSV(data)
  downloadCSV(csv, 'device-list.csv')
}

const convertToCSV = (data: any[]) => {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(','))
  ].join('\n')
  
  return csvContent
}

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleSort = (field: string, direction: 'asc' | 'desc') => {
  // 处理表格排序
  console.log('Sort by:', field, direction)
}

const handleFilter = (filters: Record<string, any>) => {
  // 处理表格过滤
  console.log('Filter by:', filters)
}

// 错误处理和用户交互
const dismissError = () => {
  error.value = null
  errors.value = {}
}

const retryOperation = () => {
  if (error.value) {
    loadDashboardData()
  } else {
    // 重试所有有错误的图表
    Object.keys(errors.value).forEach(chartId => {
      retryChart(chartId)
    })
  }
}

// 图表配置
const charts = ref<ChartConfig[]>([
  { id: 'deviceStatus', type: 'pie', title: '设备状态分布', width: 'col-span-2', height: 'h-64' },
  { id: 'performance', type: 'line', title: '性能趋势', width: 'col-span-4', height: 'h-64' },
  { id: 'usage', type: 'bar', title: '资源使用率', width: 'col-span-3', height: 'h-80' },
  { id: 'distribution', type: 'doughnut', title: '分布统计', width: 'col-span-2', height: 'h-64' },
  { id: 'systemLoad', type: 'gauge', title: '系统负载', width: 'col-span-2', height: 'h-64' },
  { id: 'alerts', type: 'bar', title: '告警统计', width: 'col-span-3', height: 'h-64' }
])

// 图表数据
const deviceStatusData = ref({
  labels: ['在线', '离线', '维护', '告警'],
  datasets: [{
    data: [45, 8, 12, 3],
    backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#F97316'],
    borderWidth: 0
  }]
})

const performanceData = ref({
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  datasets: [{
    label: 'CPU使用率',
    data: [45, 52, 38, 61, 58, 42],
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    tension: 0.4
  }, {
    label: '内存使用率',
    data: [62, 68, 55, 71, 69, 58],
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    tension: 0.4
  }]
})

const usageData = ref({
  labels: ['CPU', '内存', '磁盘', '网络'],
  datasets: [{
    label: '使用率 (%)',
    data: [65, 78, 45, 32],
    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    borderRadius: 4
  }]
})

const distributionData = ref({
  labels: ['A区域', 'B区域', 'C区域', 'D区域'],
  datasets: [{
    data: [30, 25, 20, 25],
    backgroundColor: ['#8B5CF6', '#06B6D4', '#84CC16', '#F97316'],
    cutout: '60%'
  }]
})

const systemLoadData = ref({
  value: 72,
  min: 0,
  max: 100,
  title: '系统负载',
  color: '#3B82F6'
})

const alertsData = ref({
  labels: ['严重', '警告', '信息', '正常'],
  datasets: [{
    label: '告警数量',
    data: [3, 12, 8, 45],
    backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981']
  }]
})

// 获取当前图表样式类
const getGridClasses = computed(() => {
  return {
    'grid': true,
    'grid-cols-3': true,
    'gap-4': true,
    'p-4': true
  }
})

// 获取图表标题样式
const getTitleClasses = computed(() => {
  return {
    'text-base': true,
    'font-medium': true,
    'text-gray-900': true,
    'dark:text-white': true,
    'mb-2': true
  }
})

// 获取自动刷新标题
const refreshTitle = computed(() => {
  return `自动刷新 (${Math.floor(props.refreshInterval / 1000)}s)`
})

// 数据加载函数
const loadDashboardData = async () => {
  if (isLoading.value || isRefreshing.value) return

  isLoading.value = !isRefreshing.value
  error.value = null

  try {
    // 并行加载所有数据
    const [dashboardData, deviceData] = await Promise.all([
      loadDashboardMetrics(),
      loadDeviceStatus()
    ])

    // 更新图表数据
    updateAllCharts(dashboardData, deviceData)

    emit('refresh-complete')

  } catch (err) {
    console.error('Dashboard data loading error:', err)
    error.value = '数据加载失败'
    emit('chart-error', 'dashboard', err as Error)
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const loadDashboardMetrics = async () => {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 1000))
  return {
    performance: performanceData.value,
    usage: usageData.value,
    systemLoad: systemLoadData.value,
    alerts: alertsData.value
  }
}

const loadDeviceStatus = async () => {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 800))
  return {
    deviceStatus: deviceStatusData.value,
    distribution: distributionData.value
  }
}

const updateAllCharts = (dashboardData: any, deviceData: any) => {
  Object.assign(performanceData.value, dashboardData.performance)
  Object.assign(usageData.value, dashboardData.usage)
  Object.assign(systemLoadData.value, dashboardData.systemLoad)
  Object.assign(alertsData.value, dashboardData.alerts)
  Object.assign(deviceStatusData.value, deviceData.deviceStatus)
  Object.assign(distributionData.value, deviceData.distribution)

  // 通知父组件数据已更新
  Object.keys({ ...dashboardData, ...deviceData }).forEach(key => {
    emit('data-updated', key, { ...dashboardData[key], ...deviceData[key] })
  })
}

// 单独刷新指定图表
const refreshChart = async (chartId: string) => {
  isRefreshing.value = true
  
  try {
    const chartData = await loadChartData(chartId)
    updateChartData(chartId, chartData)
    emit('data-updated', chartId, chartData)
  } catch (err) {
    console.error(`Chart ${chartId} refresh error:`, err)
    emit('chart-error', chartId, err as Error)
  } finally {
    isRefreshing.value = false
  }
}

const loadChartData = async (chartId: string) => {
  const dataMap = {
    deviceStatus: deviceStatusData.value,
    performance: performanceData.value,
    usage: usageData.value,
    distribution: distributionData.value,
    systemLoad: systemLoadData.value,
    alerts: alertsData.value
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // 模拟数据变化
      const baseData = dataMap[chartId as keyof typeof dataMap]
      const updatedData = JSON.parse(JSON.stringify(baseData))
      
      if (chartId === 'performance') {
        // 更新性能数据，添加新的时间点和数据
        const now = new Date()
        updatedData.labels.push(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
        updatedData.datasets[0].data.push(Math.floor(Math.random() * 40) + 30)
        updatedData.datasets[1].data.push(Math.floor(Math.random() * 30) + 50)
        
        // 保持数据点数量不超过7个
        if (updatedData.labels.length > 7) {
          updatedData.labels.shift()
          updatedData.datasets[0].data.shift()
          updatedData.datasets[1].data.shift()
        }
      } else if (chartId === 'systemLoad') {
        updatedData.value = Math.floor(Math.random() * 100)
      } else {
        // 随机更新其他图表数据
        Object.keys(updatedData.datasets[0]).forEach(key => {
          if (typeof updatedData.datasets[0][key] === 'number') {
            updatedData.datasets[0][key] = Math.floor(Math.random() * 100)
          }
        })
      }
      
      resolve(updatedData)
    }, 500)
  })
}

const updateChartData = (chartId: string, newData: any) => {
  const dataMap = {
    deviceStatus: deviceStatusData,
    performance: performanceData,
    usage: usageData,
    distribution: distributionData,
    systemLoad: systemLoadData,
    alerts: alertsData
  }
  
  const targetRef = dataMap[chartId as keyof typeof dataMap]
  if (targetRef) {
    Object.assign(targetRef.value, newData)
  }
}

// 错误处理
const handleChartError = (chartId: string, err: Error) => {
  console.error(`Chart ${chartId} error:`, err)
  emit('chart-error', chartId, err)
}

const handleChartReady = (chartId: string, chart: Chart) => {
  emit('chart-ready', chartId, chart)
}

// 生命周期
onMounted(() => {
  loadDashboardData()
  
  if (props.autoRefresh) {
    refreshTimer.value = setInterval(() => {
      loadDashboardData()
    }, props.refreshInterval)
  }
})

onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
})

// 暴露方法给父组件
defineExpose({
  refreshChart,
  refreshAll: loadDashboardData,
  getChartData: (chartId: string) => {
    const dataMap = {
      deviceStatus: deviceStatusData.value,
      performance: performanceData.value,
      usage: usageData.value,
      distribution: distributionData.value,
      systemLoad: systemLoadData.value,
      alerts: alertsData.value
    }
    return dataMap[chartId as keyof typeof dataMap]
  }
})

// 图表配置
const pieChartOptions = ref<ChartOptions<'pie'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 20, usePointStyle: true }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = ((context.raw / total) * 100).toFixed(1)
          return `${context.label}: ${context.raw} (${percentage}%)`
        }
      }
    }
  }
})

const lineChartOptions = ref<ChartOptions<'line'>>({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxTicksLimit: 8 }
    },
    y: {
      beginAtZero: true,
      max: 100,
      grid: { color: 'rgba(0,0,0,0.1)' }
    }
  },
  plugins: {
    legend: {
      position: 'top',
      labels: { usePointStyle: true, padding: 20 }
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.dataset.label}: ${context.raw}%`
      }
    }
  }
})

const barChartOptions = ref<ChartOptions<'bar'>>({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      grid: { color: 'rgba(0,0,0,0.1)' }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `${context.raw}%`
      }
    }
  }
})

const doughnutChartOptions = ref<ChartOptions<'doughnut'>>({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 20, usePointStyle: true }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = ((context.raw / total) * 100).toFixed(1)
          return `${context.label}: ${context.raw} (${percentage}%)`
        }
      }
    }
  }
})

const gaugeConfig = ref({
  type: 'doughnut',
  data: {
    datasets: [{
      data: [systemLoadData.value.value, 100 - systemLoadData.value.value],
      backgroundColor: [systemLoadData.value.color, '#E5E7EB'],
      borderWidth: 0
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  }
})

// 设备列表数据
const deviceListData = ref([
  { id: 1, name: '设备-A001', status: '在线', location: '数据中心A', lastUpdate: '2024-01-15 14:30' },
  { id: 2, name: '设备-B002', status: '离线', location: '数据中心B', lastUpdate: '2024-01-15 12:15' },
  { id: 3, name: '设备-C003', status: '维护', location: '数据中心C', lastUpdate: '2024-01-15 16:45' },
  { id: 4, name: '设备-D004', status: '在线', location: '数据中心A', lastUpdate: '2024-01-15 17:20' },
  { id: 5, name: '设备-E005', status: '告警', location: '数据中心D', lastUpdate: '2024-01-15 15:10' }
])

const deviceTableColumns = ref([
  { key: 'name', label: '设备名称', sortable: true },
  { key: 'status', label: '状态', sortable: true },
  { key: 'location', label: '位置', sortable: false },
  { key: 'lastUpdate', label: '最后更新', sortable: true }
])

const gaugeConfig = ref({
  minValue: 0,
  maxValue: 100,
  thresholds: [70, 85, 95],
  colors: ['#22c55e', '#f59e0b', '#ef4444', '#dc2626'],
  unit: '%'
})

// 表格列配置
const deviceTableColumns = ref([
  { key: 'name', label: '设备名称', sortable: true, width: 150 },
  { key: 'type', label: '设备类型', sortable: true, width: 100 },
  { key: 'status', label: '状态', sortable: true, width: 80 },
  { key: 'location', label: '位置', sortable: true, width: 100 },
  { key: 'cpuUsage', label: 'CPU', sortable: true, width: 60, formatter: (v: number) => `${v.toFixed(1)}%` },
  { key: 'memoryUsage', label: '内存', sortable: true, width: 60, formatter: (v: number) => `${v.toFixed(1)}%` },
  { key: 'diskUsage', label: '磁盘', sortable: true, width: 60, formatter: (v: number) => `${v.toFixed(1)}%` },
  { key: 'lastUpdate', label: '更新时间', sortable: true, width: 120, formatter: (v: number) => new Date(v).toLocaleString() }
])

// 方法
const getChartTitle = (chartId: string): string => {
  return chartContainers.value.find(c => c.id === chartId)?.title || '图表'
}

const getContainerStyle = (type: string) => {
  const container = chartContainers.value.find(c => c.type === type && c.enabled)
  if (!container) return { display: 'none' }
  
  const baseStyle = {
    minHeight: '250px',
    height: container.size === 'large' ? '400px' : 
            container.size === 'medium' ? '300px' : '200px'
  }
  
  return baseStyle
}

const getEmptyMessage = (chartId: string): string => {
  const messages: Record<string, string> = {
    deviceStatus: '暂无设备状态数据',
    performanceTrend: '暂无性能趋势数据',
    resourceUsage: '暂无资源使用数据',
    alertDistribution: '暂无告警分布数据',
    deviceList: '暂无设备列表数据'
  }
  return messages[chartId] || '暂无数据'
}

const loadDashboardData = async () => {
  globalLoading.value = true
  globalLoadingMessage.value = '正在加载仪表板数据...'
  
  try {
    const [dashboardRes, devicesRes] = await Promise.all([
      api.getDashboardData(),
      api.getDevices({ page: 1, size: props.maxItems })
    ])
    
    const dashboardData = dashboardRes.data
    const devicesData = devicesRes.data
    
    // 更新设备状态数据
    if (dashboardData.charts?.deviceStatus) {
      const deviceStatus = dashboardData.charts.deviceStatus
      deviceStatusData.value = {
        labels: ['在线', '离线', '告警'],
        datasets: [{
          data: [deviceStatus.online, deviceStatus.offline, deviceStatus.warning],
          backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
          borderColor: ['#16a34a', '#dc2626', '#d97706'],
          borderWidth: 2
        }]
      }
    }
    
    // 更新性能趋势数据
    if (dashboardData.charts?.performanceTrend) {
      performanceTrendData.value = {
        labels: dashboardData.charts.performanceTrend.map((item: any) => item.time),
        datasets: [
          {
            label: 'CPU使用率',
            data: dashboardData.charts.performanceTrend.map((item: any) => item.value),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            fill: true
          }
        ]
      }
    }
    
    // 更新告警分布数据
    if (dashboardData.charts?.alertDistribution) {
      const alertDist = dashboardData.charts.alertDistribution
      alertDistributionData.value = {
        labels: ['严重', '警告', '信息'],
        datasets: [{
          data: [alertDist.critical, alertDist.warning, alertDist.info],
          backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4'],
          borderColor: ['#dc2626', '#d97706', '#0891b2'],
          borderWidth: 2
        }]
      }
    }
    
    // 更新设备列表数据
    if (devicesData.devices) {
      deviceListData.value = devicesData.devices
    }
    
    // 更新资源使用数据（模拟）
    resourceUsageData.value = {
      labels: ['CPU', '内存', '磁盘', '网络'],
      datasets: [{
        label: '使用率 (%)',
        data: [
          dashboardData.metrics?.cpuUsage || 65.2,
          dashboardData.metrics?.memoryUsage || 78.5,
          dashboardData.metrics?.diskUsage || 42.3,
          Math.random() * 100
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1
      }]
    }
    
    // 更新实时指标数据
    gaugeMetricsData.value = {
      cpuUsage: dashboardData.metrics?.cpuUsage || 65.2,
      memoryUsage: dashboardData.metrics?.memoryUsage || 78.5,
      diskUsage: dashboardData.metrics?.diskUsage || 42.3,
      networkTraffic: dashboardData.metrics?.networkTraffic || 125.6,
      uptime: dashboardData.metrics?.uptime || 99.8,
      responseTime: dashboardData.metrics?.responseTime || 156
    }
    
    emit('dataUpdate', 'dashboard', dashboardData)
    
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    showNotificationError(error as Error)
  } finally {
    globalLoading.value = false
  }
}

const refreshChart = async (chartId: string) => {
  loading.value[chartId as keyof LoadingState] = true
  errors.value[chartId as keyof ErrorState] = null
  
  try {
    switch (chartId) {
      case 'deviceStatus':
        await loadDeviceStatusData()
        break
      case 'performanceTrend':
        await updatePerformanceTrendData()
        break
      case 'resourceUsage':
        await loadResourceUsageData()
        break
      case 'alertDistribution':
        await loadAlertDistributionData()
        break
      case 'deviceList':
        await loadDeviceListData()
        break
      case 'realTimeMetrics':
        await loadRealTimeMetricsData()
        break
    }
    
    emit('refresh', chartId)
    
  } catch (error) {
    console.error(`Failed to refresh chart ${chartId}:`, error)
    errors.value[chartId as keyof ErrorState] = (error as Error).message
    emit('chartError', chartId, error as Error)
    showNotificationError(error as Error)
  } finally {
    loading.value[chartId as keyof LoadingState] = false
  }
}

const loadDeviceStatusData = async () => {
  const response = await api.getDashboardData()
  const deviceStatus = response.data.charts?.deviceStatus
  
  if (deviceStatus) {
    deviceStatusData.value = {
      labels: ['在线', '离线', '告警'],
      datasets: [{
        data: [deviceStatus.online, deviceStatus.offline, deviceStatus.warning],
        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
        borderColor: ['#16a34a', '#dc2626', '#d97706'],
        borderWidth: 2
      }]
    }
  }
}

const updatePerformanceTrendData = async () => {
  // 根据时间范围获取不同的数据
  const response = await api.getDashboardData()
  const trendData = response.data.charts?.performanceTrend
  
  if (trendData) {
    performanceTrendData.value = {
      labels: trendData.map((item: any) => item.time),
      datasets: [
        {
          label: 'CPU使用率',
          data: trendData.map((item: any) => item.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true
        }
      ]
    }
  }
}

const loadResourceUsageData = async () => {
  const response = await api.getDashboardData()
  const metrics = response.data.metrics
  
  if (metrics) {
    resourceUsageData.value = {
      labels: ['CPU', '内存', '磁盘', '网络'],
      datasets: [{
        label: '使用率 (%)',
        data: [metrics.cpuUsage, metrics.memoryUsage, metrics.diskUsage, Math.random() * 100],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1
      }]
    }
  }
}

const loadAlertDistributionData = async () => {
  const response = await api.getDashboardData()
  const alertDist = response.data.charts?.alertDistribution
  
  if (alertDist) {
    alertDistributionData.value = {
      labels: ['严重', '警告', '信息'],
      datasets: [{
        data: [alertDist.critical, alertDist.warning, alertDist.info],
        backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4'],
        borderColor: ['#dc2626', '#d97706', '#0891b2'],
        borderWidth: 2
      }]
    }
  }
}

const loadDeviceListData = async () => {
  const response = await api.getDevices({ page: 1, size: props.maxItems })
  deviceListData.value = response.data.devices || []
}

const loadRealTimeMetricsData = async () => {
  const response = await api.getDashboardData()
  const metrics = response.data.metrics
  
  if (metrics) {
    gaugeMetricsData.value = {
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      diskUsage: metrics.diskUsage,
      networkTraffic: metrics.networkTraffic,
      uptime: metrics.uptime,
      responseTime: metrics.responseTime
    }
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
}

const toggleFullscreen = (chartId: string) => {
  fullscreenChart.value = fullscreenChart.value === chartId ? null : chartId
  emit('fullscreenToggle', chartId, !!fullscreenChart.value)
}

const closeFullscreen = () => {
  fullscreenChart.value = null
}

const handleChartError = (chartId: string, error: Error) => {
  console.error(`Chart error in ${chartId}:`, error)
  errors.value[chartId as keyof ErrorState] = error.message
  emit('chartError', chartId, error)
}

const handleTableError = (error: Error) => {
  errors.value.deviceList = error.message
  emit('chartError', 'deviceList', error)
}

const handleSort = (field: string, direction: 'asc' | 'desc') => {
  console.log('Sort:', field, direction)
  // 实现排序逻辑
}

const handleFilter = (filters: Record<string, any>) => {
  console.log('Filter:', filters)
  // 实现筛选逻辑
}

const exportDeviceList = async () => {
  try {
    // 实现导出逻辑
    console.log('Export device list')
  } catch (error) {
    showNotificationError(error as Error)
  }
}

const showNotificationError = (error: Error) => {
  currentError.value = error
  showError.value = true
}

const dismissError = () => {
  showError.value = false
  currentError.value = null
}

const retryOperation = async () => {
  showError.value = false
  await loadDashboardData()
}

// 监听器
watch(performanceTrendTimeRange, () => {
  updatePerformanceTrendData()
})

watch(autoRefresh, (newValue) => {
  if (newValue) {
    const intervalId = setInterval(() => {
      loadRealTimeMetricsData()
    }, props.refreshInterval)
    
    onUnmounted(() => {
      clearInterval(intervalId)
    })
  }
})

// 生命周期
onMounted(async () => {
  await nextTick()
  await loadDashboardData()
  
  if (autoRefresh.value) {
    const intervalId = setInterval(() => {
      loadRealTimeMetricsData()
    }, props.refreshInterval)
    
    onUnmounted(() => {
      clearInterval(intervalId)
    })
  }
})

// 全屏模式数据
const getFullscreenData = computed(() => {
  if (!fullscreenChart.value) return null
  
  switch (fullscreenChart.value) {
    case 'deviceStatus':
      return deviceStatusData.value
    case 'performanceTrend':
      return performanceTrendData.value
    case 'resourceUsage':
      return resourceUsageData.value
    case 'alertDistribution':
      return alertDistributionData.value
    default:
      return null
  }
})

const getFullscreenOptions = computed(() => {
  if (!fullscreenChart.value) return null
  
  switch (fullscreenChart.value) {
    case 'deviceStatus':
      return pieChartOptions.value
    case 'performanceTrend':
      return lineChartOptions.value
    case 'resourceUsage':
      return barChartOptions.value
    case 'alertDistribution':
      return doughnutChartOptions.value
    default:
      return null
  }
})
</script>

<style scoped>
.dashboard-charts {
  @apply w-full h-full;
}

.dashboard-charts--grid {
  /* Grid layout specific styles */
}

.dashboard-charts--dark {
  @apply bg-gray-900 text-white;
}

.dashboard-charts--responsive {
  /* Responsive styles */
}

.dashboard-charts--compact {
  /* Compact layout styles */
}

.charts-grid {
  @apply w-full h-full;
  display: v-bind('gridStyle.display');
  grid-template-columns: v-bind('gridStyle.gridTemplateColumns');
  gap: v-bind('gridStyle.gap');
  grid-template-rows: v-bind('gridStyle.gridTemplateRows');
}

.chart-container {
  @apply bg-white rounded-lg shadow-sm border p-4;
  min-height: v-bind('getContainerStyle("pie").minHeight');
  height: v-bind('getContainerStyle("pie").height');
}

.chart-container.table-container {
  @apply col-span-full;
}

.chart-container.gauge-container {
  @apply col-span-1;
}

.chart-header {
  @apply flex justify-between items-center mb-4;
}

.chart-header h3 {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.chart-controls {
  @apply flex items-center space-x-2;
}

.chart-controls button {
  @apply p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors;
}

.chart-controls button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.time-range-selector select {
  @apply text-sm border border-gray-300 rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white;
}

.chart-content {
  @apply relative w-full h-full;
}

.table-content {
  @apply overflow-auto;
}

.gauge-content {
  @apply flex items-center justify-center;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 固定布局样式 */

/* 深色模式 */
.dark .chart-container {
  @apply bg-gray-800 border-gray-700;
}

.dark .chart-header h3 {
  @apply text-white;
}

.dark .chart-controls button {
  @apply text-gray-400 hover:text-gray-200 hover:bg-gray-700;
}

.dark .time-range-selector select {
  @apply bg-gray-800 border-gray-600 text-white;
}
</style>