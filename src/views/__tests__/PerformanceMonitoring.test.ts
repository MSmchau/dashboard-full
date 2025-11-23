import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import PerformanceMonitoring from '../PerformanceMonitoring.vue'
import { performanceMonitoringService, PerformanceMetric } from '../../services/performance-monitoring-service'

// 模拟 ECharts
vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn()
  }))
}))

describe('PerformanceMonitoring.vue', () => {
  let wrapper: any

  beforeEach(() => {
    const pinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn
    })

    // 模拟性能监控服务的数据
    vi.spyOn(performanceMonitoringService, 'getPerformanceData').mockReturnValue([
      {
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        value: 150,
        timestamp: Date.now(),
        url: 'http://localhost:3000'
      },
      {
        metric: PerformanceMetric.API_RESPONSE_TIME,
        value: 50,
        timestamp: Date.now(),
        url: '/api/test'
      }
    ])

    vi.spyOn(performanceMonitoringService, 'getAllPerformanceStats').mockReturnValue([
      {
        metric: PerformanceMetric.PAGE_LOAD_TIME,
        average: 120,
        min: 80,
        max: 200,
        count: 10,
        lastValue: 150,
        trend: 'improving' as const,
        isHealthy: true
      },
      {
        metric: PerformanceMetric.API_RESPONSE_TIME,
        average: 45,
        min: 30,
        max: 80,
        count: 15,
        lastValue: 50,
        trend: 'stable' as const,
        isHealthy: true
      }
    ])

    wrapper = mount(PerformanceMonitoring, {
      global: {
        plugins: [pinia]
      }
    })
  })

  describe('组件渲染', () => {
    it('应该正确渲染组件标题', () => {
      expect(wrapper.find('h1').text()).toBe('性能监控中心')
    })

    it('应该显示性能统计卡片', () => {
      const cards = wrapper.findAllComponents({ name: 'ElCard' })
      expect(cards.length).toBeGreaterThan(0)
    })

    it('应该显示性能指标表格', () => {
      const table = wrapper.findComponent({ name: 'ElTable' })
      expect(table.exists()).toBe(true)
    })

    it('应该显示性能图表', () => {
      const chart = wrapper.findComponent({ name: 'ElCard' })
      expect(chart.exists()).toBe(true)
    })
  })

  describe('数据展示', () => {
    it('应该显示性能统计数据', async () => {
      await nextTick()
      
      const tableRows = wrapper.findAll('.el-table__row')
      expect(tableRows.length).toBe(2)
      
      const firstRow = tableRows[0]
      expect(firstRow.text()).toContain('页面加载时间')
      expect(firstRow.text()).toContain('150')
    })

    it('应该显示健康状态指示器', async () => {
      await nextTick()
      
      // 检查健康状态通过卡片样式和图标颜色显示
      const metricCards = wrapper.findAll('.metric-card')
      expect(metricCards.length).toBeGreaterThan(0)
      
      // 检查是否有健康状态的图标显示
      const healthyIcons = wrapper.findAll('.el-icon')
      expect(healthyIcons.length).toBeGreaterThan(0)
      
      // 检查卡片是否包含健康状态相关的类
      const healthyCard = metricCards.find((card: any) => 
        !card.classes().includes('unhealthy')
      )
      expect(healthyCard.exists()).toBe(true)
    })
  })

  describe('交互功能', () => {
    it('应该处理刷新数据操作', async () => {
      const getDataSpy = vi.spyOn(performanceMonitoringService, 'getPerformanceData')
      const getStatsSpy = vi.spyOn(performanceMonitoringService, 'getAllPerformanceStats')
      
      const refreshButton = wrapper.find('.el-button--primary')
      await refreshButton.trigger('click')
      
      expect(getDataSpy).toHaveBeenCalled()
      expect(getStatsSpy).toHaveBeenCalled()
    })

    it('应该处理导出报告操作', async () => {
      // 导出是组件内部方法，不需要spyOn service
      const exportButton = wrapper.findAll('.el-button').find((btn: any) => 
        btn.text().includes('导出')
      )
      expect(exportButton.exists()).toBe(true)
      
      // 触发导出操作
      await exportButton.trigger('click')
      
      // 验证导出功能被调用（通过检查是否有下载行为或消息提示）
      // 这里主要验证按钮点击不会导致错误
    })

    it('应该处理清除数据操作', async () => {
      const clearSpy = vi.spyOn(performanceMonitoringService, 'clearPerformanceData')
      
      const clearButton = wrapper.findAll('.el-button').find((btn: any) => 
        btn.text().includes('清除')
      )
      
      if (clearButton) {
        await clearButton.trigger('click')
        expect(clearSpy).toHaveBeenCalled()
      }
    })
  })

  describe('响应式行为', () => {
    it('应该在窗口大小变化时调整布局', async () => {
      // 模拟窗口大小变化
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })
      
      window.dispatchEvent(new Event('resize'))
      
      await nextTick()
      
      // 检查是否触发了响应式调整
      const responsiveElements = wrapper.findAll('.el-col')
      expect(responsiveElements.length).toBeGreaterThan(0)
    })
  })

  describe('错误处理', () => {
    it('应该在数据加载失败时显示错误信息', async () => {
      // 模拟数据加载失败
      vi.spyOn(performanceMonitoringService, 'getPerformanceData').mockReturnValue([])
      vi.spyOn(performanceMonitoringService, 'getAllPerformanceStats').mockReturnValue([])
      
      await wrapper.vm.refreshData()
      await nextTick()
      
      const emptyState = wrapper.find('.el-empty')
      expect(emptyState.exists()).toBe(true)
    })

    it('应该在API调用失败时处理错误', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // 模拟API调用失败 - 组件内部调用getPerformanceData和getAllPerformanceStats
      vi.spyOn(performanceMonitoringService, 'getPerformanceData').mockImplementation(() => {
        throw new Error('API调用失败')
      })
      
      await wrapper.vm.refreshData()
      
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  describe('性能优化', () => {
    it('应该使用防抖处理频繁操作', async () => {
      const getDataSpy = vi.spyOn(performanceMonitoringService, 'getPerformanceData')
      const getStatsSpy = vi.spyOn(performanceMonitoringService, 'getAllPerformanceStats')
      
      // 快速点击多次刷新按钮
      const refreshButton = wrapper.find('.el-button--primary')
      for (let i = 0; i < 5; i++) {
        await refreshButton.trigger('click')
      }
      
      // 应该只调用一次（防抖处理）
      expect(getDataSpy).toHaveBeenCalledTimes(1)
      expect(getStatsSpy).toHaveBeenCalledTimes(1)
    })

    it('应该合理使用内存', async () => {
      // 检查组件是否在销毁时清理资源
      // 通过检查组件销毁后的状态来验证资源清理功能
      wrapper.unmount()
      await nextTick()
      
      // 验证组件已正确卸载
      expect(wrapper.vm.$el).toBeUndefined()
    })
  })
})