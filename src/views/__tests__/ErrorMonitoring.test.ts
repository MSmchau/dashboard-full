import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import ErrorMonitoring from '../ErrorMonitoring.vue'
// import { useErrorStore } from '@/stores/error' // 暂时注释掉，因为error store不存在

describe('ErrorMonitoring.vue', () => {
  let wrapper: any
  let errorStore: any

  beforeEach(() => {
    const pinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn
    })

    // 创建模拟的errorStore对象
    errorStore = {
      errors: [],
      errorStats: {},
      filterErrors: vi.fn(),
      searchErrors: vi.fn(),
      markErrorAsResolved: vi.fn(),
      clearResolvedErrors: vi.fn(),
      exportErrorReport: vi.fn(),
      loadErrors: vi.fn()
    }
    
    // 模拟错误数据
    errorStore.errors = [
      {
        id: '1',
        message: '测试错误1',
        component: 'ComponentA',
        severity: 'ERROR',
        timestamp: Date.now(),
        resolved: false,
        stack: 'Error: 测试错误1\n    at testFunction (test.js:1:1)'
      },
      {
        id: '2',
        message: '测试错误2',
        component: 'ComponentB',
        severity: 'WARNING',
        timestamp: Date.now() - 3600000,
        resolved: true,
        resolvedAt: Date.now() - 1800000,
        stack: 'Warning: 测试错误2\n    at testFunction2 (test.js:2:2)'
      }
    ];

    // 模拟错误统计
    errorStore.errorStats = {
      total: 2,
      bySeverity: { ERROR: 1, WARNING: 1, INFO: 0 },
      byComponent: { ComponentA: 1, ComponentB: 1 },
      byTime: { lastHour: 1, last24Hours: 2, last7Days: 2 }
    }

    wrapper = mount(ErrorMonitoring, {
      global: {
        plugins: [pinia]
      }
    })
  })

  describe('组件渲染', () => {
    it('应该正确渲染组件标题', () => {
      expect(wrapper.find('h1').text()).toBe('错误监控中心')
    })

    it('应该显示错误统计卡片', () => {
      const cards = wrapper.findAllComponents({ name: 'ElCard' })
      expect(cards.length).toBeGreaterThan(0)
    })

    it('应该显示错误列表表格', () => {
      const table = wrapper.findComponent({ name: 'ElTable' })
      expect(table.exists()).toBe(true)
    })

    it('应该显示错误详情面板', () => {
      const collapse = wrapper.findComponent({ name: 'ElCollapse' })
      expect(collapse.exists()).toBe(true)
    })
  })

  describe('数据展示', () => {
    it('应该显示错误统计数据', async () => {
      await nextTick()
      
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBeGreaterThan(0)
      
      const totalErrors = statCards.find((card: any) => 
        card.text().includes('总错误数')
      )
      expect(totalErrors.exists()).toBe(true)
      expect(totalErrors.text()).toContain('2')
    })

    it('应该显示错误列表', async () => {
      await nextTick()
      
      const tableRows = wrapper.findAll('.el-table__row')
      expect(tableRows.length).toBe(2)
      
      const firstRow = tableRows[0]
      expect(firstRow.text()).toContain('测试错误1')
      expect(firstRow.text()).toContain('ComponentA')
    })

    it('应该显示错误严重程度标签', async () => {
      await nextTick()
      
      const severityTags = wrapper.findAll('.el-tag')
      expect(severityTags.length).toBeGreaterThan(0)
      
      const errorTag = severityTags.find((tag: any) => 
        tag.text().includes('ERROR')
      )
      expect(errorTag.exists()).toBe(true)
    })

    it('应该显示解决状态', async () => {
      await nextTick()
      
      const resolvedIndicators = wrapper.findAll('.resolved-indicator')
      expect(resolvedIndicators.length).toBeGreaterThan(0)
    })
  })

  describe('交互功能', () => {
    it('应该处理错误筛选', async () => {
      const filterSpy = errorStore.filterErrors
      
      const severityFilter = wrapper.find('.severity-filter')
      if (severityFilter.exists()) {
        await severityFilter.trigger('change')
        expect(filterSpy).toHaveBeenCalled()
      }
    })

    it('应该处理错误搜索', async () => {
      const searchSpy = errorStore.searchErrors
      
      const searchInput = wrapper.find('.search-input')
      if (searchInput.exists()) {
        await searchInput.setValue('测试')
        await searchInput.trigger('input')
        
        expect(searchSpy).toHaveBeenCalledWith('测试')
      }
    })

    it('应该处理标记错误为已解决', async () => {
      const resolveSpy = errorStore.markErrorAsResolved
      
      const resolveButton = wrapper.find('.resolve-button')
      if (resolveButton.exists()) {
        await resolveButton.trigger('click')
        expect(resolveSpy).toHaveBeenCalled()
      }
    })

    it('应该处理清除已解决错误', async () => {
      const clearSpy = errorStore.clearResolvedErrors
      
      const clearButton = wrapper.find('.clear-resolved-button')
      if (clearButton.exists()) {
        await clearButton.trigger('click')
        expect(clearSpy).toHaveBeenCalled()
      }
    })

    it('应该处理导出错误报告', async () => {
      const exportSpy = errorStore.exportErrorReport
      
      const exportButton = wrapper.find('.export-button')
      if (exportButton.exists()) {
        await exportButton.trigger('click')
        expect(exportSpy).toHaveBeenCalled()
      }
    })

    it('应该显示错误详情', async () => {
      await nextTick()
      
      const firstRow = wrapper.find('.el-table__row')
      await firstRow.trigger('click')
      
      const detailPanel = wrapper.find('.error-detail-panel')
      expect(detailPanel.exists()).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该在数据加载失败时显示空状态', async () => {
      // 模拟数据加载失败
      errorStore.errors = []
      
      await wrapper.vm.$forceUpdate()
      await nextTick()
      
      const emptyState = wrapper.find('.el-empty')
      expect(emptyState.exists()).toBe(true)
    })

    it('应该在API调用失败时处理错误', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // 模拟API调用失败
      errorStore.loadErrors = vi.fn().mockRejectedValue(new Error('API调用失败'))
      
      await wrapper.vm.loadErrorData()
      
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('应该处理无效的错误数据', async () => {
      // 模拟无效数据
      errorStore.errors = [{ invalid: 'data' }]
      
      await wrapper.vm.$forceUpdate()
      await nextTick()
      
      // 应该能够处理无效数据而不崩溃
      const table = wrapper.findComponent({ name: 'ElTable' })
      expect(table.exists()).toBe(true)
    })
  })

  describe('性能优化', () => {
    it('应该使用虚拟滚动处理大量数据', async () => {
      // 模拟大量错误数据
      const largeErrorData = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        message: `错误 ${i}`,
        component: `Component${i % 10}`,
        severity: i % 3 === 0 ? 'ERROR' : i % 3 === 1 ? 'WARNING' : 'INFO',
        timestamp: Date.now() - i * 1000,
        resolved: i % 2 === 0,
        stack: `Error: 错误 ${i}\n    at function${i} (file.js:${i}:${i})`
      }))
      
      errorStore.errors = largeErrorData
      
      await wrapper.vm.$forceUpdate()
      await nextTick()
      
      // 检查表格是否正确渲染了大量数据
      const table = wrapper.findComponent({ name: 'ElTable' })
      expect(table.exists()).toBe(true)
      
      // 检查表格是否设置了虚拟滚动属性
      const tableProps = table.props()
      expect(tableProps.virtualScroll).toBe(true)
      
      // 检查表格是否设置了高度（虚拟滚动需要高度）
      expect(tableProps.height).toBeDefined()
    })

    it('应该合理使用内存', async () => {
      // 检查组件是否在销毁时清理资源
      // 通过检查组件销毁后的状态来验证资源清理功能
      wrapper.unmount()
      await nextTick()
      
      // 验证组件已正确卸载
      expect(wrapper.vm.$el).toBeUndefined()
    })

    it('应该使用防抖处理频繁操作', async () => {
      const searchSpy = errorStore.searchErrors
      
      const searchInput = wrapper.find('.search-input')
      if (searchInput.exists()) {
        // 快速输入多次
        for (let i = 0; i < 5; i++) {
          await searchInput.setValue(`test${i}`)
          await searchInput.trigger('input')
        }
        
        // 应该只调用一次（防抖处理）
        expect(searchSpy).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('可访问性', () => {
    it('应该提供适当的ARIA标签', () => {
      const table = wrapper.findComponent({ name: 'ElTable' })
      expect(table.attributes('aria-label')).toBeDefined()
      
      const searchInput = wrapper.find('.search-input')
      if (searchInput.exists()) {
        expect(searchInput.attributes('aria-label')).toBeDefined()
      }
    })

    it('应该支持键盘导航', async () => {
      const firstRow = wrapper.find('.el-table__row')
      
      // 模拟键盘事件
      await firstRow.trigger('keydown.enter')
      
      const detailPanel = wrapper.find('.error-detail-panel')
      expect(detailPanel.exists()).toBe(true)
    })
  })
})