import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 设备数据类型定义
interface Device {
  id: string
  name: string
  type: 'sensor' | 'gateway' | 'controller' | 'actuator'
  status: 'online' | 'offline' | 'warning' | 'error'
  location: {
    latitude: number
    longitude: number
    address: string
  }
  metrics: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkThroughput: number
    temperature: number
    humidity: number
    pressure: number
  }
  lastUpdate: number
  tags: string[]
  description?: string
}

interface DeviceHistory {
  deviceId: string
  timestamp: number
  metrics: Device['metrics']
  status: Device['status']
}

interface DeviceConfig {
  pollingInterval: number
  autoRefresh: boolean
  showOfflineDevices: boolean
  groupBy: 'type' | 'status' | 'location' | 'none'
  sortBy: 'name' | 'status' | 'lastUpdate' | 'cpuUsage'
  sortOrder: 'asc' | 'desc'
}

interface DeviceFilter {
  status: Device['status'][]
  type: Device['type'][]
  tags: string[]
  searchText: string
}

export const useDeviceStore = defineStore('device', () => {
  // 状态
  const devices = ref<Device[]>([])
  const selectedDevice = ref<Device | null>(null)
  const deviceHistory = ref<DeviceHistory[]>([])
  const deviceConfig = ref<DeviceConfig>({
    pollingInterval: 10000,
    autoRefresh: true,
    showOfflineDevices: true,
    groupBy: 'none',
    sortBy: 'name',
    sortOrder: 'asc'
  })
  
  const deviceFilter = ref<DeviceFilter>({
    status: [],
    type: [],
    tags: [],
    searchText: ''
  })

  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const lastUpdateTime = ref<number>(Date.now())
  const error = ref<string | null>(null)

  // 计算属性
  const filteredDevices = computed(() => {
    let filtered = devices.value

    // 状态过滤
    if (deviceFilter.value.status.length > 0) {
      filtered = filtered.filter(device => 
        deviceFilter.value.status.includes(device.status)
      )
    }

    // 类型过滤
    if (deviceFilter.value.type.length > 0) {
      filtered = filtered.filter(device => 
        deviceFilter.value.type.includes(device.type)
      )
    }

    // 标签过滤
    if (deviceFilter.value.tags.length > 0) {
      filtered = filtered.filter(device => 
        deviceFilter.value.tags.some(tag => device.tags.includes(tag))
      )
    }

    // 搜索文本过滤
    if (deviceFilter.value.searchText) {
      const searchText = deviceFilter.value.searchText.toLowerCase()
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchText) ||
        device.id.toLowerCase().includes(searchText) ||
        device.description?.toLowerCase().includes(searchText)
      )
    }

    // 离线设备过滤
    if (!deviceConfig.value.showOfflineDevices) {
      filtered = filtered.filter(device => device.status !== 'offline')
    }

    return filtered
  })

  const groupedDevices = computed(() => {
    const filtered = filteredDevices.value
    
    if (deviceConfig.value.groupBy === 'none') {
      return { '所有设备': filtered }
    }

    const groups: Record<string, Device[]> = {}
    
    filtered.forEach(device => {
      let groupKey: string
      
      switch (deviceConfig.value.groupBy) {
        case 'type':
          groupKey = getDeviceTypeLabel(device.type)
          break
        case 'status':
          groupKey = getDeviceStatusLabel(device.status)
          break
        case 'location':
          groupKey = device.location.address.split(',')[0] // 取城市名
          break
        default:
          groupKey = '其他'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(device)
    })
    
    return groups
  })

  const sortedDevices = computed(() => {
    const filtered = filteredDevices.value
    
    return [...filtered].sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (deviceConfig.value.sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'status':
          aValue = getStatusPriority(a.status)
          bValue = getStatusPriority(b.status)
          break
        case 'lastUpdate':
          aValue = a.lastUpdate
          bValue = b.lastUpdate
          break
        case 'cpuUsage':
          aValue = a.metrics.cpuUsage
          bValue = b.metrics.cpuUsage
          break
        default:
          return 0
      }
      
      if (deviceConfig.value.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  })

  const deviceStats = computed(() => {
    const stats = {
      total: devices.value.length,
      online: devices.value.filter(d => d.status === 'online').length,
      offline: devices.value.filter(d => d.status === 'offline').length,
      warning: devices.value.filter(d => d.status === 'warning').length,
      error: devices.value.filter(d => d.status === 'error').length,
      byType: {
        sensor: devices.value.filter(d => d.type === 'sensor').length,
        gateway: devices.value.filter(d => d.type === 'gateway').length,
        controller: devices.value.filter(d => d.type === 'controller').length,
        actuator: devices.value.filter(d => d.type === 'actuator').length
      }
    }
    
    return stats
  })

  const selectedDeviceHistory = computed(() => {
    if (!selectedDevice.value) return []
    return deviceHistory.value.filter(h => h.deviceId === selectedDevice.value!.id)
  })

  // 辅助函数
  const getDeviceTypeLabel = (type: Device['type']): string => {
    const labels = {
      sensor: '传感器',
      gateway: '网关',
      controller: '控制器',
      actuator: '执行器'
    }
    return labels[type]
  }

  const getDeviceStatusLabel = (status: Device['status']): string => {
    const labels = {
      online: '在线',
      offline: '离线',
      warning: '警告',
      error: '错误'
    }
    return labels[status]
  }

  const getStatusPriority = (status: Device['status']): number => {
    const priorities = {
      error: 0,
      warning: 1,
      offline: 2,
      online: 3
    }
    return priorities[status]
  }

  // 异步操作
  const fetchDevices = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 模拟设备数据
      const mockDevices: Device[] = [
        {
          id: 'DEV-001',
          name: '温度传感器-001',
          type: 'sensor',
          status: 'online',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
            address: '北京市朝阳区'
          },
          metrics: {
            cpuUsage: 15.2,
            memoryUsage: 32.1,
            diskUsage: 45.6,
            networkThroughput: 12.3,
            temperature: 25.6,
            humidity: 45.2,
            pressure: 1013.2
          },
          lastUpdate: Date.now(),
          tags: ['环境监测', '高精度']
        },
        {
          id: 'DEV-002',
          name: '智能网关-001',
          type: 'gateway',
          status: 'warning',
          location: {
            latitude: 31.2304,
            longitude: 121.4737,
            address: '上海市浦东新区'
          },
          metrics: {
            cpuUsage: 78.5,
            memoryUsage: 85.2,
            diskUsage: 67.8,
            networkThroughput: 245.6,
            temperature: 42.1,
            humidity: 35.8,
            pressure: 1012.8
          },
          lastUpdate: Date.now() - 300000,
          tags: ['核心设备', '网络节点']
        },
        {
          id: 'DEV-003',
          name: 'PLC控制器-001',
          type: 'controller',
          status: 'online',
          location: {
            latitude: 23.1291,
            longitude: 113.2644,
            address: '广州市天河区'
          },
          metrics: {
            cpuUsage: 22.3,
            memoryUsage: 28.7,
            diskUsage: 15.4,
            networkThroughput: 18.9,
            temperature: 28.4,
            humidity: 52.1,
            pressure: 1013.5
          },
          lastUpdate: Date.now(),
          tags: ['工业控制', '自动化']
        }
      ]

      devices.value = mockDevices
      lastUpdateTime.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取设备数据失败'
      console.error('获取设备数据失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const refreshDevices = async () => {
    isRefreshing.value = true
    try {
      await fetchDevices()
    } finally {
      isRefreshing.value = false
    }
  }

  const selectDevice = (deviceId: string) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      selectedDevice.value = device
      fetchDeviceHistory(deviceId)
    }
  }

  const fetchDeviceHistory = async (deviceId: string, hours: number = 24) => {
    try {
      // 模拟获取设备历史数据
      const mockHistory: DeviceHistory[] = []
      const now = Date.now()
      const interval = 3600000 // 1小时间隔
      
      for (let i = hours; i >= 0; i--) {
        const timestamp = now - (i * interval)
        const baseMetrics = devices.value.find(d => d.id === deviceId)?.metrics
        
        if (baseMetrics) {
          mockHistory.push({
            deviceId,
            timestamp,
            metrics: {
              ...baseMetrics,
              cpuUsage: baseMetrics.cpuUsage + (Math.random() * 10 - 5),
              temperature: baseMetrics.temperature + (Math.random() * 3 - 1.5)
            },
            status: Math.random() > 0.1 ? 'online' : 'warning'
          })
        }
      }
      
      deviceHistory.value = mockHistory
    } catch (err) {
      console.error('获取设备历史数据失败:', err)
    }
  }

  const updateDeviceStatus = (deviceId: string, status: Device['status']) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.status = status
      device.lastUpdate = Date.now()
    }
  }

  const updateDeviceMetrics = (deviceId: string, metrics: Partial<Device['metrics']>) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.metrics = { ...device.metrics, ...metrics }
      device.lastUpdate = Date.now()
    }
  }

  const addDevice = (device: Omit<Device, 'id' | 'lastUpdate'>) => {
    const newDevice: Device = {
      ...device,
      id: `DEV-${String(devices.value.length + 1).padStart(3, '0')}`,
      lastUpdate: Date.now()
    }
    devices.value.push(newDevice)
  }

  const removeDevice = (deviceId: string) => {
    devices.value = devices.value.filter(d => d.id !== deviceId)
    if (selectedDevice.value?.id === deviceId) {
      selectedDevice.value = null
    }
  }

  const updateFilter = (filter: Partial<DeviceFilter>) => {
    deviceFilter.value = { ...deviceFilter.value, ...filter }
  }

  const updateConfig = (config: Partial<DeviceConfig>) => {
    deviceConfig.value = { ...deviceConfig.value, ...config }
  }

  const clearFilter = () => {
    deviceFilter.value = {
      status: [],
      type: [],
      tags: [],
      searchText: ''
    }
  }

  // 初始化
  const initialize = async () => {
    await fetchDevices()
    
    // 设置自动刷新
    if (deviceConfig.value.autoRefresh) {
      setInterval(refreshDevices, deviceConfig.value.pollingInterval)
    }
  }

  return {
    // 状态
    devices,
    selectedDevice,
    deviceHistory,
    deviceConfig,
    deviceFilter,
    isLoading,
    isRefreshing,
    lastUpdateTime,
    error,
    
    // 计算属性
    filteredDevices,
    groupedDevices,
    sortedDevices,
    deviceStats,
    selectedDeviceHistory,
    
    // 方法
    fetchDevices,
    refreshDevices,
    selectDevice,
    fetchDeviceHistory,
    updateDeviceStatus,
    updateDeviceMetrics,
    addDevice,
    removeDevice,
    updateFilter,
    updateConfig,
    clearFilter,
    initialize,
    
    // 辅助函数
    getDeviceTypeLabel,
    getDeviceStatusLabel
  }
})