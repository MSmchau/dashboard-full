<template>
  <div class="error-test-page">
    <h1>错误监控功能测试</h1>
    
    <div class="test-section">
      <h2>测试不同类型的错误</h2>
      
      <div class="test-buttons">
        <el-button @click="testConsoleError" type="danger" size="large">
          测试控制台错误
        </el-button>
        
        <el-button @click="testConsoleWarning" type="warning" size="large">
          测试控制台警告
        </el-button>
        
        <el-button @click="testUnhandledPromise" type="primary" size="large">
          测试未处理的Promise
        </el-button>
        
        <el-button @click="testGlobalError" type="danger" size="large">
          测试全局错误
        </el-button>
        
        <el-button @click="testCustomError" type="info" size="large">
          测试自定义错误
        </el-button>
      </div>
    </div>
    
    <div class="test-section">
      <h2>测试错误监控服务</h2>
      
      <div class="test-buttons">
        <el-button @click="testErrorCapture" type="success" size="large">
          测试错误捕获
        </el-button>
        
        <el-button @click="testErrorStats" type="primary" size="large">
          测试错误统计
        </el-button>
        
        <el-button @click="clearErrors" type="warning" size="large">
          清空错误记录
        </el-button>
        
        <el-button @click="exportErrors" type="info" size="large">
          导出错误报告
        </el-button>
      </div>
    </div>
    
    <div class="test-section">
      <h2>测试结果</h2>
      
      <el-card class="result-card">
        <template #header>
          <div class="result-header">
            <span>错误统计信息</span>
            <el-button @click="refreshStats" size="small">刷新</el-button>
          </div>
        </template>
        
        <div class="stats-info">
          <div class="stat-item">
            <span class="stat-label">总错误数:</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">严重错误:</span>
            <span class="stat-value critical">{{ stats.byLevel[ErrorLevel.CRITICAL] }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">错误:</span>
            <span class="stat-value error">{{ stats.byLevel[ErrorLevel.ERROR] }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">警告:</span>
            <span class="stat-value warning">{{ stats.byLevel[ErrorLevel.WARNING] }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">信息:</span>
            <span class="stat-value info">{{ stats.byLevel[ErrorLevel.INFO] }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">调试:</span>
            <span class="stat-value debug">{{ stats.byLevel[ErrorLevel.DEBUG] }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">24小时内错误:</span>
            <span class="stat-value">{{ stats.last24Hours }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">趋势:</span>
            <span class="stat-value" :class="trendClass">{{ stats.trend }}</span>
          </div>
        </div>
      </el-card>
    </div>
    
    <div class="test-section">
      <h2>最近错误记录</h2>
      
      <el-table :data="recentErrors" style="width: 100%">
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTimestamp(row.timestamp) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getTagType(row.level)" size="small">
              {{ getLevelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="component" label="组件" width="120">
          <template #default="{ row }">
            {{ row.component || '未知' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="message" label="错误信息" min-width="200">
          <template #default="{ row }">
            <span class="error-message">{{ row.message }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button @click="viewErrorDetails(row)" type="text" size="small">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  recentErrors.value = errorMonitoringService.getErrors().slice(-10).reverse()
}

const refreshStats = () => {
  loadStats()
  ElMessage.success('统计信息已刷新')
}

const testConsoleError = () => {
  console.error('这是测试的控制台错误信息')
  ElMessage.success('控制台错误已生成')
}

const testConsoleWarning = () => {
  console.warn('这是测试的控制台警告信息')
  ElMessage.success('控制台警告已生成')
}

const testUnhandledPromise = () => {
  // 创建一个被正确处理的Promise拒绝
  Promise.reject(new Error('这是测试的已处理Promise拒绝'))
    .catch(error => {
      console.log('Promise拒绝被正确处理:', error)
      // 可以选择不显示给用户，只在控制台记录
    })
  ElMessage.success('已处理Promise测试完成')
}

const testGlobalError = () => {
  // 触发一个全局错误
  setTimeout(() => {
    // 这里会触发一个ReferenceError
    // @ts-ignore
    undefinedFunction()
  }, 100)
  ElMessage.success('全局错误将在100ms后生成')
}

const testCustomError = () => {
  try {
    throw new Error('这是测试的自定义错误')
  } catch (error) {
    errorMonitoringService.captureError(
      error.message,
      ErrorLevel.ERROR,
      { test: true, timestamp: Date.now() },
      'ErrorTest.vue'
    )
    ElMessage.success('自定义错误已捕获')
  }
}

const testErrorCapture = () => {
  errorMonitoringService.captureError(
    '这是通过服务直接捕获的错误',
    ErrorLevel.WARNING,
    { test: true, method: 'directCapture' },
    'ErrorTest.vue'
  )
  ElMessage.success('错误捕获测试完成')
}

const testErrorStats = () => {
  loadStats()
  ElMessage.success('错误统计信息已更新')
}

const clearErrors = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有错误记录吗？此操作不可撤销。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    errorMonitoringService.clearErrors()
    loadStats()
    ElMessage.success('错误记录已清空')
  } catch {
    ElMessage.info('取消清空操作')
  }
}

const exportErrors = async () => {
  try {
    const errors = errorMonitoringService.getErrors()
    
    if (errors.length === 0) {
      ElMessage.warning('没有错误记录可导出')
      return
    }
    
    // 准备导出数据
    const exportData = errors.map(error => ({
      时间: new Date(error.timestamp).toLocaleString('zh-CN'),
      级别: getLevelText(error.level),
      组件: error.component || '未知',
      错误信息: error.message,
      堆栈: error.stack || '',
      额外信息: JSON.stringify(error.extraInfo || {})
    }))
    
    // 动态导入导出工具
    const { exportToExcel } = await import('@/utils/export-utils')
    
    await exportToExcel(exportData, '错误监控报告', [
      '时间', '级别', '组件', '错误信息', '堆栈', '额外信息'
    ])
    
    ElMessage.success('错误报告导出成功')
  } catch (error) {
    console.error('导出错误报告失败:', error)
    ElMessage.error('导出错误报告失败')
  }
}

const viewErrorDetails = (error: ErrorInfo) => {
  ElMessageBox.alert(
    `错误详情：
时间: ${formatTimestamp(error.timestamp)}
级别: ${getLevelText(error.level)}
组件: ${error.component || '未知'}
信息: ${error.message}
堆栈: ${error.stack || '无'}
额外信息: ${JSON.stringify(error.extraInfo || {}, null, 2)}`,
    '错误详情',
    {
      confirmButtonText: '关闭',
      customClass: 'error-details-dialog'
    }
  )
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

const getTagType = (level: ErrorLevel) => {
  const typeMap = {
    [ErrorLevel.DEBUG]: 'info',
    [ErrorLevel.INFO]: 'info',
    [ErrorLevel.WARNING]: 'warning',
    [ErrorLevel.ERROR]: 'danger',
    [ErrorLevel.CRITICAL]: 'danger'
  }
  return typeMap[level] || 'info'
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.error-test-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
}

.test-section {
  margin-bottom: 32px;
}

.test-section h2 {
  margin-bottom: 16px;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.test-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.result-card {
  margin-top: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-label {
  font-weight: 500;
  color: #606266;
}

.stat-value {
  font-weight: bold;
  color: #303133;
}

.stat-value.critical {
  color: #cf1322;
}

.stat-value.error {
  color: #ff4d4f;
}

.stat-value.warning {
  color: #faad14;
}

.stat-value.info {
  color: #1890ff;
}

.stat-value.debug {
  color: #52c41a;
}

.trend-improving {
  color: #52c41a;
}

.trend-worsening {
  color: #ff4d4f;
}

.trend-stable {
  color: #faad14;
}

.error-message {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
}

@media (max-width: 768px) {
  .test-buttons {
    flex-direction: column;
  }
  
  .stats-info {
    grid-template-columns: 1fr;
  }
}
</style>