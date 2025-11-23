<template>
  <div class="error-monitoring-panel">
    <!-- 标题和操作 -->
    <div class="panel-header">
      <h3>错误监控面板</h3>
      <div class="header-actions">
        <el-button size="small" @click="refreshStats" :loading="refreshing">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button size="small" @click="clearErrors" type="danger">
          <el-icon><Delete /></el-icon>
          清空错误
        </el-button>
        <el-button size="small" @click="exportErrors">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="16">
        <el-col :span="4">
          <div class="stat-card" :class="getLevelClass(ErrorLevel.CRITICAL)">
            <div class="stat-value">{{ stats.byLevel[ErrorLevel.CRITICAL] }}</div>
            <div class="stat-label">严重错误</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-card" :class="getLevelClass(ErrorLevel.ERROR)">
            <div class="stat-value">{{ stats.byLevel[ErrorLevel.ERROR] }}</div>
            <div class="stat-label">错误</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-card" :class="getLevelClass(ErrorLevel.WARNING)">
            <div class="stat-value">{{ stats.byLevel[ErrorLevel.WARNING] }}</div>
            <div class="stat-label">警告</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-card" :class="getLevelClass(ErrorLevel.INFO)">
            <div class="stat-value">{{ stats.byLevel[ErrorLevel.INFO] }}</div>
            <div class="stat-label">信息</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-card total">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总计</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-card trend" :class="trendClass">
            <div class="stat-value">{{ stats.last24Hours }}</div>
            <div class="stat-label">24小时内</div>
            <div class="trend-indicator">
              <el-icon v-if="stats.trend === 'improving'"><SortUp /></el-icon>
              <el-icon v-if="stats.trend === 'worsening'"><SortDown /></el-icon>
              <el-icon v-if="stats.trend === 'stable'"><Minus /></el-icon>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 错误列表 -->
    <div class="errors-list">
      <el-table
        :data="filteredErrors"
        v-loading="loading"
        style="width: 100%"
        @row-click="showErrorDetails"
        class="error-table"
      >
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
        
        <el-table-column prop="message" label="消息" min-width="200" show-overflow-tooltip />
        
        <el-table-column prop="component" label="组件" width="120" />
        
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click.stop="showErrorDetails(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filterLevel" placeholder="错误级别" clearable>
            <el-option
              v-for="level in Object.values(ErrorLevel)"
              :key="level"
              :label="getLevelText(level)"
              :value="level"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterComponent" placeholder="组件" clearable>
            <el-option
              v-for="component in availableComponents"
              :key="component"
              :label="component"
              :value="component"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="filterDateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="timestamp"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="filterKeyword"
            placeholder="搜索错误消息"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </div>

    <!-- 错误详情对话框 -->
    <el-dialog
      v-model="showDetails"
      :title="selectedError ? `错误详情 - ${selectedError.id}` : '错误详情'"
      width="800px"
    >
      <div v-if="selectedError" class="error-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="错误ID">{{ selectedError.id }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatTimestamp(selectedError.timestamp) }}</el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="getTagType(selectedError.level)">
              {{ getLevelText(selectedError.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="组件">{{ selectedError.component || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedError.userId || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="会话ID">{{ selectedError.sessionId }}</el-descriptions-item>
          <el-descriptions-item label="URL">{{ selectedError.url }}</el-descriptions-item>
          <el-descriptions-item label="User Agent">{{ selectedError.userAgent }}</el-descriptions-item>
        </el-descriptions>

        <div class="message-section">
          <h4>错误消息</h4>
          <pre class="error-message">{{ selectedError.message }}</pre>
        </div>

        <div v-if="selectedError.stack" class="stack-section">
          <h4>调用栈</h4>
          <pre class="error-stack">{{ selectedError.stack }}</pre>
        </div>

        <div v-if="selectedError.context" class="context-section">
          <h4>上下文信息</h4>
          <pre class="error-context">{{ JSON.stringify(selectedError.context, null, 2) }}</pre>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showDetails = false">关闭</el-button>
        <el-button type="primary" @click="copyErrorDetails">复制详情</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Delete,
  Download,
  Search,
  SortUp,
  SortDown,
  Minus
} from '@element-plus/icons-vue'
import { errorMonitoringService, ErrorLevel, type ErrorInfo, type ErrorStats } from '@/services/error-monitoring-service'

// 响应式数据
const errors = ref<ErrorInfo[]>([])
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

const loading = ref(false)
const refreshing = ref(false)
const showDetails = ref(false)
const selectedError = ref<ErrorInfo | null>(null)

// 筛选器
const filterLevel = ref<ErrorLevel | ''>('')
const filterComponent = ref<string>('')
const filterDateRange = ref<[number, number] | null>(null)
const filterKeyword = ref('')

// 计算属性
const availableComponents = computed(() => {
  const components = new Set<string>()
  errors.value.forEach(error => {
    if (error.component) {
      components.add(error.component)
    }
  })
  return Array.from(components).sort()
})

const filteredErrors = computed(() => {
  return errors.value.filter(error => {
    // 级别筛选
    if (filterLevel.value && error.level !== filterLevel.value) {
      return false
    }
    
    // 组件筛选
    if (filterComponent.value && error.component !== filterComponent.value) {
      return false
    }
    
    // 时间范围筛选
    if (filterDateRange.value) {
      const [start, end] = filterDateRange.value
      if (error.timestamp < start || error.timestamp > end) {
        return false
      }
    }
    
    // 关键词筛选
    if (filterKeyword.value) {
      const keyword = filterKeyword.value.toLowerCase()
      if (!error.message.toLowerCase().includes(keyword) &&
          !(error.component?.toLowerCase().includes(keyword))) {
        return false
      }
    }
    
    return true
  })
})

const trendClass = computed(() => {
  switch (stats.value.trend) {
    case 'improving': return 'trend-improving'
    case 'worsening': return 'trend-worsening'
    case 'stable': return 'trend-stable'
    default: return ''
  }
})

// 方法
const loadErrors = () => {
  loading.value = true
  try {
    errors.value = errorMonitoringService.getErrors()
    stats.value = errorMonitoringService.getErrorStats()
  } catch (error) {
    console.error('加载错误数据失败:', error)
    ElMessage.error('加载错误数据失败')
  } finally {
    loading.value = false
  }
}

const refreshStats = () => {
  refreshing.value = true
  loadErrors()
  setTimeout(() => {
    refreshing.value = false
  }, 500)
}

const clearErrors = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有错误记录吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    errorMonitoringService.clearErrors()
    loadErrors()
    ElMessage.success('错误记录已清空')
  } catch (error) {
    // 用户取消操作
  }
}

const exportErrors = async () => {
  try {
    // 动态导入导出工具
    const { exportToExcel } = await import('@/utils/export-utils')
    
    const exportData = filteredErrors.value.map(error => ({
      '错误ID': error.id,
      '时间': formatTimestamp(error.timestamp),
      '级别': getLevelText(error.level),
      '消息': error.message,
      '组件': error.component || '',
      '用户ID': error.userId || '',
      '会话ID': error.sessionId,
      'URL': error.url || '',
      'User Agent': error.userAgent || ''
    }))
    
    await exportToExcel(exportData, '错误监控报告')
    ElMessage.success('错误数据导出成功')
  } catch (error) {
    console.error('导出错误数据失败:', error)
    ElMessage.error('导出错误数据失败')
  }
}

const showErrorDetails = (error: ErrorInfo) => {
  selectedError.value = error
  showDetails.value = true
}

const copyErrorDetails = async () => {
  if (!selectedError.value) return
  
  try {
    const details = JSON.stringify(selectedError.value, null, 2)
    await navigator.clipboard.writeText(details)
    ElMessage.success('错误详情已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
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
    [ErrorLevel.INFO]: '',
    [ErrorLevel.WARNING]: 'warning',
    [ErrorLevel.ERROR]: 'danger',
    [ErrorLevel.CRITICAL]: 'danger'
  }
  return typeMap[level] || ''
}

const getLevelClass = (level: ErrorLevel) => {
  return `level-${level}`
}

// 生命周期
onMounted(() => {
  loadErrors()
  
  // 定期刷新数据
  const interval = setInterval(refreshStats, 30000) // 30秒刷新一次
  
  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>

<style scoped>
.error-monitoring-panel {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.panel-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  padding: 16px;
  border-radius: 6px;
  text-align: center;
  background: #f5f7fa;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.level-critical {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.stat-card.level-error {
  background: #fff1f0;
  border: 1px solid #ffa39e;
}

.stat-card.level-warning {
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.stat-card.level-info {
  background: #f0f5ff;
  border: 1px solid #adc6ff;
}

.stat-card.level-debug {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.stat-card.total {
  background: #f0f2f5;
  border: 1px solid #d9d9d9;
}

.stat-card.trend {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.stat-card.trend-worsening {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.stat-card.trend-improving {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trend-indicator {
  margin-top: 4px;
  font-size: 14px;
}

.filters {
  margin-bottom: 20px;
}

.errors-list {
  margin-bottom: 20px;
}

.error-table {
  cursor: pointer;
}

.error-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.error-details {
  max-height: 500px;
  overflow-y: auto;
}

.message-section,
.stack-section,
.context-section {
  margin-top: 20px;
}

.message-section h4,
.stack-section h4,
.context-section h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.error-message,
.error-stack,
.error-context {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.error-stack {
  max-height: 200px;
  overflow-y: auto;
}

@media (max-width: 1200px) {
  .stats-overview .el-col {
    margin-bottom: 16px;
  }
  
  .filters .el-col {
    margin-bottom: 16px;
  }
}
</style>