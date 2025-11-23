<template>
  <div class="performance-monitoring">
    <div class="header">
      <h1>性能监控中心</h1>
      <div class="controls">
        <el-button 
          type="primary" 
          @click="refreshData"
          :loading="refreshing"
          style="background-color: #2d5aa0; border-color: #2d5aa0; color: #ffffff;"
        >
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button 
          type="warning" 
          @click="clearData"
          style="background-color: #d97706; border-color: #d97706; color: #ffffff;"
        >
          <el-icon><Delete /></el-icon>
          清空数据
        </el-button>
        <el-button 
          type="info" 
          @click="toggleAutoRefresh"
          style="background-color: #059669; border-color: #059669; color: #ffffff;"
        >
          <el-icon>{{ autoRefresh ? 'VideoPause' : 'VideoPlay' }}</el-icon>
          {{ autoRefresh ? '暂停自动刷新' : '开始自动刷新' }}
        </el-button>
      </div>
    </div>

    <!-- 性能概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="20">
        <el-col :span="6" v-for="stat in keyMetrics" :key="stat.metric">
          <el-card class="metric-card" :class="{ 'unhealthy': !stat.isHealthy }">
            <div class="metric-content">
              <div class="metric-icon">
                <el-icon :color="stat.isHealthy ? '#67C23A' : '#F56C6C'">
                  <component :is="getMetricIcon(stat.metric)" />
                </el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-name">{{ getMetricName(stat.metric) }}</div>
                <div class="metric-value">{{ formatValue(stat.lastValue, stat.metric) }}</div>
                <div class="metric-trend" :class="stat.trend">
                  <el-icon>
                    <SortUp v-if="stat.trend === 'improving'" />
                    <SortDown v-else-if="stat.trend === 'worsening'" />
                    <Minus v-else />
                  </el-icon>
                  {{ getTrendText(stat.trend) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 性能图表 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>页面加载时间趋势</span>
            </template>
            <div ref="loadTimeChart" style="height: 300px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>FPS监控</span>
            </template>
            <div ref="fpsChart" style="height: 300px;"></div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>内存使用情况</span>
            </template>
            <div ref="memoryChart" style="height: 300px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>API响应时间</span>
            </template>
            <div ref="apiChart" style="height: 300px;"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 性能数据表格 -->
    <div class="data-table">
      <el-card>
        <template #header>
          <span>详细性能数据</span>
          <div class="table-controls">
            <el-select v-model="selectedMetric" placeholder="选择指标" style="width: 200px;">
              <el-option 
                v-for="metric in Object.values(PerformanceMetric)" 
                :key="metric" 
                :label="getMetricName(metric)" 
                :value="metric"
              />
            </el-select>
            <el-button @click="exportData">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </div>
        </template>
        
        <el-table :data="filteredData" style="width: 100%" height="400">
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="metric" label="指标" width="150">
            <template #default="{ row }">
              {{ getMetricName(row.metric) }}
            </template>
          </el-table-column>
          <el-table-column prop="value" label="数值" width="120">
            <template #default="{ row }">
              {{ formatValue(row.value, row.metric) }}
            </template>
          </el-table-column>
          <el-table-column prop="component" label="组件/URL" min-width="200">
            <template #default="{ row }">
              {{ row.component || row.url || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="extraInfo" label="额外信息" min-width="200">
            <template #default="{ row }">
              <el-tooltip 
                v-if="row.extraInfo" 
                :content="JSON.stringify(row.extraInfo, null, 2)"
              >
                <el-button size="small" type="info">查看详情</el-button>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="totalRecords"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </el-card>
    </div>

    <!-- 性能配置面板 -->
    <div class="config-panel">
      <el-card>
        <template #header>
          <span>性能监控配置</span>
        </template>
        
        <el-form :model="configForm" label-width="120px">
          <el-form-item label="启用监控">
            <el-switch v-model="configForm.enabled" @change="updateConfig" />
          </el-form-item>
          <el-form-item label="采样率">
            <el-slider
              v-model="configForm.samplingRate"
              :min="0.01"
              :max="1"
              :step="0.01"
              show-stops
              @change="updateConfig"
            />
            <span style="margin-left: 10px;">{{ (configForm.samplingRate * 100).toFixed(0) }}%</span>
          </el-form-item>
          <el-form-item label="最大记录数">
            <el-input-number
              v-model="configForm.maxRecords"
              :min="100"
              :max="10000"
              @change="updateConfig"
            />
          </el-form-item>
          <el-form-item label="报告间隔">
            <el-input-number
              v-model="configForm.reportInterval"
              :min="10000"
              :max="300000"
              :step="10000"
              @change="updateConfig"
            />
            <span style="margin-left: 10px;">{{ (configForm.reportInterval / 1000).toFixed(0) }}秒</span>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import { 
  Refresh, Delete, VideoPause, VideoPlay, SortUp, SortDown, Minus, Download,
  Timer, Monitor, Cpu, DataAnalysis, Connection, DataLine, ArrowRight
} from '@element-plus/icons-vue'
import { performanceMonitoringService, PerformanceMetric, type PerformanceData, type PerformanceStats } from '@/services/performance-monitoring-service'

// 响应式数据
const refreshing = ref(false)
const autoRefresh = ref(false)
const selectedMetric = ref<PerformanceMetric | ''>('')
const currentPage = ref(1)
const pageSize = ref(20)

// 图表引用
const loadTimeChart = ref<HTMLElement>()
const fpsChart = ref<HTMLElement>()
const memoryChart = ref<HTMLElement>()
const apiChart = ref<HTMLElement>()

// 图表实例
let loadTimeChartInstance: echarts.ECharts | null = null
let fpsChartInstance: echarts.ECharts | null = null
let memoryChartInstance: echarts.ECharts | null = null
let apiChartInstance: echarts.ECharts | null = null

// 配置表单
const configForm = ref({
  enabled: performanceMonitoringService.config.enabled,
  samplingRate: performanceMonitoringService.config.samplingRate,
  maxRecords: performanceMonitoringService.config.maxRecords,
  reportInterval: performanceMonitoringService.config.reportInterval
})

// 计算属性
const performanceData = ref<PerformanceData[]>([])
const performanceStats = ref<PerformanceStats[]>([])

const keyMetrics = computed(() => {
  return performanceStats.value.filter(stat => 
    [PerformanceMetric.PAGE_LOAD_TIME, PerformanceMetric.FPS, PerformanceMetric.MEMORY_USAGE, PerformanceMetric.API_RESPONSE_TIME].includes(stat.metric)
  )
})

const filteredData = computed(() => {
  let data = performanceData.value
  
  if (selectedMetric.value) {
    data = data.filter(item => item.metric === selectedMetric.value)
  }
  
  const startIndex = (currentPage.value - 1) * pageSize.value
  return data.slice(startIndex, startIndex + pageSize.value)
})

const totalRecords = computed(() => {
  if (selectedMetric.value) {
    return performanceData.value.filter(item => item.metric === selectedMetric.value).length
  }
  return performanceData.value.length
})

// 方法
const refreshData = async () => {
  refreshing.value = true
  
  try {
    performanceData.value = performanceMonitoringService.getPerformanceData()
    performanceStats.value = performanceMonitoringService.getAllPerformanceStats()
    
    await nextTick()
    updateCharts()
  } finally {
    refreshing.value = false
  }
}

const clearData = () => {
  performanceMonitoringService.clearPerformanceData()
  refreshData()
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  const interval = setInterval(() => {
    if (autoRefresh.value) {
      refreshData()
    } else {
      clearInterval(interval)
    }
  }, 5000) // 每5秒刷新一次
}

const stopAutoRefresh = () => {
  // 清除所有定时器
  // 实际实现中需要更精确的定时器管理
}

const updateConfig = () => {
  performanceMonitoringService.updateConfig(configForm.value)
}

const exportData = () => {
  const data = performanceData.value
  const csvContent = 'data:text/csv;charset=utf-8,' + 
    '时间,指标,数值,组件/URL,额外信息\n' +
    data.map(row => 
      `${formatTime(row.timestamp)},${getMetricName(row.metric)},${row.value},${row.component || row.url || ''},"${JSON.stringify(row.extraInfo || {})}"`
    ).join('\n')
  
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `performance-data-${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 图表相关方法
const initCharts = () => {
  if (loadTimeChart.value) {
    loadTimeChartInstance = echarts.init(loadTimeChart.value)
  }
  if (fpsChart.value) {
    fpsChartInstance = echarts.init(fpsChart.value)
  }
  if (memoryChart.value) {
    memoryChartInstance = echarts.init(memoryChart.value)
  }
  if (apiChart.value) {
    apiChartInstance = echarts.init(apiChart.value)
  }
  
  updateCharts()
}

const updateCharts = () => {
  updateLoadTimeChart()
  updateFPSChart()
  updateMemoryChart()
  updateAPIChart()
}

const updateLoadTimeChart = () => {
  if (!loadTimeChartInstance) return
  
  const data = performanceMonitoringService.getPerformanceData(PerformanceMetric.PAGE_LOAD_TIME, 50)
  const option = {
    title: { text: '页面加载时间(ms)', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(item => formatTime(item.timestamp, 'HH:mm:ss'))
    },
    yAxis: { type: 'value', name: '时间(ms)' },
    series: [{
      data: data.map(item => item.value),
      type: 'line',
      smooth: true,
      markLine: {
        data: [{ type: 'average', name: '平均值' }],
        lineStyle: { color: '#FF6B6B' }
      }
    }]
  }
  
  loadTimeChartInstance.setOption(option)
}

const updateFPSChart = () => {
  if (!fpsChartInstance) return
  
  const data = performanceMonitoringService.getPerformanceData(PerformanceMetric.FPS, 50)
  const option = {
    title: { text: 'FPS监控', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(item => formatTime(item.timestamp, 'HH:mm:ss'))
    },
    yAxis: { type: 'value', name: 'FPS', min: 0, max: 60 },
    series: [{
      data: data.map(item => item.value),
      type: 'line',
      smooth: true,
      markLine: {
        data: [
          { yAxis: 30, name: '最低标准' },
          { type: 'average', name: '平均值' }
        ]
      }
    }]
  }
  
  fpsChartInstance.setOption(option)
}

const updateMemoryChart = () => {
  if (!memoryChartInstance) return
  
  const data = performanceMonitoringService.getPerformanceData(PerformanceMetric.MEMORY_USAGE, 50)
  const option = {
    title: { text: '内存使用(MB)', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(item => formatTime(item.timestamp, 'HH:mm:ss'))
    },
    yAxis: { type: 'value', name: '内存(MB)' },
    series: [{
      data: data.map(item => item.value),
      type: 'line',
      smooth: true,
      areaStyle: {}
    }]
  }
  
  memoryChartInstance.setOption(option)
}

const updateAPIChart = () => {
  if (!apiChartInstance) return
  
  const data = performanceMonitoringService.getPerformanceData(PerformanceMetric.API_RESPONSE_TIME, 50)
  const option = {
    title: { text: 'API响应时间(ms)', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(item => formatTime(item.timestamp, 'HH:mm:ss'))
    },
    yAxis: { type: 'value', name: '时间(ms)' },
    series: [{
      data: data.map(item => item.value),
      type: 'line',
      smooth: true,
      markLine: {
        data: [{ type: 'average', name: '平均值' }],
        lineStyle: { color: '#FF6B6B' }
      }
    }]
  }
  
  apiChartInstance.setOption(option)
}

// 工具方法
const getMetricIcon = (metric: PerformanceMetric) => {
  const icons = {
    [PerformanceMetric.PAGE_LOAD_TIME]: Timer,
    [PerformanceMetric.FIRST_CONTENTFUL_PAINT]: Monitor,
    [PerformanceMetric.LARGEST_CONTENTFUL_PAINT]: Monitor,
    [PerformanceMetric.FIRST_INPUT_DELAY]: Cpu,
    [PerformanceMetric.CUMULATIVE_LAYOUT_SHIFT]: DataLine,
    [PerformanceMetric.FPS]: Monitor,
    [PerformanceMetric.MEMORY_USAGE]: DataAnalysis,
    [PerformanceMetric.CPU_USAGE]: Cpu,
    [PerformanceMetric.NETWORK_LATENCY]: Connection,
    [PerformanceMetric.COMPONENT_RENDER_TIME]: Timer,
    [PerformanceMetric.API_RESPONSE_TIME]: Network,
    [PerformanceMetric.USER_INTERACTION_TIME]: ArrowRight
  }
  return icons[metric] || Monitor
}

const getMetricName = (metric: PerformanceMetric) => {
  const names = {
    [PerformanceMetric.PAGE_LOAD_TIME]: '页面加载时间',
    [PerformanceMetric.FIRST_CONTENTFUL_PAINT]: '首次内容绘制',
    [PerformanceMetric.LARGEST_CONTENTFUL_PAINT]: '最大内容绘制',
    [PerformanceMetric.FIRST_INPUT_DELAY]: '首次输入延迟',
    [PerformanceMetric.CUMULATIVE_LAYOUT_SHIFT]: '累积布局偏移',
    [PerformanceMetric.FPS]: '帧率(FPS)',
    [PerformanceMetric.MEMORY_USAGE]: '内存使用',
    [PerformanceMetric.CPU_USAGE]: 'CPU使用率',
    [PerformanceMetric.NETWORK_LATENCY]: '网络延迟',
    [PerformanceMetric.COMPONENT_RENDER_TIME]: '组件渲染时间',
    [PerformanceMetric.API_RESPONSE_TIME]: 'API响应时间',
    [PerformanceMetric.USER_INTERACTION_TIME]: '用户交互时间'
  }
  return names[metric] || metric
}

const formatValue = (value: number, metric: PerformanceMetric) => {
  switch (metric) {
    case PerformanceMetric.PAGE_LOAD_TIME:
    case PerformanceMetric.FIRST_CONTENTFUL_PAINT:
    case PerformanceMetric.LARGEST_CONTENTFUL_PAINT:
    case PerformanceMetric.FIRST_INPUT_DELAY:
    case PerformanceMetric.API_RESPONSE_TIME:
    case PerformanceMetric.COMPONENT_RENDER_TIME:
    case PerformanceMetric.USER_INTERACTION_TIME:
      return `${value.toFixed(2)}ms`
    case PerformanceMetric.MEMORY_USAGE:
      return `${value.toFixed(2)}MB`
    case PerformanceMetric.FPS:
      return `${Math.round(value)}FPS`
    case PerformanceMetric.CUMULATIVE_LAYOUT_SHIFT:
      return value.toFixed(4)
    default:
      return value.toFixed(2)
  }
}

const formatTime = (timestamp: number, format = 'YYYY-MM-DD HH:mm:ss') => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const getTrendText = (trend: 'improving' | 'worsening' | 'stable') => {
  return {
    improving: '改善中',
    worsening: '恶化中',
    stable: '稳定'
  }[trend]
}

// 生命周期
onMounted(() => {
  refreshData()
  initCharts()
  
  // 监听窗口大小变化，重新渲染图表
  window.addEventListener('resize', () => {
    loadTimeChartInstance?.resize()
    fpsChartInstance?.resize()
    memoryChartInstance?.resize()
    apiChartInstance?.resize()
  })
  
  // 订阅性能数据变化
  performanceMonitoringService.subscribe((data) => {
    if (autoRefresh.value) {
      refreshData()
    }
  })
})

onUnmounted(() => {
  // 清理图表实例
  loadTimeChartInstance?.dispose()
  fpsChartInstance?.dispose()
  memoryChartInstance?.dispose()
  apiChartInstance?.dispose()
  
  // 停止自动刷新
  autoRefresh.value = false
})
</script>

<style scoped>
.performance-monitoring {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  color: #303133;
}

.controls {
  display: flex;
  gap: 10px;
}

.overview-cards {
  margin-bottom: 20px;
}

.metric-card {
  transition: all 0.3s ease;
}

.metric-card.unhealthy {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.metric-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.metric-icon {
  font-size: 24px;
  margin-right: 15px;
}

.metric-info {
  flex: 1;
}

.metric-name {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-trend {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.metric-trend.improving {
  color: #67c23a;
}

.metric-trend.worsening {
  color: #f56c6c;
}

.metric-trend.stable {
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.data-table {
  margin-bottom: 20px;
}

.table-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.config-panel {
  margin-bottom: 20px;
}
</style>