<template>
  <div class="device-monitor-container">
    <!-- 页面加载状态 -->
    <div v-if="isPageLoading" class="page-loading-overlay">
      <div class="loading-content">
        <el-icon class="loading-icon is-loading"><Loading /></el-icon>
        <p class="loading-text">正在加载设备监控界面...</p>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div v-else class="monitor-content">
      <!-- 页面错误状态 -->
      <div v-if="pageError" class="page-error-overlay">
        <div class="error-content">
          <el-icon class="error-icon"><WarningFilled /></el-icon>
          <h3 class="error-title">{{ pageError.title }}</h3>
          <p class="error-message">{{ pageError.message }}</p>
          <el-button type="primary" @click="initializePage">重试</el-button>
        </div>
      </div>

      <!-- 正常内容 -->
      <div v-else class="monitor-grid">
        <!-- 左侧设备列表面板 -->
        <div class="device-list-panel" :class="{ 'collapsed': selectedDevice }">
          <div class="panel-header">
            <h3 class="panel-title">
              <el-icon class="title-icon"><Monitor /></el-icon>
              设备列表
            </h3>
            <div class="search-box">
              <el-input
                v-model="searchQuery"
                placeholder="搜索设备..."
                :prefix-icon="Search"
                size="small"
                clearable
              />
            </div>
          </div>
          
          <div class="device-tree-container">
            <el-tree
              :data="deviceTreeData"
              :props="treeProps"
              node-key="id"
              highlight-current
              @node-click="handleDeviceSelect"
              class="device-tree"
            >
              <template #default="{ data }">
                <div class="tree-node" :class="`status-${data.status}`">
                  <span class="node-label">{{ data.label }}</span>
                  <span class="node-status" :class="data.status">{{ getStatusText(data.status) }}</span>
                </div>
              </template>
            </el-tree>
          </div>

          <!-- 设备状态统计 -->
          <div class="device-stats">
            <div class="stat-item">
              <span class="stat-label">在线设备</span>
              <span class="stat-value online">{{ onlineDevicesCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">异常设备</span>
              <span class="stat-value warning">{{ abnormalDevicesCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">离线设备</span>
              <span class="stat-value offline">{{ offlineDevicesCount }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧详情面板 -->
        <div class="device-detail-panel" v-if="selectedDevice">
          <div class="detail-header">
            <h3 class="detail-title">{{ selectedDevice.label }}</h3>
            <div class="detail-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="exportDeviceData"
                :loading="isExporting"
              >
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="showAnomalyAnalysis"
                :disabled="!selectedDevice.hasAnomaly"
              >
                <el-icon><Warning /></el-icon>
                异常分析
              </el-button>
            </div>
          </div>

          <!-- 设备基本信息 -->
          <div class="device-basic-info">
            <div class="info-row">
              <span class="info-label">设备ID:</span>
              <span class="info-value">{{ selectedDevice.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">设备类型:</span>
              <span class="info-value">{{ getDeviceTypeText(selectedDevice.type) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">安装位置:</span>
              <span class="info-value">{{ selectedDevice.location }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">运行时间:</span>
              <span class="info-value">{{ selectedDevice.uptime }}</span>
            </div>
          </div>

          <!-- 实时指标区域 -->
          <div class="realtime-metrics-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><TrendCharts /></el-icon>
                实时指标
              </h4>
              <div class="time-range-selector">
                <el-select v-model="timeRange" size="small" @change="handleTimeRangeChange">
                  <el-option label="最近5分钟" value="5m" />
                  <el-option label="最近15分钟" value="15m" />
                  <el-option label="最近1小时" value="1h" />
                  <el-option label="最近6小时" value="6h" />
                </el-select>
              </div>
            </div>

            <div class="metrics-grid">
              <div 
                v-for="metric in realtimeMetrics" 
                :key="metric.key" 
                class="metric-card"
                :class="`status-${metric.status}`"
              >
                <div class="metric-header">
                  <span class="metric-name">{{ metric.name }}</span>
                  <span class="metric-status" :class="metric.status">{{ metric.statusText }}</span>
                </div>
                <div class="metric-value">
                  {{ metric.value }}{{ metric.unit }}
                </div>
                <div class="metric-trend">
                  <el-icon :class="metric.trend > 50 ? 'trend-up' : 'trend-down'">
                    <ArrowUp v-if="metric.trend > 50" />
                    <ArrowDown v-else />
                  </el-icon>
                  <span>{{ metric.updateTime }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 健康度评分 -->
          <div class="health-score-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><CircleCheck /></el-icon>
                健康度评分
              </h4>
            </div>
            <div class="health-score-display">
              <el-progress 
                type="circle" 
                :percentage="healthScore" 
                :status="healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'exception'"
                :width="120"
              />
              <div class="health-details">
                <div class="detail-item">
                  <span class="detail-label">性能:</span>
                  <span class="detail-value">{{ healthScoreDetails.performance }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">可靠性:</span>
                  <span class="detail-value">{{ healthScoreDetails.reliability }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">效率:</span>
                  <span class="detail-value">{{ healthScoreDetails.efficiency }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 设备日志 -->
          <div class="device-logs-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><Document /></el-icon>
                设备日志
              </h4>
              <div class="log-controls">
                <el-select v-model="logLevel" size="small" style="width: 100px">
                  <el-option label="全部" value="all" />
                  <el-option label="错误" value="error" />
                  <el-option label="警告" value="warning" />
                  <el-option label="信息" value="info" />
                </el-select>
                <el-button 
                  size="small" 
                  @click="refreshLogs"
                  :loading="isRefreshingLogs"
                >
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>

            <div class="logs-container">
              <el-timeline>
                <el-timeline-item
                  v-for="log in filteredLogs"
                  :key="log.id"
                  :timestamp="log.timestamp"
                  :type="getLogType(log.level)"
                  :hollow="true"
                >
                  <div class="log-content">
                    <span class="log-level" :class="log.level">{{ log.level.toUpperCase() }}</span>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import {
  Monitor,
  Search,
  Download,
  Warning,
  TrendCharts,
  CircleCheck,
  Document,
  Refresh,
  Loading,
  WarningFilled,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 设备接口定义
interface Device {
  id: string
  label: string
  type: string
  status: 'online' | 'offline' | 'warning' | 'error'
  location: string
  uptime: string
  hasAnomaly?: boolean
  children?: Device[]
}

interface RealtimeMetric {
  key: string
  name: string
  value: string | number
  unit: string
  status: 'normal' | 'warning' | 'error'
  statusText: string
  trend: number
  updateTime: string
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info' | 'debug'
  message: string
}

// 响应式数据
const isPageLoading = ref(true)
const pageError = ref<{ title: string; message: string } | null>(null)
const selectedDevice = ref<Device | null>(null)
const searchQuery = ref('')
const timeRange = ref('1h')
const isExporting = ref(false)
const isRefreshingLogs = ref(false)
const logLevel = ref('all')

// 实时指标数据
const realtimeMetrics = ref<RealtimeMetric[]>([
  {
    key: 'temperature',
    name: '设备温度',
    value: '75.2',
    unit: '°C',
    status: 'normal',
    statusText: '正常',
    trend: 65,
    updateTime: '刚刚'
  },
  {
    key: 'pressure',
    name: '系统压力',
    value: '2.8',
    unit: 'bar',
    status: 'warning',
    statusText: '偏高',
    trend: 80,
    updateTime: '刚刚'
  },
  {
    key: 'vibration',
    name: '振动幅度',
    value: '0.15',
    unit: 'mm/s',
    status: 'normal',
    statusText: '正常',
    trend: 45,
    updateTime: '刚刚'
  },
  {
    key: 'current',
    name: '工作电流',
    value: '12.5',
    unit: 'A',
    status: 'normal',
    statusText: '正常',
    trend: 55,
    updateTime: '刚刚'
  }
])

// 健康度评分
const healthScore = ref(85)
const healthScoreDetails = ref({
  performance: 88,
  reliability: 92,
  efficiency: 85
})

// 设备日志
const deviceLogs = ref<LogEntry[]>([
  {
    id: '1',
    timestamp: '2024-01-15 10:30:00',
    level: 'info',
    message: '设备启动完成，系统运行正常'
  },
  {
    id: '2',
    timestamp: '2024-01-15 10:35:00',
    level: 'warning',
    message: '检测到温度异常，建议检查冷却系统'
  },
  {
    id: '3',
    timestamp: '2024-01-15 10:40:00',
    level: 'error',
    message: '压力传感器故障，需要维护'
  }
])

// 树形控件属性
const treeProps = {
  children: 'children',
  label: 'label',
  isLeaf: (data: Device) => !data.children || data.children.length === 0
}

// 设备树数据
const deviceTreeData = ref<Device[]>([
  {
    id: 'factory',
    label: '智能制造工厂',
    type: 'factory',
    status: 'online',
    location: '工厂主园区',
    uptime: '连续运行 2年3个月',
    children: [
      {
        id: 'workshop-1',
        label: '生产车间A',
        type: 'workshop',
        status: 'online',
        location: '1号楼2层',
        uptime: '连续运行 8个月',
        children: [
          {
            id: 'cnc-001',
            label: 'CNC数控机床-001',
            type: 'cnc',
            status: 'online',
            location: '工位A-01',
            uptime: '连续运行 72小时',
            hasAnomaly: false
          },
          {
            id: 'cnc-002',
            label: 'CNC数控机床-002',
            type: 'cnc',
            status: 'warning',
            location: '工位A-02',
            uptime: '连续运行 48小时',
            hasAnomaly: true
          }
        ]
      },
      {
        id: 'workshop-2',
        label: '生产车间B',
        type: 'workshop',
        status: 'online',
        location: '2号楼1层',
        uptime: '连续运行 1年2个月',
        children: [
          {
            id: 'robot-001',
            label: '工业机器人-001',
            type: 'robot',
            status: 'online',
            location: '工位B-01',
            uptime: '连续运行 24小时',
            hasAnomaly: false
          },
          {
            id: 'conveyor-001',
            label: '传送带系统-001',
            type: 'conveyor',
            status: 'error',
            location: '流水线B-01',
            uptime: '维修中',
            hasAnomaly: true
          }
        ]
      }
    ]
  }
])

// 计算属性
const onlineDevicesCount = computed(() => {
  return countDevicesByStatus(deviceTreeData.value, 'online')
})

const abnormalDevicesCount = computed(() => {
  return countDevicesByStatus(deviceTreeData.value, 'warning') + 
         countDevicesByStatus(deviceTreeData.value, 'error')
})

const offlineDevicesCount = computed(() => {
  return countDevicesByStatus(deviceTreeData.value, 'offline')
})

const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return deviceLogs.value
  }
  return deviceLogs.value.filter(log => log.level === logLevel.value)
})

// 工具函数
function countDevicesByStatus(devices: Device[], status: string): number {
  let count = 0
  devices.forEach(device => {
    if (device.status === status) {
      count++
    }
    if (device.children) {
      count += countDevicesByStatus(device.children, status)
    }
  })
  return count
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    warning: '警告',
    error: '错误'
  }
  return statusMap[status] || status
}

function getDeviceTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    factory: '工厂',
    workshop: '车间',
    cnc: '数控机床',
    robot: '工业机器人',
    conveyor: '传送带'
  }
  return typeMap[type] || type
}

function getLogType(level: string): string {
  const typeMap: Record<string, string> = {
    error: 'danger',
    warning: 'warning',
    info: 'primary',
    debug: 'info'
  }
  return typeMap[level] || 'info'
}

// 事件处理
function handleDeviceSelect(data: Device) {
  selectedDevice.value = data
  ElMessage.success(`已选择设备: ${data.label}`)
}

function handleTimeRangeChange(value: string) {
  ElMessage.info(`时间范围已切换到: ${value}`)
  // 这里可以添加实际的数据刷新逻辑
}

function exportDeviceData() {
  isExporting.value = true
  setTimeout(() => {
    ElMessage.success('设备数据导出成功')
    isExporting.value = false
  }, 2000)
}

function showAnomalyAnalysis() {
  ElMessage.info('正在打开异常分析...')
  // 这里可以添加实际的分析逻辑
}

function refreshLogs() {
  isRefreshingLogs.value = true
  setTimeout(() => {
    ElMessage.success('日志刷新完成')
    isRefreshingLogs.value = false
  }, 1000)
}

// 页面初始化
async function initializePage() {
  try {
    pageError.value = null
    isPageLoading.value = true
    
    // 模拟数据加载
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 默认选择第一个设备
    if (deviceTreeData.value.length > 0) {
      selectedDevice.value = deviceTreeData.value[0]
    }
    
    isPageLoading.value = false
    ElMessage.success('页面加载完成')
  } catch (error) {
    console.error('页面初始化失败:', error)
    pageError.value = {
      title: '页面加载失败',
      message: error instanceof Error ? error.message : '未知错误'
    }
    isPageLoading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  initializePage()
})

onUnmounted(() => {
  // 清理资源
})
</script>

<style scoped>
.device-monitor-container {
  height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.page-loading-overlay,
.page-error-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fff;
}

.loading-content,
.error-content {
  text-align: center;
  padding: 40px;
}

.loading-icon {
  font-size: 32px;
  color: #409eff;
  margin-bottom: 16px;
}

.error-icon {
  font-size: 48px;
  color: #f56c6c;
  margin-bottom: 16px;
}

.loading-text {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.error-title {
  color: #303133;
  font-size: 18px;
  margin: 0 0 8px 0;
}

.error-message {
  color: #606266;
  font-size: 14px;
  margin: 0 0 24px 0;
}

.monitor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.monitor-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  padding: 20px;
  height: 100%;
}

.device-list-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.device-list-panel.collapsed {
  width: 300px;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.panel-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #409eff;
}

.search-box {
  margin-bottom: 0;
}

.device-tree-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.device-tree {
  background: transparent;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.node-status {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.node-status.online {
  background: #f0f9ff;
  color: #1890ff;
}

.node-status.warning {
  background: #fff7e6;
  color: #fa8c16;
}

.node-status.error {
  background: #fff2f0;
  color: #f5222d;
}

.node-status.offline {
  background: #f5f5f5;
  color: #8c8c8c;
}

.device-stats {
  padding: 16px;
  border-top: 1px solid #ebeef5;
  background: #fafafa;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-weight: 600;
  font-size: 14px;
}

.stat-value.online {
  color: #52c41a;
}

.stat-value.warning {
  color: #faad14;
}

.stat-value.offline {
  color: #8c8c8c;
}

.device-detail-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.device-basic-info {
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  margin-bottom: 12px;
}

.info-label {
  font-weight: 600;
  color: #606266;
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
}

.realtime-metrics-section,
.health-score-section,
.device-logs-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metric-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #fff;
}

.metric-card.status-normal {
  border-left: 4px solid #52c41a;
}

.metric-card.status-warning {
  border-left: 4px solid #faad14;
}

.metric-card.status-error {
  border-left: 4px solid #f5222d;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-weight: 600;
  color: #303133;
}

.metric-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.metric-status.normal {
  background: #f6ffed;
  color: #52c41a;
}

.metric-status.warning {
  background: #fffbe6;
  color: #faad14;
}

.metric-status.error {
  background: #fff2f0;
  color: #f5222d;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.trend-up {
  color: #52c41a;
}

.trend-down {
  color: #f5222d;
}

.health-score-display {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.health-details {
  flex: 1;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #606266;
}

.detail-value {
  font-weight: 600;
  color: #303133;
}

.log-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
}

.log-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-level {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.log-level.error {
  background: #fff2f0;
  color: #f5222d;
}

.log-level.warning {
  background: #fffbe6;
  color: #faad14;
}

.log-level.info {
  background: #f6ffed;
  color: #52c41a;
}

.log-level.debug {
  background: #f0f9ff;
  color: #1890ff;
}

.log-message {
  color: #303133;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .monitor-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .device-list-panel {
    order: 2;
  }
  
  .device-detail-panel {
    order: 1;
  }
}

@media (max-width: 768px) {
  .monitor-grid {
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .health-score-display {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>