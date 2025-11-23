<template>
  <div class="realtime-dashboard">
    <!-- 实时数据面板头部 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">
          <el-icon class="title-icon"><DataBoard /></el-icon>
          实时数据监控面板
        </h2>
        <div class="connection-status">
          <span 
            class="status-indicator" 
            :class="{
              'status-connected': isConnected,
              'status-connecting': isConnecting,
              'status-disconnected': !isConnected && !isConnecting
            }"
          >
            <el-icon class="status-icon">
              <Connection v-if="isConnected" />
              <Loading v-else-if="isConnecting" />
              <Disconnect v-else />
            </el-icon>
            {{ connectionStatusText }}
          </span>
        </div>
      </div>
      
      <div class="header-right">
        <div class="time-display">
          {{ currentTime }}
        </div>
        <el-button 
          type="primary" 
          size="small" 
          @click="refreshData"
          :loading="isRefreshing"
          circle
        >
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button 
          type="default" 
          size="small" 
          @click="exportData"
          circle
        >
          <el-icon><Download /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 关键指标概览 -->
    <div class="key-metrics-overview">
      <div class="metric-card" v-for="metric in keyMetrics" :key="metric.key">
        <div class="metric-header">
          <el-icon class="metric-icon" :style="{ color: metric.color }">
            <component :is="metric.icon" />
          </el-icon>
          <span class="metric-label">{{ metric.label }}</span>
        </div>
        <div class="metric-content">
          <div class="metric-value">
            <span class="value-number">{{ metric.value }}</span>
            <span class="value-unit">{{ metric.unit }}</span>
          </div>
          <div class="metric-trend">
            <el-icon 
              class="trend-icon" 
              :class="metric.trend > 0 ? 'trend-up' : 'trend-down'"
            >
              <ArrowUp v-if="metric.trend > 0" />
              <ArrowDown v-else-if="metric.trend < 0" />
              <Minus v-else />
            </el-icon>
            <span class="trend-value">{{ Math.abs(metric.trend) }}%</span>
          </div>
        </div>
        <div class="metric-chart">
          <div 
            class="mini-sparkline" 
            :style="{
              background: `linear-gradient(to right, ${metric.color}20, ${metric.color}10)`,
              height: '4px'
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 详细监控区域 -->
    <div class="monitoring-sections">
      <!-- 设备状态监控 -->
      <div class="monitoring-section">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><Monitor /></el-icon>
            设备状态监控
            <el-badge :value="deviceStatusList.length" class="item-badge" type="primary" />
          </h3>
          <div class="section-actions">
            <el-button size="small" @click="showDeviceDetails = !showDeviceDetails">
              {{ showDeviceDetails ? '收起' : '展开' }}
            </el-button>
          </div>
        </div>

        <div class="device-grid" v-show="showDeviceDetails">
          <div 
            class="device-card" 
            v-for="device in deviceStatusList" 
            :key="device.id"
            :class="`device-${device.status}`"
            @click="selectDevice(device)"
          >
            <div class="device-header">
              <el-icon class="device-icon">
                <component :is="getDeviceIcon(device.type)" />
              </el-icon>
              <div class="device-info">
                <h4 class="device-name">{{ device.name }}</h4>
                <span class="device-type">{{ device.type }}</span>
              </div>
              <div class="device-status">
                <div 
                  class="status-indicator-dot"
                  :class="`status-${device.status}`"
                ></div>
                <span class="status-text">{{ device.statusText }}</span>
              </div>
            </div>
            
            <div class="device-metrics">
              <div class="metric-item" v-for="metric in device.metrics" :key="metric.key">
                <span class="metric-name">{{ metric.name }}</span>
                <span class="metric-val">{{ metric.value }} {{ metric.unit }}</span>
              </div>
            </div>
            
            <div class="device-actions">
              <el-button size="small" @click.stop="sendDeviceCommandToDevice(device.id, 'ping')">
                <el-icon><Refresh /></el-icon>
                检测
              </el-button>
              <el-button 
                size="small" 
                type="warning" 
                v-if="device.status === 'error'"
                @click.stop="restartDevice(device.id)"
              >
                <el-icon><RefreshRight /></el-icon>
                重启
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 告警监控 -->
      <div class="monitoring-section">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><Warning /></el-icon>
            实时告警
            <el-badge :value="activeAlerts" class="item-badge" type="danger" />
            <el-badge :value="criticalAlerts" class="item-badge critical-badge" type="danger" v-if="criticalAlerts > 0" />
          </h3>
        </div>

        <div class="alerts-container">
          <div 
            class="alert-item" 
            v-for="alert in recentAlerts" 
            :key="alert.id"
            :class="`alert-${alert.severity}`"
            @click="handleAlertClick(alert)"
          >
            <div class="alert-header">
              <div class="alert-icon">
                <el-icon v-if="alert.severity === 'critical'"><WarningFilled /></el-icon>
                <el-icon v-else-if="alert.severity === 'warning'"><Warning /></el-icon>
                <el-icon v-else><InfoFilled /></el-icon>
              </div>
              <div class="alert-info">
                <h4 class="alert-title">{{ alert.title }}</h4>
                <p class="alert-message">{{ alert.message }}</p>
                <div class="alert-meta">
                  <span class="alert-source">{{ alert.source }}</span>
                  <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                </div>
              </div>
              <div class="alert-actions">
                <el-button size="small" @click.stop="acknowledgeAlert(alert.id)">
                  确认
                </el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click.stop="resolveAlert(alert.id)"
                  v-if="alert.status === 'active'"
                >
                  解决
                </el-button>
              </div>
            </div>
          </div>
          
          <div v-if="recentAlerts.length === 0" class="no-alerts">
            <el-icon class="no-alerts-icon"><CircleCheckFilled /></el-icon>
            <p>暂无活跃告警</p>
          </div>
        </div>
      </div>

      <!-- 性能监控图表 -->
      <div class="monitoring-section">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><TrendCharts /></el-icon>
            实时性能监控
          </h3>
          <div class="chart-controls">
            <el-select v-model="selectedMetrics" multiple placeholder="选择指标">
              <el-option label="CPU使用率" value="cpu" />
              <el-option label="内存使用率" value="memory" />
              <el-option label="网络流量" value="network" />
              <el-option label="响应时间" value="responseTime" />
            </el-select>
          </div>
        </div>

        <div class="performance-charts">
          <div class="chart-container" v-for="chart in selectedCharts" :key="chart.key">
            <h4 class="chart-title">{{ chart.title }}</h4>
            <div class="chart-placeholder" :id="`chart-${chart.key}`">
              <!-- 这里将集成实际的图表组件 -->
              <div class="chart-info">
                <p>实时数据图表: {{ chart.title }}</p>
                <small>数据点: {{ getDataPointCount(chart.key) }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设备详情弹窗 -->
    <el-dialog 
      v-model="deviceDetailVisible" 
      :title="selectedDevice?.name || '设备详情'"
      width="800px"
      @close="selectedDevice = null"
    >
      <div v-if="selectedDevice" class="device-detail">
        <div class="device-overview">
          <h4>设备概览</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="设备ID">{{ selectedDevice.id }}</el-descriptions-item>
            <el-descriptions-item label="设备类型">{{ selectedDevice.type }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedDevice.statusText }}</el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ formatTime(selectedDevice.lastUpdate) }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="device-metrics-detail">
          <h4>详细指标</h4>
          <div class="metrics-grid">
            <div 
              class="metric-detail-card" 
              v-for="metric in selectedDevice.metrics" 
              :key="metric.key"
            >
              <div class="metric-name">{{ metric.name }}</div>
              <div class="metric-value">{{ metric.value }} {{ metric.unit }}</div>
              <div class="metric-chart-mini">
                <!-- 迷你图表占位 -->
                <div class="chart-sparkline"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  DataBoard, 
  Connection, 
  Loading, 
  Refresh, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Monitor,
  Warning,
  WarningFilled,
  InfoFilled,
  CircleCheckFilled,
  TrendCharts,
  RefreshRight
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useRealtimeDashboard } from '@/composables/useRealtimeData'

// 使用实时数据服务
const {
  connectionStatus,
  realtimeData,
  isConnected,
  isConnecting,
  totalDevices,
  onlineDevices,
  activeAlerts,
  criticalAlerts,
  connect,
  disconnect,
  clearData,
  sendDeviceCommand
} = useRealtimeDashboard()

// 组件状态
const currentTime = ref('')
const isRefreshing = ref(false)
const showDeviceDetails = ref(true)
const selectedMetrics = ref<string[]>(['cpu', 'memory', 'network'])
const deviceDetailVisible = ref(false)
const selectedDevice = ref<any>(null)

// 时间显示更新
const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 连接状态文本
const connectionStatusText = computed(() => {
  if (isConnected.value) return '已连接'
  if (isConnecting.value) return '连接中...'
  return '未连接'
})

// 关键指标计算
const keyMetrics = computed(() => [
  {
    key: 'devices',
    label: '在线设备',
    value: `${onlineDevices.value}/${totalDevices.value}`,
    unit: '台',
    trend: 0,
    color: '#67C23A',
    icon: Monitor
  },
  {
    key: 'alerts',
    label: '活跃告警',
    value: activeAlerts.value.toString(),
    unit: '条',
    trend: 0,
    color: activeAlerts.value > 0 ? '#F56C6C' : '#909399',
    icon: Warning
  },
  {
    key: 'critical',
    label: '严重告警',
    value: criticalAlerts.value.toString(),
    unit: '条',
    trend: 0,
    color: criticalAlerts.value > 0 ? '#E6A23C' : '#909399',
    icon: WarningFilled
  },
  {
    key: 'uptime',
    label: '系统运行时间',
    value: '99.9',
    unit: '%',
    trend: 0.1,
    color: '#67C23A',
    icon: CircleCheckFilled
  }
])

// 设备状态列表
const deviceStatusList = computed(() => {
  return Object.values(realtimeData.deviceStatus).map((device: any) => ({
    id: device.deviceId,
    name: device.deviceName || `设备 ${device.deviceId}`,
    type: device.deviceType || '未知类型',
    status: device.status || 'unknown',
    statusText: getStatusText(device.status),
    lastUpdate: device.lastUpdate,
    metrics: [
      {
        key: 'cpu',
        name: 'CPU',
        value: device.cpuUsage || '0',
        unit: '%'
      },
      {
        key: 'memory',
        name: '内存',
        value: device.memoryUsage || '0',
        unit: '%'
      },
      {
        key: 'disk',
        name: '磁盘',
        value: device.diskUsage || '0',
        unit: '%'
      }
    ]
  }))
})

// 最近告警
const recentAlerts = computed(() => {
  return realtimeData.alerts.slice(0, 10)
})

// 选中的图表
const selectedCharts = computed(() => {
  return selectedMetrics.value.map(key => ({
    key,
    title: getChartTitle(key)
  }))
})

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    error: '错误',
    warning: '警告',
    unknown: '未知'
  }
  return statusMap[status] || '未知'
}

// 获取设备图标
const getDeviceIcon = (type: string) => {
  // 这里可以根据设备类型返回不同的图标
  return Monitor
}

// 获取图表标题
const getChartTitle = (key: string) => {
  const titleMap: Record<string, string> = {
    cpu: 'CPU使用率',
    memory: '内存使用率',
    network: '网络流量',
    responseTime: '响应时间'
  }
  return titleMap[key] || key
}

// 获取数据点数量
const getDataPointCount = (key: string) => {
  // 这里可以根据key返回实际的数据点数量
  return 50
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  } else {
    return new Date(timestamp).toLocaleString('zh-CN')
  }
}

// 刷新数据
const refreshData = async () => {
  isRefreshing.value = true
  try {
    await connect()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  } finally {
    isRefreshing.value = false
  }
}

// 导出数据
const exportData = () => {
  const data = {
    devices: deviceStatusList.value,
    alerts: recentAlerts.value,
    metrics: keyMetrics.value,
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `realtime-data-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('数据导出成功')
}

// 选择设备
const selectDevice = (device: any) => {
  selectedDevice.value = device
  deviceDetailVisible.value = true
}

// 发送设备命令
const sendDeviceCommandToDevice = (deviceId: string, command: string) => {
  // 调用从useRealtimeDashboard导入的sendDeviceCommand函数
  sendDeviceCommand(deviceId, command)
  ElMessage.success(`已向设备 ${deviceId} 发送命令: ${command}`)
}

// 重启设备
const restartDevice = async (deviceId: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要重启设备 ${deviceId} 吗？`,
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    sendDeviceCommandToDevice(deviceId, 'restart')
    ElMessage.success(`已重启设备 ${deviceId}`)
  } catch {
    // 用户取消
  }
}

// 处理告警点击
const handleAlertClick = (alert: any) => {
  ElMessageBox.alert(alert.message, alert.title, {
    confirmButtonText: '知道了',
    type: alert.severity === 'critical' ? 'error' : 'warning'
  })
}

// 确认告警
const acknowledgeAlert = (alertId: string) => {
  // 这里应该调用实际的API来确认告警
  ElMessage.success(`告警 ${alertId} 已确认`)
}

// 解决告警
const resolveAlert = (alertId: string) => {
  // 这里应该调用实际的API来解决告警
  ElMessage.success(`告警 ${alertId} 已解决`)
}

// 生命周期
let timeInterval: NodeJS.Timeout

onMounted(() => {
  updateCurrentTime()
  timeInterval = setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// 监听连接状态变化
watch(connectionStatus, (newStatus) => {
  if (newStatus === 'connected') {
    ElMessage.success('实时数据连接已建立')
  } else if (newStatus === 'disconnected') {
    ElMessage.warning('实时数据连接已断开')
  }
})
</script>

<style scoped>
.realtime-dashboard {
  padding: 20px;
  background: linear-gradient(135deg, #0f1419 0%, #1a1f29 100%);
  min-height: 100vh;
  color: #e6e6e6;
}

/* 头部样式 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dashboard-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #67C23A;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.status-connected {
  background: rgba(103, 194, 58, 0.2);
  color: #67C23A;
  border: 1px solid rgba(103, 194, 58, 0.3);
}

.status-indicator.status-connecting {
  background: rgba(64, 158, 255, 0.2);
  color: #409EFF;
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.status-indicator.status-disconnected {
  background: rgba(245, 108, 108, 0.2);
  color: #F56C6C;
  border: 1px solid rgba(245, 108, 108, 0.3);
}

.status-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-display {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 16px;
  color: #67C23A;
  background: rgba(103, 194, 58, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(103, 194, 58, 0.3);
}

/* 关键指标概览 */
.key-metrics-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.metric-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.metric-icon {
  font-size: 20px;
}

.metric-label {
  font-size: 14px;
  color: #b0b0b0;
}

.metric-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.value-number {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.value-unit {
  font-size: 14px;
  color: #b0b0b0;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.trend-icon.trend-up {
  color: #67C23A;
}

.trend-icon.trend-down {
  color: #F56C6C;
}

.trend-value {
  color: #b0b0b0;
}

/* 监控区域 */
.monitoring-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.monitoring-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.item-badge {
  margin-left: 8px;
}

.critical-badge {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 设备网格 */
.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.device-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.device-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
}

.device-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.device-icon {
  font-size: 24px;
  color: #409EFF;
}

.device-info {
  flex: 1;
}

.device-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.device-type {
  font-size: 12px;
  color: #b0b0b0;
}

.device-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator-dot.status-online {
  background: #67C23A;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.6);
}

.status-indicator-dot.status-offline {
  background: #909399;
}

.status-indicator-dot.status-error {
  background: #F56C6C;
  box-shadow: 0 0 6px rgba(245, 108, 108, 0.6);
}

.status-indicator-dot.status-warning {
  background: #E6A23C;
  box-shadow: 0 0 6px rgba(230, 162, 60, 0.6);
}

.status-text {
  font-size: 12px;
  color: #b0b0b0;
}

.device-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.metric-item {
  text-align: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.metric-name {
  font-size: 12px;
  color: #b0b0b0;
  margin-bottom: 4px;
}

.metric-val {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.device-actions {
  display: flex;
  gap: 8px;
}

/* 告警容器 */
.alerts-container {
  max-height: 400px;
  overflow-y: auto;
}

.alert-item {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.alert-item:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.alert-item.alert-critical {
  background: rgba(245, 108, 108, 0.1);
  border-color: rgba(245, 108, 108, 0.3);
}

.alert-item.alert-warning {
  background: rgba(230, 162, 60, 0.1);
  border-color: rgba(230, 162, 60, 0.3);
}

.alert-item.alert-info {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
}

.alert-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
}

.alert-icon {
  font-size: 20px;
  margin-top: 2px;
}

.alert-item.alert-critical .alert-icon {
  color: #F56C6C;
}

.alert-item.alert-warning .alert-icon {
  color: #E6A23C;
}

.alert-item.alert-info .alert-icon {
  color: #409EFF;
}

.alert-info {
  flex: 1;
}

.alert-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.alert-message {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #d0d0d0;
  line-height: 1.4;
}

.alert-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.alert-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.no-alerts {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.no-alerts-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #67C23A;
}

/* 性能图表 */
.performance-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 16px;
}

.chart-container {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.chart-placeholder {
  height: 200px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.chart-info p {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.chart-info small {
  font-size: 12px;
}

/* 设备详情弹窗样式 */
.device-detail {
  color: #e6e6e6;
}

.device-overview {
  margin-bottom: 24px;
}

.device-overview h4 {
  margin: 0 0 16px 0;
  color: #ffffff;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metric-detail-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.metric-detail-card .metric-name {
  font-size: 14px;
  color: #b0b0b0;
  margin-bottom: 8px;
}

.metric-detail-card .metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12px;
}

.metric-chart-mini {
  height: 40px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.chart-sparkline {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #67C23A, #409EFF);
  opacity: 0.3;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .realtime-dashboard {
    padding: 12px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-right {
    justify-content: center;
  }
  
  .key-metrics-overview {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .device-grid {
    grid-template-columns: 1fr;
  }
  
  .performance-charts {
    grid-template-columns: 1fr;
  }
}
</style>