// 性能监控服务
// 用于监控应用性能指标，包括加载时间、内存使用、FPS等

export enum PerformanceMetric {
  // 加载性能
  PAGE_LOAD_TIME = 'page_load_time',
  FIRST_CONTENTFUL_PAINT = 'first_contentful_paint',
  LARGEST_CONTENTFUL_PAINT = 'largest_contentful_paint',
  FIRST_INPUT_DELAY = 'first_input_delay',
  CUMULATIVE_LAYOUT_SHIFT = 'cumulative_layout_shift',
  
  // 运行时性能
  FPS = 'fps',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  NETWORK_LATENCY = 'network_latency',
  
  // 自定义指标
  COMPONENT_RENDER_TIME = 'component_render_time',
  API_RESPONSE_TIME = 'api_response_time',
  USER_INTERACTION_TIME = 'user_interaction_time'
}

export interface PerformanceData {
  metric: PerformanceMetric
  value: number
  timestamp: number
  component?: string
  url?: string
  userAgent?: string
  extraInfo?: Record<string, any>
}

export interface PerformanceStats {
  metric: PerformanceMetric
  average: number
  min: number
  max: number
  count: number
  lastValue: number
  trend: 'improving' | 'worsening' | 'stable'
  threshold?: number
  isHealthy: boolean
}

export interface PerformanceConfig {
  enabled: boolean
  samplingRate: number // 采样率 (0-1)
  maxRecords: number
  reportInterval: number // 报告间隔(ms)
  thresholds: {
    [key in PerformanceMetric]?: number
  }
}

class PerformanceMonitoringService {
  private config: PerformanceConfig = {
    enabled: true,
    samplingRate: 0.1, // 10%采样率
    maxRecords: 1000,
    reportInterval: 60000, // 1分钟
    thresholds: {
      [PerformanceMetric.PAGE_LOAD_TIME]: 3000, // 3秒
      [PerformanceMetric.FIRST_CONTENTFUL_PAINT]: 2500, // 2.5秒
      [PerformanceMetric.LARGEST_CONTENTFUL_PAINT]: 4000, // 4秒
      [PerformanceMetric.FIRST_INPUT_DELAY]: 100, // 100ms
      [PerformanceMetric.FPS]: 30, // 30FPS
      [PerformanceMetric.API_RESPONSE_TIME]: 1000, // 1秒
    }
  }

  private performanceData: PerformanceData[] = []
  private observers: ((data: PerformanceData) => void)[] = []
  private reportTimer: NodeJS.Timeout | null = null

  constructor() {
    this.initialize()
  }

  // 初始化性能监控
  private initialize() {
    if (!this.config.enabled) return

    // 设置性能观察器
    this.setupPerformanceObservers()
    
    // 设置FPS监控
    this.setupFPSMonitoring()
    
    // 设置内存监控
    this.setupMemoryMonitoring()
    
    // 设置网络监控
    this.setupNetworkMonitoring()
    
    // 启动定期报告
    this.startPeriodicReporting()
  }

  // 设置性能观察器
  private setupPerformanceObservers() {
    if ('PerformanceObserver' in window) {
      // 监控页面加载性能
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetrics(entry as PerformanceNavigationTiming)
          }
        })
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })

      // 监控绘制性能
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.recordPerformanceData({
              metric: PerformanceMetric.FIRST_CONTENTFUL_PAINT,
              value: entry.startTime,
              timestamp: Date.now(),
              url: window.location.href
            })
          }
        })
      })
      paintObserver.observe({ entryTypes: ['paint'] })

      // 监控布局偏移
      const layoutShiftObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          // 检查entry是否有value属性（LayoutShiftEntry类型）
          if ('value' in entry && typeof entry.value === 'number') {
            this.recordPerformanceData({
              metric: PerformanceMetric.CUMULATIVE_LAYOUT_SHIFT,
              value: entry.value,
              timestamp: Date.now(),
              url: window.location.href
            })
          }
        })
      })
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })

      // 监控最大内容绘制
      const largestContentfulPaintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          this.recordPerformanceData({
            metric: PerformanceMetric.LARGEST_CONTENTFUL_PAINT,
            value: lastEntry.startTime,
            timestamp: Date.now(),
            url: window.location.href
          })
        }
      })
      largestContentfulPaintObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    }
  }

  // 记录导航指标
  private recordNavigationMetrics(navigationEntry: PerformanceNavigationTiming) {
    const metrics = {
      [PerformanceMetric.PAGE_LOAD_TIME]: navigationEntry.loadEventEnd - (navigationEntry as any).navigationStart,
      [PerformanceMetric.FIRST_CONTENTFUL_PAINT]: navigationEntry.domContentLoadedEventEnd - (navigationEntry as any).navigationStart,
    }

    Object.entries(metrics).forEach(([metric, value]) => {
      if (value > 0) {
        this.recordPerformanceData({
          metric: metric as PerformanceMetric,
          value,
          timestamp: Date.now(),
          url: window.location.href,
          extraInfo: {
            navigationType: navigationEntry.type,
            redirectCount: navigationEntry.redirectCount
          }
        })
      }
    })
  }

  // 设置FPS监控
  private setupFPSMonitoring() {
    let lastTime = performance.now()
    let frames = 0

    const checkFPS = () => {
      frames++
      const currentTime = performance.now()
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime))
        
        this.recordPerformanceData({
          metric: PerformanceMetric.FPS,
          value: fps,
          timestamp: Date.now(),
          url: window.location.href
        })
        
        frames = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(checkFPS)
    }
    
    requestAnimationFrame(checkFPS)
  }

  // 设置内存监控
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memoryInfo = (performance as any).memory
        if (memoryInfo) {
          this.recordPerformanceData({
            metric: PerformanceMetric.MEMORY_USAGE,
            value: memoryInfo.usedJSHeapSize / 1024 / 1024, // MB
            timestamp: Date.now(),
            url: window.location.href,
            extraInfo: {
              totalJSHeapSize: memoryInfo.totalJSHeapSize / 1024 / 1024,
              jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit / 1024 / 1024
            }
          })
        }
        
        setTimeout(checkMemory, 5000) // 每5秒检查一次
      }
      
      checkMemory()
    }
  }

  // 设置网络监控
  private setupNetworkMonitoring() {
    // 重写fetch方法监控API响应时间
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const startTime = performance.now()
      
      try {
        const response = await originalFetch.apply(window, args)
        const endTime = performance.now()
        
        this.recordPerformanceData({
          metric: PerformanceMetric.API_RESPONSE_TIME,
          value: endTime - startTime,
          timestamp: Date.now(),
          url: args[0] as string,
          extraInfo: {
            status: response.status,
            method: args[1]?.method || 'GET'
          }
        })
        
        return response
      } catch (error) {
        const endTime = performance.now()
        
        this.recordPerformanceData({
          metric: PerformanceMetric.API_RESPONSE_TIME,
          value: endTime - startTime,
          timestamp: Date.now(),
          url: args[0] as string,
          extraInfo: {
            error: error instanceof Error ? error.message : String(error),
            method: args[1]?.method || 'GET'
          }
        })
        
        throw error
      }
    }
  }

  // 记录性能数据
  recordPerformanceData(data: PerformanceData) {
    // 采样控制
    if (Math.random() > this.config.samplingRate) return

    this.performanceData.push(data)
    
    // 限制记录数量
    if (this.performanceData.length > this.config.maxRecords) {
      this.performanceData = this.performanceData.slice(-this.config.maxRecords)
    }
    
    // 通知观察者
    this.notifyObservers(data)
  }

  // 记录组件渲染时间
  recordComponentRenderTime(componentName: string, renderTime: number) {
    this.recordPerformanceData({
      metric: PerformanceMetric.COMPONENT_RENDER_TIME,
      value: renderTime,
      timestamp: Date.now(),
      component: componentName,
      url: window.location.href
    })
  }

  // 记录用户交互时间
  recordUserInteractionTime(interactionType: string, duration: number) {
    this.recordPerformanceData({
      metric: PerformanceMetric.USER_INTERACTION_TIME,
      value: duration,
      timestamp: Date.now(),
      component: interactionType,
      url: window.location.href
    })
  }

  // 获取性能数据
  getPerformanceData(metric?: PerformanceMetric, limit = 100): PerformanceData[] {
    let data = this.performanceData
    
    if (metric) {
      data = data.filter(item => item.metric === metric)
    }
    
    return data.slice(-limit)
  }

  // 获取性能统计
  getPerformanceStats(metric: PerformanceMetric): PerformanceStats {
    const data = this.getPerformanceData(metric)
    const values = data.map(item => item.value)
    
    if (values.length === 0) {
      return {
        metric,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        lastValue: 0,
        trend: 'stable',
        isHealthy: true
      }
    }
    
    const average = values.reduce((sum, val) => sum + val, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const lastValue = values[values.length - 1]
    
    // 简单趋势计算
    const recentValues = values.slice(-10)
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
    const overallAvg = values.reduce((sum, val) => sum + val, 0) / values.length
    
    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (recentAvg < overallAvg * 0.9) trend = 'improving'
    else if (recentAvg > overallAvg * 1.1) trend = 'worsening'
    
    const threshold = this.config.thresholds[metric]
    const isHealthy = threshold ? lastValue <= threshold : true
    
    return {
      metric,
      average,
      min,
      max,
      count: values.length,
      lastValue,
      trend,
      threshold,
      isHealthy
    }
  }

  // 获取所有性能统计
  getAllPerformanceStats(): PerformanceStats[] {
    return Object.values(PerformanceMetric).map(metric => 
      this.getPerformanceStats(metric)
    ).filter(stat => stat.count > 0)
  }

  // 订阅性能数据变化
  subscribe(callback: (data: PerformanceData) => void): () => void {
    this.observers.push(callback)
    
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback)
    }
  }

  // 通知观察者
  private notifyObservers(data: PerformanceData) {
    this.observers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Performance observer error:', error)
      }
    })
  }

  // 启动定期报告
  private startPeriodicReporting() {
    this.reportTimer = setInterval(() => {
      this.reportPerformanceMetrics()
    }, this.config.reportInterval)
  }

  // 报告性能指标
  private reportPerformanceMetrics() {
    const stats = this.getAllPerformanceStats()
    
    // 这里可以发送性能报告到后端或第三方服务
    console.log('Performance Metrics Report:', {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      stats
    })
    
    // 检查性能异常
    const unhealthyStats = stats.filter(stat => !stat.isHealthy)
    if (unhealthyStats.length > 0) {
      console.warn('Performance issues detected:', unhealthyStats)
    }
  }

  // 清理性能数据
  clearPerformanceData() {
    this.performanceData = []
  }

  // 更新配置
  updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig }
    
    // 重新初始化
    if (this.reportTimer) {
      clearInterval(this.reportTimer)
    }
    
    if (this.config.enabled) {
      this.startPeriodicReporting()
    }
  }

  // 销毁服务
  destroy() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer)
      this.reportTimer = null
    }
    
    this.observers = []
    this.performanceData = []
  }
}

// 创建单例实例
export const performanceMonitoringService = new PerformanceMonitoringService()

export default PerformanceMonitoringService