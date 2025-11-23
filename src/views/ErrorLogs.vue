<template>
  <div class="error-logs-page">
    <div class="page-header">
      <h2>错误日志</h2>
      <p>最近3条错误记录</p>
    </div>

    <div class="logs-container">
      <div v-if="recentLogs.length === 0" class="no-logs">
        <el-empty description="暂无错误日志" />
      </div>

      <div v-else class="logs-list">
        <div 
          v-for="(log, index) in recentLogs" 
          :key="log.id" 
          class="log-item"
          :class="`log-level-${log.level}`"
        >
          <div class="log-header">
            <div class="log-level">
              <el-tag :type="getTagType(log.level)" size="small">
                {{ getLevelText(log.level) }}
              </el-tag>
            </div>
            <div class="log-time">
              {{ formatTimestamp(log.timestamp) }}
            </div>
            <div class="log-component" v-if="log.component">
              <el-tag type="info" size="small">
                {{ log.component }}
              </el-tag>
            </div>
          </div>
          
          <div class="log-message">
            {{ log.message }}
          </div>
          
          <div class="log-details" v-if="log.context && Object.keys(log.context).length > 0">
            <details>
              <summary>详细信息</summary>
              <pre>{{ JSON.stringify(log.context, null, 2) }}</pre>
            </details>
          </div>
          
          <div class="log-stack" v-if="log.stack">
            <details>
              <summary>错误堆栈</summary>
              <pre>{{ log.stack }}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>

    <div class="logs-actions">
      <el-button @click="refreshLogs" type="primary" size="small">
        刷新日志
      </el-button>
      <el-button @click="clearLogs" type="danger" size="small">
        清空日志
      </el-button>
      <el-button @click="exportLogs" type="success" size="small">
        导出日志
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { errorMonitoringService, ErrorLevel, type ErrorInfo } from '@/services/error-monitoring-service'

// 获取最近的3条错误日志
const recentLogs = ref<ErrorInfo[]>([])

const loadRecentLogs = () => {
  try {
    const allErrors = errorMonitoringService.getErrors()
    // 按时间倒序排列，取前3条
    recentLogs.value = allErrors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
  } catch (error) {
    console.error('获取错误日志失败:', error)
    ElMessage.error('获取错误日志失败')
  }
}

const refreshLogs = () => {
  loadRecentLogs()
  ElMessage.success('日志已刷新')
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有错误日志吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    errorMonitoringService.clearLogs()
    recentLogs.value = []
    ElMessage.success('日志已清空')
  } catch (error) {
    // 用户取消操作
  }
}

const exportLogs = async () => {
  try {
    if (recentLogs.value.length === 0) {
      ElMessage.warning('暂无日志可导出')
      return
    }

    const exportData = recentLogs.value.map(log => ({
      时间: formatTimestamp(log.timestamp),
      级别: getLevelText(log.level),
      组件: log.component || '未知',
      消息: log.message,
      堆栈: log.stack || '',
      上下文: JSON.stringify(log.context || {})
    }))

    const content = exportData.map(row => 
      Object.values(row).join('\t')
    ).join('\n')

    const header = Object.keys(exportData[0]).join('\t')
    const csvContent = header + '\n' + content

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `错误日志_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    ElMessage.success('日志导出成功')
  } catch (error) {
    console.error('导出日志失败:', error)
    ElMessage.error('导出日志失败')
  }
}

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取级别文本
const getLevelText = (level: ErrorLevel): string => {
  const levelMap = {
    [ErrorLevel.DEBUG]: '调试',
    [ErrorLevel.INFO]: '信息',
    [ErrorLevel.WARNING]: '警告',
    [ErrorLevel.ERROR]: '错误',
    [ErrorLevel.CRITICAL]: '严重'
  }
  return levelMap[level] || level
}

// 获取标签类型
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

// 页面加载时获取日志
onMounted(() => {
  loadRecentLogs()
})
</script>

<style scoped>
.error-logs-page {
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-color);
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h2 {
  color: #303133;
  margin-bottom: 8px;
}

.page-header p {
  color: #909399;
  font-size: 14px;
}

.logs-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.no-logs {
  padding: 40px;
  text-align: center;
}

.logs-list {
  space-y: 16px;
}

.log-item {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.log-level {
  flex-shrink: 0;
}

.log-time {
  color: #909399;
  font-size: 12px;
  flex: 1;
  text-align: center;
}

.log-component {
  flex-shrink: 0;
}

.log-message {
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  line-height: 1.5;
}

.log-details,
.log-stack {
  margin-top: 12px;
}

.log-details summary,
.log-stack summary {
  cursor: pointer;
  color: #409eff;
  font-size: 12px;
  margin-bottom: 8px;
}

.log-details pre,
.log-stack pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.logs-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 错误级别样式 */
.log-level-debug .log-item {
  border-left: 4px solid #909399;
}

.log-level-info .log-item {
  border-left: 4px solid #409eff;
}

.log-level-warning .log-item {
  border-left: 4px solid #e6a23c;
}

.log-level-error .log-item {
  border-left: 4px solid #f56c6c;
}

.log-level-critical .log-item {
  border-left: 4px solid #f56c6c;
  background: #fef0f0;
}

@media (max-width: 768px) {
  .error-logs-page {
    padding: 12px;
  }
  
  .log-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .log-time {
    text-align: left;
  }
  
  .logs-actions {
    flex-direction: column;
  }
  
  .logs-actions .el-button {
    width: 100%;
  }
}
</style>