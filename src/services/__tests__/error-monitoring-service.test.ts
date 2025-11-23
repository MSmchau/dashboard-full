import { describe, it, expect, beforeEach, vi } from 'vitest'
import { errorMonitoringService, ErrorLevel } from '../error-monitoring-service'

describe('ErrorMonitoringService', () => {
  beforeEach(() => {
    // 重置服务状态
    errorMonitoringService.clearErrors()
    vi.clearAllMocks()
  })

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(errorMonitoringService).toBeDefined()
      expect(errorMonitoringService.getErrors()).toHaveLength(0)
    })

    it('应该正确销毁服务', () => {
      expect(() => errorMonitoringService.destroy()).not.toThrow()
    })
  })

  describe('错误记录', () => {
    it('应该记录JavaScript错误', () => {
      const errorId = errorMonitoringService.captureError('测试错误', ErrorLevel.ERROR, {}, '测试组件')

      const errors = errorMonitoringService.getErrors()
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('测试错误')
      expect(errors[0].component).toBe('测试组件')
      expect(errors[0].level).toBe(ErrorLevel.ERROR)
      expect(errorId).toBeTruthy()
    })

    it('应该记录不同级别的错误', () => {
      errorMonitoringService.captureError('警告消息', ErrorLevel.WARNING, {}, '测试功能')
      errorMonitoringService.captureError('信息消息', ErrorLevel.INFO, {}, '测试功能')

      const errors = errorMonitoringService.getErrors()
      expect(errors).toHaveLength(2)
      expect(errors[0].level).toBe(ErrorLevel.WARNING)
      expect(errors[1].level).toBe(ErrorLevel.INFO)
    })

    it('应该记录带上下文的错误', () => {
      const context = { userId: '123', action: 'login' }
      errorMonitoringService.captureError('带上下文的错误', ErrorLevel.ERROR, context, '认证组件')

      const errors = errorMonitoringService.getErrors()
      expect(errors).toHaveLength(1)
      expect(errors[0].context).toEqual(context)
    })
  })

  describe('错误统计', () => {
    beforeEach(() => {
      // 添加测试错误数据
      errorMonitoringService.captureError('错误1', ErrorLevel.ERROR, {}, '组件1')
      errorMonitoringService.captureError('错误2', ErrorLevel.ERROR, {}, '组件2')
      errorMonitoringService.captureError('警告消息', ErrorLevel.WARNING, {}, '功能1')
      errorMonitoringService.captureError('信息消息', ErrorLevel.INFO, {}, '功能2')
    })

    it('应该获取错误统计', () => {
      const stats = errorMonitoringService.getErrorStats()

      expect(stats.total).toBe(4)
      expect(stats.byLevel[ErrorLevel.ERROR]).toBe(2)
      expect(stats.byLevel[ErrorLevel.WARNING]).toBe(1)
      expect(stats.byLevel[ErrorLevel.INFO]).toBe(1)
    })

    it('应该按组件统计错误', () => {
      const stats = errorMonitoringService.getErrorStats()

      expect(stats.byComponent['组件1']).toBe(1)
      expect(stats.byComponent['组件2']).toBe(1)
      expect(stats.byComponent['功能1']).toBe(1)
      expect(stats.byComponent['功能2']).toBe(1)
    })

    it('应该统计最近24小时错误', () => {
      const stats = errorMonitoringService.getErrorStats()
      
      expect(stats.last24Hours).toBe(4)
      expect(stats.trend).toBeDefined()
    })
  })

  describe('错误过滤和搜索', () => {
    beforeEach(() => {
      errorMonitoringService.captureError('测试错误1', ErrorLevel.ERROR, {}, '组件A')
      errorMonitoringService.captureError('测试错误2', ErrorLevel.ERROR, {}, '组件B')
      errorMonitoringService.captureError('警告消息', ErrorLevel.WARNING, {}, '组件A')
    })

    it('应该按级别过滤错误', () => {
      const filteredErrors = errorMonitoringService.getErrorsByLevel(ErrorLevel.ERROR)
      expect(filteredErrors).toHaveLength(2)
      
      const warningErrors = errorMonitoringService.getErrorsByLevel(ErrorLevel.WARNING)
      expect(warningErrors).toHaveLength(1)
    })

    it('应该按组件过滤错误', () => {
      const componentErrors = errorMonitoringService.getErrorsByComponent('组件A')
      expect(componentErrors).toHaveLength(2)
    })

    it('应该通过ID获取错误', () => {
      const errorId = errorMonitoringService.captureError('特定错误', ErrorLevel.ERROR, {}, '测试组件')
      const error = errorMonitoringService.getErrorById(errorId)
      
      expect(error).toBeDefined()
      expect(error?.message).toBe('特定错误')
    })
  })

  describe('错误处理', () => {
    it('应该清除所有错误', () => {
      errorMonitoringService.captureError('错误1', ErrorLevel.ERROR, {}, '组件1')
      errorMonitoringService.captureError('错误2', ErrorLevel.ERROR, {}, '组件2')
      
      expect(errorMonitoringService.getErrors()).toHaveLength(2)
      
      errorMonitoringService.clearErrors()
      expect(errorMonitoringService.getErrors()).toHaveLength(0)
    })

    it('应该设置用户ID', () => {
      errorMonitoringService.setUserId('test-user-123')
      errorMonitoringService.captureError('测试错误', ErrorLevel.ERROR, {}, '组件')
      
      const errors = errorMonitoringService.getErrors()
      expect(errors[0].userId).toBe('test-user-123')
    })

    it('应该更新配置', () => {
      const newConfig = { maxErrors: 50, logToConsole: false }
      errorMonitoringService.updateConfig(newConfig)
      
      const config = errorMonitoringService.getConfig()
      expect(config.maxErrors).toBe(50)
      expect(config.logToConsole).toBe(false)
    })
  })

  describe('配置管理', () => {
    beforeEach(() => {
      // 重置配置到默认值
      errorMonitoringService.updateConfig({
        enabled: true,
        maxErrors: 500,
        autoReport: false,
        logToConsole: true,
        logToStorage: true,
        samplingRate: 1
      })
    })

    it('应该获取默认配置', () => {
      const config = errorMonitoringService.getConfig()

      expect(config.enabled).toBe(true)
      expect(config.maxErrors).toBe(500)
      expect(config.autoReport).toBe(false)
    })

    it('应该禁用服务', () => {
      errorMonitoringService.updateConfig({ enabled: false })
      const errorId = errorMonitoringService.captureError('测试错误', ErrorLevel.ERROR, {}, '组件')
      
      expect(errorId).toBe('')
      expect(errorMonitoringService.getErrors()).toHaveLength(0)
    })
  })
})