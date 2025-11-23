<template>
  <div class="ai-query-result" v-if="showResult">
    <div class="result-header">
      <h3 class="result-title">AI查询结果</h3>
      <el-button 
        type="text" 
        @click="closeResult" 
        class="close-btn"
        size="small"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    
    <div class="result-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>AI正在分析您的查询...</span>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <el-icon class="error-icon"><Warning /></el-icon>
        <span>{{ error }}</span>
        <el-button type="primary" size="small" @click="retryQuery">重试</el-button>
      </div>
      
      <!-- 成功结果 -->
      <div v-else-if="result" class="success-state">
        <div class="result-message">
          <el-icon class="success-icon"><SuccessFilled /></el-icon>
          <span>{{ result.message }}</span>
        </div>
        
        <!-- 设备数据结果 -->
        <div v-if="result.type === 'device_data'" class="device-result">
          <div class="data-grid">
            <div class="data-item" v-for="(value, key) in result.data" :key="key">
              <span class="data-label">{{ getDataLabel(key) }}</span>
              <span class="data-value">{{ value }}</span>
            </div>
          </div>
        </div>
        
        <!-- 告警数据结果 -->
        <div v-else-if="result.type === 'alert_data'" class="alert-result">
          <div class="alert-list">
            <div 
              v-for="alert in result.data" 
              :key="alert.id" 
              class="alert-item"
              :class="`alert-${alert.level}`"
            >
              <div class="alert-info">
                <span class="device-name">{{ alert.device }}</span>
                <span class="metric-name">{{ alert.metric }}</span>
                <span class="metric-value">{{ alert.value }}</span>
                <span class="alert-time">{{ alert.time }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 趋势数据结果 -->
        <div v-else-if="result.type === 'trend_data'" class="trend-result">
          <div class="trend-chart">
            <v-chart :option="trendChartOption" autoresize style="height: 200px;" />
          </div>
        </div>
        
        <!-- 统计数据结果 -->
        <div v-else-if="result.type === 'statistics_data'" class="statistics-result">
          <div class="statistics-chart">
            <v-chart :option="statisticsChartOption" autoresize style="height: 200px;" />
          </div>
        </div>
        
        <!-- 通用响应 -->
        <div v-else class="general-result">
          <p>{{ result.message }}</p>
        </div>
      </div>
    </div>
    
    <!-- 查询历史 -->
    <div v-if="history.length > 0" class="query-history">
      <div class="history-header">
        <span>查询历史</span>
        <el-button type="text" size="small" @click="clearHistory">清除</el-button>
      </div>
      <div class="history-list">
        <div 
          v-for="item in history" 
          :key="item.timestamp.getTime()" 
          class="history-item"
          @click="reuseQuery(item.query)"
        >
          <span class="query-text">{{ item.query }}</span>
          <span class="query-time">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { 
  Close, 
  Loading, 
  Warning, 
  SuccessFilled 
} from '@element-plus/icons-vue'
import { aiQueryState } from '@/services/ai-service'

// 注册ECharts组件
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Props
interface Props {
  show: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  reuseQuery: [query: string]
}>()

// 计算属性
const showResult = computed(() => props.show)
const loading = computed(() => aiQueryState.value.loading)
const error = computed(() => aiQueryState.value.error)
const result = computed(() => aiQueryState.value.result)
const history = computed(() => aiQueryState.value.history)

// 图表配置
const trendChartOption = computed(() => {
  if (!result.value || result.value.type !== 'trend_data') {
    return {}
  }
  
  return {
    tooltip: { trigger: 'axis' },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: result.value.data.labels
    },
    yAxis: { type: 'value' },
    series: result.value.data.datasets.map((dataset: any, index: number) => ({
      name: dataset.name,
      type: 'line',
      smooth: true,
      data: dataset.data,
      itemStyle: { color: index === 0 ? '#1890ff' : '#52c41a' }
    }))
  }
})

const statisticsChartOption = computed(() => {
  if (!result.value || result.value.type !== 'statistics_data') {
    return {}
  }
  
  return {
    tooltip: { trigger: 'axis' },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: result.value.data.topBusinesses.map((b: any) => b.name)
    },
    yAxis: { type: 'value' },
    series: [{
      data: result.value.data.topBusinesses.map((b: any) => b.value),
      type: 'bar',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      }
    }]
  }
})

// 方法
const closeResult = () => {
  emit('close')
}

const retryQuery = () => {
  // 这里可以重新触发查询
  emit('reuseQuery', aiQueryState.value.history[0]?.query || '')
}

const clearHistory = () => {
  aiQueryState.value.history = []
}

const reuseQuery = (query: string) => {
  emit('reuseQuery', query)
}

const getDataLabel = (key: string) => {
  const labels: Record<string, string> = {
    totalDevices: '设备总数',
    onlineDevices: '在线设备',
    offlineDevices: '离线设备',
    avgUptime: '平均运行时间'
  }
  return labels[key] || key
}

const formatTime = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  
  const days = Math.floor(hours / 24)
  return `${days}天前`
}
</script>

<style scoped>
.ai-query-result {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 80vh;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.result-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  color: var(--text-color-secondary);
}

.result-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.loading-state,
.error-state,
.success-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #1890ff;
}

.error-icon {
  color: #f56c6c;
}

.success-icon {
  color: #67c23a;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-color-secondary);
  border-radius: 4px;
}

.data-label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.data-value {
  font-weight: 600;
  color: var(--text-color);
}

.alert-list {
  margin-top: 16px;
}

.alert-item {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 4px solid;
}

.alert-high {
  background: #fef0f0;
  border-left-color: #f56c6c;
}

.alert-medium {
  background: #fdf6ec;
  border-left-color: #e6a23c;
}

.alert-low {
  background: #f0f9ff;
  border-left-color: #409eff;
}

.alert-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.query-history {
  border-top: 1px solid var(--border-color);
  padding: 16px 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-list {
  max-height: 120px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color-light);
}

.history-item:hover {
  background: var(--bg-color-secondary);
}

.query-text {
  flex: 1;
  color: var(--text-color);
  font-size: 14px;
}

.query-time {
  color: var(--text-color-secondary);
  font-size: 12px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>