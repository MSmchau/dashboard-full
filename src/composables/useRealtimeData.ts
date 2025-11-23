import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { wsService, WebSocketMessage, ConnectionStatus } from '@/services/websocket'
import { mockWebSocketService } from '@/services/mockWebSocket'
import { env } from '@/config/environment'

// 实时数据类型定义
export interface RealtimeData {
  deviceStatus: Record<string, any>
  sensorData: Record<string, any[]>
  alerts: any[]
  performanceMetrics: Record<string, any>
  systemStatus: Record<string, any>
}

// 仪表盘实时数据管理
export function useRealtimeDashboard() {
  // 连接状态
  const connectionStatus = ref<ConnectionStatus>(ConnectionStatus.DISCONNECTED)
  
  // 实时数据状态
  const realtimeData = reactive<RealtimeData>({
    deviceStatus: {},        // 设备状态数据
    sensorData: {},          // 传感器数据流
    alerts: [],             // 告警信息
    performanceMetrics: {}, // 性能指标
    systemStatus: {}        // 系统状态
  })

  // 根据环境配置选择WebSocket服务
  const currentWsService = env.ENABLE_MOCK_DATA ? mockWebSocketService : wsService

  // 计算属性
  const isConnected = computed(() => connectionStatus.value === ConnectionStatus.CONNECTED)
  const isConnecting = computed(() => connectionStatus.value === ConnectionStatus.CONNECTING)
  const totalDevices = computed(() => Object.keys(realtimeData.deviceStatus).length)
  const onlineDevices = computed(() => 
    Object.values(realtimeData.deviceStatus).filter(device => device.status === 'online').length
  )
  const activeAlerts = computed(() => 
    realtimeData.alerts.filter(alert => alert.status === 'active').length
  )
  const criticalAlerts = computed(() => 
    realtimeData.alerts.filter(alert => alert.severity === 'critical' && alert.status === 'active').length
  )

  // 订阅取消函数集合
  const unsubscribeFunctions: Array<() => void> = []

  // 设备状态更新处理
  const handleDeviceStatus = (data: any) => {
    if (data.deviceId) {
      realtimeData.deviceStatus[data.deviceId] = {
        ...realtimeData.deviceStatus[data.deviceId],
        ...data,
        lastUpdate: Date.now()
      }
    }
  }

  // 传感器数据处理
  const handleSensorData = (data: any) => {
    if (data.deviceId && data.sensorType) {
      const key = `${data.deviceId}_${data.sensorType}`
      
      if (!realtimeData.sensorData[key]) {
        realtimeData.sensorData[key] = []
      }

      // 添加新数据点，保持最新100个数据点
      realtimeData.sensorData[key].push({
        ...data,
        timestamp: Date.now()
      })

      if (realtimeData.sensorData[key].length > 100) {
        realtimeData.sensorData[key].shift()
      }
    }
  }

  // 告警信息处理
  const handleAlert = (data: any) => {
    const alertId = data.id || `${data.deviceId}_${Date.now()}`
    
    const existingAlertIndex = realtimeData.alerts.findIndex(alert => alert.id === alertId)
    
    if (existingAlertIndex >= 0) {
      // 更新现有告警
      realtimeData.alerts[existingAlertIndex] = {
        ...realtimeData.alerts[existingAlertIndex],
        ...data,
        lastUpdate: Date.now()
      }
    } else {
      // 添加新告警，保持最新50条告警
      realtimeData.alerts.unshift({
        id: alertId,
        timestamp: Date.now(),
        ...data
      })
      
      if (realtimeData.alerts.length > 50) {
        realtimeData.alerts = realtimeData.alerts.slice(0, 50)
      }
    }
  }

  // 性能指标处理
  const handlePerformanceData = (data: any) => {
    Object.assign(realtimeData.performanceMetrics, {
      ...data,
      lastUpdate: Date.now()
    })
  }

  // 系统状态处理
  const handleSystemStatus = (data: any) => {
    Object.assign(realtimeData.systemStatus, {
      ...data,
      lastUpdate: Date.now()
    })
  }

  // 连接WebSocket
  const connect = async () => {
    try {
      await currentWsService.connect()
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      throw error
    }
  }

  // 断开WebSocket
  const disconnect = () => {
    currentWsService.disconnect()
  }

  // 订阅实时数据
  const subscribe = () => {
    // 取消之前的订阅
    unsubscribe()

    // 订阅设备状态
    unsubscribeFunctions.push(
      currentWsService.subscribe('device_status', handleDeviceStatus)
    )

    // 订阅传感器数据
    unsubscribeFunctions.push(
      currentWsService.subscribe('sensor_data', handleSensorData)
    )

    // 订阅告警信息
    unsubscribeFunctions.push(
      currentWsService.subscribe('alert', handleAlert)
    )

    // 订阅性能指标
    unsubscribeFunctions.push(
      currentWsService.subscribe('performance', handlePerformanceData)
    )

    // 订阅系统状态
    unsubscribeFunctions.push(
      currentWsService.subscribe('system', handleSystemStatus)
    )

    // 订阅连接状态变化
    unsubscribeFunctions.push(
      currentWsService.subscribe('status_change', (data: any) => {
        connectionStatus.value = data.status
      })
    )

    // 初始化连接状态
    connectionStatus.value = currentWsService.getStatus()
  }

  // 取消订阅
  const unsubscribe = () => {
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    unsubscribeFunctions.length = 0
  }

  // 清除数据
  const clearData = () => {
    realtimeData.deviceStatus = {}
    realtimeData.sensorData = {}
    realtimeData.alerts = []
    realtimeData.performanceMetrics = {}
    realtimeData.systemStatus = {}
  }

  // 获取设备历史数据
  const getDeviceHistoryData = (deviceId: string, sensorType: string, limit = 50) => {
    const key = `${deviceId}_${sensorType}`
    const data = realtimeData.sensorData[key] || []
    return data.slice(-limit)
  }

  // 获取设备最新状态
  const getDeviceStatus = (deviceId: string) => {
    return realtimeData.deviceStatus[deviceId]
  }

  // 发送控制命令
  const sendDeviceCommand = (deviceId: string, command: string, parameters?: any) => {
    const message: WebSocketMessage = {
      type: 'device_status',
      data: {
        action: 'command',
        deviceId,
        command,
        parameters,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    }
    
    currentWsService.send(message)
  }

  // 组件挂载时自动连接和订阅
  onMounted(async () => {
    try {
      await connect()
      subscribe()
    } catch (error) {
      console.error('实时数据服务初始化失败:', error)
    }
  })

  // 组件卸载时清理
  onUnmounted(() => {
    unsubscribe()
    disconnect()
  })

  return {
    // 状态
    connectionStatus,
    realtimeData,
    
    // 计算属性
    isConnected,
    isConnecting,
    totalDevices,
    onlineDevices,
    activeAlerts,
    criticalAlerts,
    
    // 方法
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearData,
    getDeviceHistoryData,
    getDeviceStatus,
    sendDeviceCommand
  }
}

// 性能监控实时数据管理
export function useRealtimePerformance() {
  const performanceData = reactive({
    cpu: [] as Array<{ value: number; timestamp: number }>,
    memory: [] as Array<{ value: number; timestamp: number }>,
    network: [] as Array<{ in: number; out: number; timestamp: number }>,
    responseTime: [] as Array<{ service: string; value: number; timestamp: number }>
  })

  const unsubscribeFunctions: Array<() => void> = []
  
  // 获取当前WebSocket服务实例
  const currentWsService = env.ENABLE_MOCK_DATA ? mockWebSocketService : wsService

  const handlePerformanceMetrics = (data: any) => {
    const now = Date.now()
    
    // CPU使用率
    if (data.cpu) {
      performanceData.cpu.push({ value: data.cpu, timestamp: now })
      if (performanceData.cpu.length > 100) performanceData.cpu.shift()
    }
    
    // 内存使用率
    if (data.memory) {
      performanceData.memory.push({ value: data.memory, timestamp: now })
      if (performanceData.memory.length > 100) performanceData.memory.shift()
    }
    
    // 网络流量
    if (data.network) {
      performanceData.network.push({
        in: data.network.in || 0,
        out: data.network.out || 0,
        timestamp: now
      })
      if (performanceData.network.length > 100) performanceData.network.shift()
    }
    
    // 响应时间
    if (data.responseTime) {
      Object.entries(data.responseTime).forEach(([service, value]) => {
        performanceData.responseTime.push({
          service,
          value: value as number,
          timestamp: now
        })
      })
      if (performanceData.responseTime.length > 100) {
        performanceData.responseTime.splice(0, performanceData.responseTime.length - 100)
      }
    }
  }

  const connect = async () => {
    try {
      await currentWsService.connect()
      unsubscribeFunctions.push(
        currentWsService.subscribe('performance', handlePerformanceMetrics)
      )
    } catch (error) {
      console.error('性能监控连接失败:', error)
    }
  }

  const unsubscribe = () => {
    unsubscribeFunctions.forEach(fn => fn())
    unsubscribeFunctions.length = 0
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    unsubscribe()
    currentWsService.disconnect()
  })

  return {
    performanceData,
    unsubscribe
  }
}

export default {
  useRealtimeDashboard,
  useRealtimePerformance
}