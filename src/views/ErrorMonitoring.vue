<template>
  <div class="error-monitoring-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>错误监控中心</h1>
      <p class="page-description">实时监控系统错误、异常和性能问题</p>
    </div>

    <!-- 错误统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card critical">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.byLevel[ErrorLevel.CRITICAL] }}</div>
              <div class="stat-label">严重错误</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card error">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.byLevel[ErrorLevel.ERROR] }}</div>
              <div class="stat-label">错误</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card warning">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><InfoFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.byLevel[ErrorLevel.WARNING] }}</div>
              <div class="stat-label">警告</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card total">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总计错误</div>
              <div class="stat-trend">
                <span :class="trendClass">{{ stats.last24Hours }}</span>
                <span class="trend-label">24小时内</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 错误分布图表 -->
    <el-row :gutter="20" class="charts-section">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>错误级别分布</span>
              <el-button size="small" @click="refreshCharts">刷新</el-button>
            </div>
          </template>
          <div ref="levelChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>组件错误排行</span>
              <el-button size="small" @click="refreshCharts">刷新</el-button>
            </div>
          </template>
          <div ref="componentChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 错误监控面板 -->
    <el-card class="monitoring-panel">
      <template #header>
        <div class="panel-header">
          <span>错误详情监控</span>
          <div class="panel-actions">
            <el-button @click="testError" type="warning" size="small">
              测试错误
            </el-button>
            <el-button @click="toggleAutoRefresh" :type="autoRefresh ? 'primary' : ''" size="small">
              {{ autoRefresh ? '停止自动刷新' : '开始自动刷新' }}
            </el-button>
          </div>
        </div>
      </template>
      
      <ErrorMonitoringPanel />
    </el-card>

    <!-- 实时错误通知 -->
    <div v-if="recentErrors.length > 0" class="recent-errors">
      <el-alert
        v-for="error in recentErrors"
        :key="error.id"
        :title="`新错误: ${error.message}`"
        :type="getAlertType(error.level)"
        :closable="true"
        @close="removeRecentError(error.id)"
        show-icon
        class="error-alert"
      >
        <template #description>
          <div class="alert-description">
            <span>组件: {{ error.component || '未知' }}</span>
            <span>时间: {{ formatTimestamp(error.timestamp) }}</span>
            <el-button size="small" @click="showErrorDetails(error)">查看详情</el-button>
          </div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  Warning,
  CircleClose,
  InfoFilled,
  DataAnalysis
} from '@element-plus/icons-vue'
import ErrorMonitoringPanel from '@/components/ErrorMonitoringPanel.vue'
import { errorMonitoringService, ErrorLevel, type ErrorInfo, type ErrorStats } from '@/services/error-monitoring-service'

// 响应式数据
const stats = ref<ErrorStats>({
  total: 0,
  byLevel: {
    [ErrorLevel.DEBUG]: 0,
    [ErrorLevel.INFO]: 0,
    [ErrorLevel.WARNING]: 0,
    [ErrorLevel.ERROR]: 0,
    [ErrorLevel.CRITICAL]: 0
  },
  byComponent: {},
  last24Hours: 0,
  trend: 'stable'
})

const recentErrors = ref<ErrorInfo[]>([])
const autoRefresh = ref(false)
const levelChartRef = ref<HTMLElement>()
const componentChartRef = ref<HTMLElement>()
let levelChart: echarts.ECharts | null = null
let componentChart: echarts.ECharts | null = null

// 计算属性
const trendClass = computed(() => {
  switch (stats.value.trend) {
    case 'improving': return 'trend-improving'
    case 'worsening': return 'trend-worsening'
    case 'stable': return 'trend-stable'
    default: return ''
  }
})

// 方法
const loadStats = () => {
  stats.value = errorMonitoringService.getErrorStats()
}

const refreshCharts = () => {
  loadStats()
  updateCharts()
}

const updateCharts = () => {
  if (levelChart && levelChartRef.value) {
    const levelOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: Object.keys(stats.value.byLevel).map(level => getLevelText(level as ErrorLevel))
      },
      series: [
        {
          name: '错误级别分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: Object.entries(stats.value.byLevel).map(([level, count]) => ({
            value: count,
            name: getLevelText(level as ErrorLevel),
            itemStyle: {
              color: getLevelColor(level as ErrorLevel)
            }
          }))
        }
      ]
    }
    
    levelChart.setOption(levelOption)
  }

  if (componentChart && componentChartRef.value) {
    const componentData = Object.entries(stats.value.byComponent)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([component, count]) => ({
        name: component,
        value: count
      }))

    const componentOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01]
      },
      yAxis: {
        type: 'category',
        data: componentData.map(item => item.name)
      },
      series: [
        {
          name: '错误数量',
          type: 'bar',
          data: componentData.map(item => ({
            value: item.value,
            itemStyle: {
              color: item.value > 10 ? '#ff4d4f' : 
                     item.value > 5 ? '#faad14' : '#52c41a'
            }
          })),
          label: {
            show: true,
            position: 'right'
          }
        }
      ]
    }
    
    componentChart.setOption(componentOption)
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
}

const testError = () => {
  try {
    // 生成测试错误
    throw new Error('这是测试错误，用于验证错误监控功能')
  } catch (error) {
    errorMonitoringService.captureError(
      error.message,
      ErrorLevel.WARNING,
      { test: true, timestamp: Date.now() },
      'ErrorMonitoring.vue'
    )
    
    ElMessage.success('测试错误已生成，请查看错误监控面板')
    refreshCharts()
  }
}

const showErrorDetails = (error: ErrorInfo) => {
  // 这里可以打开错误详情对话框
  console.log('查看错误详情:', error)
}

const removeRecentError = (errorId: string) => {
  recentErrors.value = recentErrors.value.filter(error => error.id !== errorId)
}

const getLevelText = (level: ErrorLevel) => {
  const levelMap = {
    [ErrorLevel.DEBUG]: '调试',
    [ErrorLevel.INFO]: '信息',
    [ErrorLevel.WARNING]: '警告',
    [ErrorLevel.ERROR]: '错误',
    [ErrorLevel.CRITICAL]: '严重'
  }
  return levelMap[level] || level
}

const getLevelColor = (level: ErrorLevel) => {
  const colorMap = {
    [ErrorLevel.DEBUG]: '#52c41a',
    [ErrorLevel.INFO]: '#1890ff',
    [ErrorLevel.WARNING]: '#faad14',
    [ErrorLevel.ERROR]: '#ff4d4f',
    [ErrorLevel.CRITICAL]: '#cf1322'
  }
  return colorMap[level] || '#d9d9d9'
}

const getAlertType = (level: ErrorLevel) => {
  const typeMap = {
    [ErrorLevel.DEBUG]: 'info',
    [ErrorLevel.INFO]: 'info',
    [ErrorLevel.WARNING]: 'warning',
    [ErrorLevel.ERROR]: 'error',
    [ErrorLevel.CRITICAL]: 'error'
  }
  return typeMap[level] || 'info'
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    if (levelChartRef.value) {
      levelChart = echarts.init(levelChartRef.value)
    }
    
    if (componentChartRef.value) {
      componentChart = echarts.init(componentChartRef.value)
    }
    
    updateCharts()
  })
}

// 监听窗口大小变化
const handleResize = () => {
  levelChart?.resize()
  componentChart?.resize()
}

// 生命周期
onMounted(() => {
  loadStats()
  initCharts()
  
  window.addEventListener('resize', handleResize)
  
  // 监听新错误
  const originalErrors = errorMonitoringService.getErrors()
  
  // 定期检查新错误
  const checkInterval = setInterval(() => {
    const currentErrors = errorMonitoringService.getErrors()
    const newErrors = currentErrors.filter(error => 
      !originalErrors.some(origError => origError.id === error.id)
    )
    
    if (newErrors.length > 0) {
      recentErrors.value = [...newErrors, ...recentErrors.value].slice(0, 5)
      originalErrors.push(...newErrors)
      
      if (autoRefresh.value) {
        refreshCharts()
      }
    }
  }, 5000)
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    clearInterval(checkInterval)
    
    levelChart?.dispose()
    componentChart?.dispose()
  })
})
</script>

<style scoped>
.error-monitoring-page {
  width: 100%;
  height: 100%;
  padding: 20px;
  background: var(--bg-color);
  color: var(--text-color);
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 24px;
  text-align: center;
  flex-shrink: 0;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: var(--text-color);
  font-size: 28px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.stats-cards {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s;
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card.critical {
  border-left: 4px solid #cf1322;
}

.stat-card.error {
  border-left: 4px solid #ff4d4f;
}

.stat-card.warning {
  border-left: 4px solid #faad14;
}

.stat-card.total {
  border-left: 4px solid #1890ff;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 16px;
}

.stat-icon {
  margin-right: 16px;
  font-size: 32px;
  color: #1890ff;
}

.stat-card.critical .stat-icon {
  color: #cf1322;
}

.stat-card.error .stat-icon {
  color: #ff4d4f;
}

.stat-card.warning .stat-icon {
  color: #faad14;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-improving {
  color: #52c41a;
  font-weight: bold;
}

.trend-worsening {
  color: #ff4d4f;
  font-weight: bold;
}

.trend-stable {
  color: #faad14;
  font-weight: bold;
}

.trend-label {
  font-size: 12px;
  color: #8c8c8c;
}

.charts-section {
  margin-bottom: 24px;
  flex: 1;
  overflow-y: auto;
}

.chart-card {
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.monitoring-panel {
  border-radius: 8px;
  margin-bottom: 24px;
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.recent-errors {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  z-index: 2000;
}

.error-alert {
  margin-bottom: 8px;
  border-radius: 6px;
}

.alert-description {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.alert-description span {
  margin-right: 8px;
}

/* 删除响应式媒体查询代码 */
</style>