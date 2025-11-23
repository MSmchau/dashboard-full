<template>
  <div class="predictive-maintenance-panel">
    <!-- 标题和状态 -->
    <div class="panel-header">
      <h2 class="panel-title">
        <el-icon><Connection /></el-icon>
        预测性维护
      </h2>
      <div class="status-indicator" :class="overallStatus">
        <span class="status-text">{{ getStatusText(overallStatus) }}</span>
        <span class="status-dot"></span>
      </div>
    </div>

    <!-- 设备健康概览 -->
    <div class="health-overview">
      <div class="health-metrics">
        <div class="metric-item" v-for="metric in healthMetrics" :key="metric.name">
          <div class="metric-info">
            <span class="metric-name">{{ metric.name }}</span>
            <span class="metric-value" :class="getMetricClass(metric.value)">
              {{ metric.value }}{{ metric.unit }}
            </span>
          </div>
          <el-progress 
            :percentage="metric.value" 
            :color="getProgressColor(metric.value)"
            :show-text="false"
            class="metric-progress"
          />
        </div>
      </div>
      
      <!-- 健康评分 -->
      <div class="health-score-section">
        <div class="score-display">
          <div class="score-circle" :style="{ '--score': currentHealthScore }">
            <span class="score-value">{{ Math.round(currentHealthScore) }}</span>
            <span class="score-label">健康评分</span>
          </div>
        </div>
        <div class="trend-indicator" :class="currentHealthTrend">
          <el-icon v-if="currentHealthTrend === 'improving'"><ArrowUp /></el-icon>
          <el-icon v-else-if="currentHealthTrend === 'declining' || currentHealthTrend === 'rapid_decline'"><ArrowDown /></el-icon>
          <el-icon v-else><Minus /></el-icon>
          <span>{{ getTrendText(currentHealthTrend) }}</span>
        </div>
      </div>
    </div>

    <!-- 维护建议 -->
    <div class="recommendations-section">
      <h3 class="section-title">维护建议</h3>
      <div class="recommendations-list">
        <div 
          v-for="recommendation in currentRecommendations" 
          :key="recommendation.id"
          class="recommendation-item"
          :class="recommendation.priority"
        >
          <div class="recommendation-header">
            <span class="priority-badge" :class="recommendation.priority">
              {{ getPriorityText(recommendation.priority) }}
            </span>
            <span class="recommendation-title">{{ recommendation.title }}</span>
            <el-button 
              size="small" 
              type="success" 
              @click="markAsCompleted(recommendation.id)"
              class="complete-btn"
            >
              完成
            </el-button>
          </div>
          <div class="recommendation-content">
            <p class="recommendation-desc">{{ recommendation.description }}</p>
            <div class="recommendation-details">
              <span class="detail-item">
                <el-icon><Clock /></el-icon>
                预计时长: {{ recommendation.estimatedDuration }}分钟
              </span>
              <span class="detail-item">
                <el-icon><Money /></el-icon>
                预计成本: ¥{{ recommendation.estimatedCost }}
              </span>
              <span class="detail-item">
                <el-icon><Calendar /></el-icon>
                建议日期: {{ formatDate(recommendation.recommendedDate) }}
              </span>
            </div>
            <div class="impact-section" v-if="recommendation.impact.length > 0">
              <strong>影响:</strong>
              <ul>
                <li v-for="impact in recommendation.impact" :key="impact">{{ impact }}</li>
              </ul>
            </div>
            <div class="prerequisites-section" v-if="recommendation.prerequisites.length > 0">
              <strong>前提条件:</strong>
              <ul>
                <li v-for="prereq in recommendation.prerequisites" :key="prereq">{{ prereq }}</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div v-if="currentRecommendations.length === 0" class="no-recommendations">
          <el-icon><SuccessFilled /></el-icon>
          <p>当前无维护建议，设备运行正常</p>
        </div>
      </div>
    </div>

    <!-- 历史趋势图表 -->
    <div class="history-section">
      <h3 class="section-title">健康趋势历史</h3>
      <div class="history-chart" ref="historyChart">
        <!-- 这里可以集成图表库显示历史趋势 -->
        <div class="chart-placeholder">
          <el-icon><DataAnalysis /></el-icon>
          <p>健康趋势图表区域</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Connection, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Clock, 
  Money, 
  Calendar,
  SuccessFilled,
  DataAnalysis
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  predictiveMaintenanceService, 
  MaintenanceStatus, 
  HealthTrend,
  type MaintenanceRecommendation,
  type HealthHistory
} from '@/services/predictive-maintenance-service'

// 响应式数据
const currentHealthScore = ref(85)
const currentMaintenanceStatus = ref<MaintenanceStatus>(MaintenanceStatus.NORMAL)
const currentHealthTrend = ref<HealthTrend>(HealthTrend.STABLE)
const currentRiskLevel = ref(15)
const currentRecommendations = ref<MaintenanceRecommendation[]>([])
const healthHistory = ref<HealthHistory[]>([])

// 模拟设备指标数据
const deviceMetrics = ref({
  cpu: 45,
  memory: 60,
  disk: 35,
  network: 25,
  temperature: 42,
  load: 1.8
})

// 计算属性
const overallStatus = computed(() => currentMaintenanceStatus.value)

const healthMetrics = computed(() => [
  { name: 'CPU使用率', value: deviceMetrics.value.cpu, unit: '%' },
  { name: '内存使用率', value: deviceMetrics.value.memory, unit: '%' },
  { name: '磁盘使用率', value: deviceMetrics.value.disk, unit: '%' },
  { name: '网络使用率', value: deviceMetrics.value.network, unit: '%' },
  { name: '设备温度', value: deviceMetrics.value.temperature, unit: '°C' },
  { name: '系统负载', value: deviceMetrics.value.load, unit: '' }
])

// 定时器
let analysisTimer: number | null = null

// 生命周期
onMounted(async () => {
  try {
    await predictiveMaintenanceService.initialize()
    await performHealthAnalysis()
    startPeriodicAnalysis()
  } catch (error) {
    console.error('预测性维护面板初始化失败:', error)
    ElMessage.error('预测性维护服务初始化失败')
  }
})

onUnmounted(() => {
  stopPeriodicAnalysis()
})

// 方法
const performHealthAnalysis = async () => {
  try {
    const analysisResult = await predictiveMaintenanceService.analyzeDeviceHealth(
      'device-001',
      '主生产设备',
      deviceMetrics.value
    )
    
    currentHealthScore.value = analysisResult.healthScore
    currentMaintenanceStatus.value = analysisResult.maintenanceStatus
    currentHealthTrend.value = analysisResult.healthTrend
    currentRiskLevel.value = analysisResult.riskLevel
    currentRecommendations.value = analysisResult.recommendations
    healthHistory.value = predictiveMaintenanceService.getDeviceMaintenanceHistory('device-001')
    
    // 模拟指标数据变化
    simulateMetricsChange()
    
  } catch (error) {
    console.error('健康分析失败:', error)
    ElMessage.error('设备健康分析失败')
  }
}

const startPeriodicAnalysis = () => {
  analysisTimer = window.setInterval(() => {
    performHealthAnalysis()
  }, 30000) // 每30秒分析一次
}

const stopPeriodicAnalysis = () => {
  if (analysisTimer) {
    clearInterval(analysisTimer)
    analysisTimer = null
  }
}

const simulateMetricsChange = () => {
  // 模拟指标数据的随机变化
  deviceMetrics.value = {
    cpu: Math.max(10, Math.min(95, deviceMetrics.value.cpu + (Math.random() - 0.5) * 10)),
    memory: Math.max(15, Math.min(90, deviceMetrics.value.memory + (Math.random() - 0.4) * 8)),
    disk: Math.max(5, Math.min(80, deviceMetrics.value.disk + (Math.random() - 0.3) * 5)),
    network: Math.max(5, Math.min(60, deviceMetrics.value.network + (Math.random() - 0.5) * 12)),
    temperature: Math.max(35, Math.min(75, deviceMetrics.value.temperature + (Math.random() - 0.5) * 6)),
    load: Math.max(0.5, Math.min(5.0, deviceMetrics.value.load + (Math.random() - 0.5) * 0.8))
  }
}

const markAsCompleted = async (recommendationId: string) => {
  try {
    await ElMessageBox.confirm(
      '确认将此维护建议标记为已完成？',
      '确认操作',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    predictiveMaintenanceService.markRecommendationCompleted(recommendationId)
    currentRecommendations.value = predictiveMaintenanceService.getDeviceRecommendations('device-001')
    
    ElMessage.success('维护建议已标记为已完成')
  } catch (error) {
    // 用户取消操作
  }
}

const getStatusText = (status: MaintenanceStatus): string => {
  const statusMap = {
    [MaintenanceStatus.NORMAL]: '正常',
    [MaintenanceStatus.WARNING]: '警告',
    [MaintenanceStatus.CRITICAL]: '严重',
    [MaintenanceStatus.MAINTENANCE_REQUIRED]: '需要维护'
  }
  return statusMap[status] || '未知'
}

const getTrendText = (trend: HealthTrend): string => {
  const trendMap = {
    [HealthTrend.IMPROVING]: '改善中',
    [HealthTrend.STABLE]: '稳定',
    [HealthTrend.DECLINING]: '下降',
    [HealthTrend.RAPID_DECLINE]: '快速下降'
  }
  return trendMap[trend] || '未知'
}

const getPriorityText = (priority: string): string => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return priorityMap[priority as keyof typeof priorityMap] || '未知'
}

const getMetricClass = (value: number): string => {
  if (value > 80) return 'high'
  if (value > 60) return 'medium'
  return 'low'
}

const getProgressColor = (value: number): string => {
  if (value > 80) return '#f56c6c'
  if (value > 60) return '#e6a23c'
  return '#67c23a'
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}
</script>

<style scoped>
.predictive-maintenance-panel {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.normal {
  background: #f0f9ff;
  color: #409eff;
}

.status-indicator.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-indicator.critical {
  background: #fef0f0;
  color: #f56c6c;
}

.status-indicator.maintenance_required {
  background: #fdf4f4;
  color: #f56c6c;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.health-overview {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.health-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-name {
  font-size: 14px;
  color: #606266;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
}

.metric-value.high {
  color: #f56c6c;
}

.metric-value.medium {
  color: #e6a23c;
}

.metric-value.low {
  color: #67c23a;
}

.metric-progress {
  flex: 1;
}

.health-score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.score-circle {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: conic-gradient(
    #67c23a 0% calc(var(--score) * 1%),
    #ebeef5 calc(var(--score) * 1%) 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #303133;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
  z-index: 1;
}

.score-value, .score-label {
  position: relative;
  z-index: 2;
  text-align: center;
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  line-height: 1;
}

.score-label {
  font-size: 12px;
  color: #909399;
}

.trend-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}

.trend-indicator.improving {
  color: #67c23a;
  background: #f0f9eb;
}

.trend-indicator.declining, .trend-indicator.rapid_decline {
  color: #f56c6c;
  background: #fef0f0;
}

.trend-indicator.stable {
  color: #909399;
  background: #f4f4f5;
}

.recommendations-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  color: #303133;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 16px;
  transition: all 0.3s ease;
}

.recommendation-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recommendation-item.critical {
  border-left: 4px solid #f56c6c;
}

.recommendation-item.high {
  border-left: 4px solid #e6a23c;
}

.recommendation-item.medium {
  border-left: 4px solid #409eff;
}

.recommendation-item.low {
  border-left: 4px solid #67c23a;
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: white;
}

.priority-badge.critical {
  background: #f56c6c;
}

.priority-badge.high {
  background: #e6a23c;
}

.priority-badge.medium {
  background: #409eff;
}

.priority-badge.low {
  background: #67c23a;
}

.recommendation-title {
  flex: 1;
  font-weight: 600;
  color: #303133;
}

.complete-btn {
  margin-left: auto;
}

.recommendation-content {
  font-size: 14px;
  color: #606266;
}

.recommendation-desc {
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.recommendation-details {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.impact-section, .prerequisites-section {
  margin-top: 8px;
  font-size: 13px;
}

.impact-section ul, .prerequisites-section ul {
  margin: 4px 0 0 0;
  padding-left: 16px;
}

.impact-section li, .prerequisites-section li {
  margin: 2px 0;
}

.no-recommendations {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.no-recommendations .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: #67c23a;
}

.history-section {
  margin-bottom: 24px;
}

.history-chart {
  height: 200px;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.chart-placeholder {
  text-align: center;
}

.chart-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .health-overview {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .recommendation-details {
    flex-direction: column;
    gap: 8px;
  }
  
  .recommendation-header {
    flex-wrap: wrap;
  }
  
  .complete-btn {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>