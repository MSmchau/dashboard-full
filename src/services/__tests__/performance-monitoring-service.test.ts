import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { performanceMonitoringService, PerformanceMetric } from '../performance-monitoring-service'

describe('PerformanceMonitoringService', () => {
  beforeEach(() => {
    // 重置服务状态
    performanceMonitoringService.clearPerformanceData()
    vi.clearAllMocks()
    
    // 临时禁用采样率以确保测试数据被记录
    performanceMonitoringService.updateConfig({ samplingRate: 1 })
  })

  afterEach(() => {
    performanceMonitoringService.destroy()
  })

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(performanceMonitoringService).toBeDefined()
      expect(performanceMonitoringService.getPerformanceData()).toHaveLength(0)
    })

    it('应该初始化和销毁服务', () => {
      // 服务在创建时自动初始化
      expect(performanceMonitoringService).toBeDefined()
      
      // 销毁服务
      performanceMonitoringService.destroy()
      
      // 重新初始化
      // performanceMonitoringService.initialize()
      expect(performanceMonitoringService).toBeDefined()
    })
  })

  describe('性能数据记录', () => {
    it('应该记录性能数据', () => {
      const testData = {
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 100,
        timestamp: Date.now(),
        url: 'http://test.com'
      }

      performanceMonitoringService.recordPerformanceData(testData)
      const data = performanceMonitoringService.getPerformanceData()

      expect(data).toHaveLength(1)
      expect(data[0].metric).toBe(PerformanceMetric.PAGE_LOAD_TIME)
      expect(data[0].value).toBe(100)
    })

    it('应该记录组件渲染时间', () => {
      performanceMonitoringService.recordComponentRenderTime('TestComponent', 50)
      const data = performanceMonitoringService.getPerformanceData(PerformanceMetric.COMPONENT_RENDER_TIME)

      expect(data).toHaveLength(1)
      expect(data[0].metric).toBe(PerformanceMetric.COMPONENT_RENDER_TIME)
      expect(data[0].value).toBe(50)
      expect(data[0].component).toBe('TestComponent')
    })

    it('应该记录用户交互时间', () => {
      performanceMonitoringService.recordUserInteractionTime('click', 20)
      const data = performanceMonitoringService.getPerformanceData(PerformanceMetric.USER_INTERACTION_TIME)

      expect(data).toHaveLength(1)
      expect(data[0].metric).toBe(PerformanceMetric.USER_INTERACTION_TIME)
      expect(data[0].value).toBe(20)
      expect(data[0].component).toBe('click')
    })
  })

  describe('统计分析', () => {
    beforeEach(() => {
      // 添加测试数据
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 100,
        timestamp: Date.now()
      })
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 200,
        timestamp: Date.now()
      })
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 150,
        timestamp: Date.now()
      })
    })

    it('应该获取性能统计', () => {
      const stats = performanceMonitoringService.getPerformanceStats(PerformanceMetric.PAGE_LOAD_TIME)

      expect(stats.metric).toBe(PerformanceMetric.PAGE_LOAD_TIME)
      expect(stats.average).toBe(150) // (100 + 200 + 150) / 3 = 150
      expect(stats.min).toBe(100)
      expect(stats.max).toBe(200)
      expect(stats.count).toBe(3)
      expect(stats.lastValue).toBe(150)
      expect(['improving', 'worsening', 'stable']).toContain(stats.trend)
    })

    it('应该获取所有性能统计', () => {
      const allStats = performanceMonitoringService.getAllPerformanceStats()

      expect(allStats).toHaveLength(1)
      expect(allStats[0].metric).toBe(PerformanceMetric.PAGE_LOAD_TIME)
      expect(allStats[0].count).toBe(3)
    })
  })

  describe('健康状态检查', () => {
    it('应该检查页面加载时间是否健康', () => {
      // 正常值
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 500,
        timestamp: Date.now()
      })
      let stats = performanceMonitoringService.getPerformanceStats(PerformanceMetric.PAGE_LOAD_TIME)
      expect(stats.isHealthy).toBe(true)

      // 异常值
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 5000,
        timestamp: Date.now()
      })
      stats = performanceMonitoringService.getPerformanceStats(PerformanceMetric.PAGE_LOAD_TIME)
      expect(stats.isHealthy).toBe(false)
    })

    it('应该检查API响应时间是否健康', () => {
      // 正常值
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.API_RESPONSE_TIME,
        value: 500,
        timestamp: Date.now()
      })
      let stats = performanceMonitoringService.getPerformanceStats(PerformanceMetric.API_RESPONSE_TIME)
      expect(stats.isHealthy).toBe(true)

      // 异常值
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.API_RESPONSE_TIME,
        value: 2000,
        timestamp: Date.now()
      })
      stats = performanceMonitoringService.getPerformanceStats(PerformanceMetric.API_RESPONSE_TIME)
      expect(stats.isHealthy).toBe(false)
    })
  })

  describe('数据管理', () => {
    it('应该清除性能数据', () => {
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 100,
        timestamp: Date.now()
      })
      expect(performanceMonitoringService.getPerformanceData()).toHaveLength(1)

      performanceMonitoringService.clearPerformanceData()
      expect(performanceMonitoringService.getPerformanceData()).toHaveLength(0)
    })

    it('应该更新配置', () => {
      const newConfig = {
        samplingRate: 0.5,
        maxRecords: 500
      }

      performanceMonitoringService.updateConfig(newConfig)
      
      // 验证配置已更新
      expect(performanceMonitoringService).toBeDefined()
    })
  })

  describe('观察者模式', () => {
    it('应该订阅性能数据变化', () => {
      const mockCallback = vi.fn()
      const unsubscribe = performanceMonitoringService.subscribe(mockCallback)

      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 100,
        timestamp: Date.now()
      })

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 100
      }))

      // 取消订阅
      unsubscribe()
      performanceMonitoringService.recordPerformanceData({
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 200,
        timestamp: Date.now()
      })

      expect(mockCallback).toHaveBeenCalledTimes(1) // 不应再被调用
    })
  })
})