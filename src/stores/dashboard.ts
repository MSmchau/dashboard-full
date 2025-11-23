import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 数据类型定义
interface DashboardData {
  timestamp: number
  metrics: {
    totalDevices: number
    onlineDevices: number
    offlineDevices: number
    successRate: number
    responseTime: number
    throughput: number
  }
  charts: {
    deviceStatus: Array<{ name: string; value: number }>
    performanceTrend: Array<{ time: string; value: number }>
    geographicDistribution: Array<{ name: string; value: number }>
  }
  alerts: Array<{
    id: string
    level: 'info' | 'warning' | 'error' | 'critical'
    title: string
    message: string
    timestamp: number
    resolved: boolean
  }>
}

interface DashboardConfig {
  theme: 'light' | 'dark' | 'auto'
  layout: 'grid' | 'free'
  refreshInterval: number
  autoRefresh: boolean
  chartTypes: {
    [key: string]: string
  }
}

export const useDashboardStore = defineStore('dashboard', () => {
  // 状态
  const dashboardData = ref<DashboardData>({
    timestamp: Date.now(),
    metrics: {
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      successRate: 0,
      responseTime: 0,
      throughput: 0
    },
    charts: {
      deviceStatus: [],
      performanceTrend: [],
      geographicDistribution: []
    },
    alerts: []
  })

  const dashboardConfig = ref<DashboardConfig>({
    theme: 'dark',
    layout: 'grid',
    refreshInterval: 5000,
    autoRefresh: true,
    chartTypes: {
      deviceStatus: 'pie',
      performanceTrend: 'line',
      geographicDistribution: 'map'
    }
  })

  const isLoading = ref(false)
  const lastUpdateTime = ref<number>(Date.now())
  const error = ref<string | null>(null)

  // 计算属性
  const onlineRate = computed(() => {
    const { totalDevices, onlineDevices } = dashboardData.value.metrics
    return totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0
  })

  const criticalAlerts = computed(() => {
    return dashboardData.value.alerts.filter(alert => 
      alert.level === 'critical' && !alert.resolved
    )
  })

  const unresolvedAlerts = computed(() => {
    return dashboardData.value.alerts.filter(alert => !alert.resolved)
  })

  const chartData = computed(() => {
    return {
      deviceStatus: dashboardData.value.charts.deviceStatus,
      performanceTrend: dashboardData.value.charts.performanceTrend,
      geographicDistribution: dashboardData.value.charts.geographicDistribution
    }
  })

  // 异步操作
  const fetchDashboardData = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟数据
      const mockData: DashboardData = {
        timestamp: Date.now(),
        metrics: {
          totalDevices: 156,
          onlineDevices: 142,
          offlineDevices: 14,
          successRate: 98.7,
          responseTime: 156,
          throughput: 2450
        },
        charts: {
          deviceStatus: [
            { name: '在线', value: 142 },
            { name: '离线', value: 14 }
          ],
          performanceTrend: [
            { time: '09:00', value: 95.2 },
            { time: '10:00', value: 96.8 },
            { time: '11:00', value: 97.5 },
            { time: '12:00', value: 98.1 },
            { time: '13:00', value: 98.7 },
            { time: '14:00', value: 99.2 }
          ],
          geographicDistribution: [
            { name: '北京', value: 45 },
            { name: '上海', value: 38 },
            { name: '广州', value: 29 },
            { name: '深圳', value: 24 },
            { name: '杭州', value: 20 }
          ]
        },
        alerts: [
          {
            id: '1',
            level: 'warning',
            title: '设备响应延迟',
            message: '设备ID: DEV-001 响应时间超过阈值',
            timestamp: Date.now() - 300000,
            resolved: false
          },
          {
            id: '2',
            level: 'error',
            title: '数据同步失败',
            message: '数据湖同步任务失败',
            timestamp: Date.now() - 600000,
            resolved: false
          }
        ]
      }

      dashboardData.value = mockData
      lastUpdateTime.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取数据失败'
      console.error('获取仪表板数据失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const updateMetric = (metricKey: keyof DashboardData['metrics'], value: number) => {
    dashboardData.value.metrics[metricKey] = value
    dashboardData.value.timestamp = Date.now()
  }

  const addAlert = (alert: Omit<DashboardData['alerts'][0], 'id' | 'timestamp'>) => {
    const newAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    dashboardData.value.alerts.unshift(newAlert)
  }

  const resolveAlert = (alertId: string) => {
    const alert = dashboardData.value.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
    }
  }

  const updateConfig = (config: Partial<DashboardConfig>) => {
    dashboardConfig.value = { ...dashboardConfig.value, ...config }
  }

  const setChartType = (chartKey: string, chartType: string) => {
    dashboardConfig.value.chartTypes[chartKey] = chartType
  }

  const toggleAutoRefresh = () => {
    dashboardConfig.value.autoRefresh = !dashboardConfig.value.autoRefresh
  }

  const setRefreshInterval = (interval: number) => {
    dashboardConfig.value.refreshInterval = interval
  }

  const switchTheme = (theme: DashboardConfig['theme']) => {
    dashboardConfig.value.theme = theme
    // 这里可以添加主题切换的逻辑
    document.documentElement.setAttribute('data-theme', theme)
  }

  // 初始化
  const initialize = async () => {
    await fetchDashboardData()
    
    // 设置自动刷新
    if (dashboardConfig.value.autoRefresh) {
      setInterval(fetchDashboardData, dashboardConfig.value.refreshInterval)
    }
  }

  // 重置状态
  const reset = () => {
    dashboardData.value = {
      timestamp: Date.now(),
      metrics: {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        successRate: 0,
        responseTime: 0,
        throughput: 0
      },
      charts: {
        deviceStatus: [],
        performanceTrend: [],
        geographicDistribution: []
      },
      alerts: []
    }
    error.value = null
    isLoading.value = false
  }

  return {
    // 状态
    dashboardData,
    dashboardConfig,
    isLoading,
    lastUpdateTime,
    error,
    
    // 计算属性
    onlineRate,
    criticalAlerts,
    unresolvedAlerts,
    chartData,
    
    // 方法
    fetchDashboardData,
    updateMetric,
    addAlert,
    resolveAlert,
    updateConfig,
    setChartType,
    toggleAutoRefresh,
    setRefreshInterval,
    switchTheme,
    initialize,
    reset
  }
})