// import { ref, reactive } from 'vue'

// 错误级别枚举
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 错误信息接口
export interface ErrorInfo {
  id: string
  timestamp: number
  level: ErrorLevel
  message: string
  stack?: string
  context?: Record<string, any>
  component?: string
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
}

// 错误统计接口
export interface ErrorStats {
  total: number
  byLevel: Record<ErrorLevel, number>
  byComponent: Record<string, number>
  last24Hours: number
  trend: 'improving' | 'stable' | 'worsening'
}

// 错误监控配置
export interface ErrorMonitoringConfig {
  enabled: boolean
  maxErrors: number
  autoReport: boolean
  reportUrl?: string
  logToConsole: boolean
  logToStorage: boolean
  ignorePatterns: RegExp[]
  samplingRate: number // 0-1
}

// 错误监控服务类
export class ErrorMonitoringService {
  private errors: ErrorInfo[] = []
  private config: ErrorMonitoringConfig
  private sessionId: string
  private userId?: string
  private originalConsole: {
    error: (...args: any[]) => void
    warn: (...args: any[]) => void
    info: (...args: any[]) => void
    debug: (...args: any[]) => void
  }

  constructor(config?: Partial<ErrorMonitoringConfig>) {
    this.config = {
      enabled: true,
      maxErrors: 1000,
      autoReport: false,
      logToConsole: true,
      logToStorage: true,
      ignorePatterns: [
        /Script error\.?/i,
        /ResizeObserver loop limit exceeded/i
      ],
      samplingRate: 1,
      ...config
    }

    // 保存原始的控制台方法
    this.originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    }

    this.sessionId = this.generateSessionId()
    this.initialize()
  }

  // 初始化错误监控
  private initialize() {
    if (!this.config.enabled) return

    // 设置全局错误捕获
    this.setupGlobalErrorHandling()
    
    // 捕获Vue错误
    if ((window as any).Vue) {
      (window as any).Vue.config.errorHandler = this.handleVueError.bind(this)
    }

    // 定期清理旧错误
    setInterval(() => this.cleanupOldErrors(), 300000) // 5分钟清理一次
  }

  // 全局错误捕获
  private setupGlobalErrorHandling() {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))

    // 捕获全局JavaScript错误
    window.addEventListener('error', this.handleGlobalError.bind(this))

    // 捕获控制台错误
    const originalConsoleError = console.error
    console.error = (...args) => {
      this.captureError(
        `Console Error: ${args.join(' ')}`,
        ErrorLevel.ERROR,
        { args },
        'Console'
      )
      originalConsoleError.apply(console, args)
    }

    // 捕获控制台警告
    const originalConsoleWarn = console.warn
    console.warn = (...args) => {
      this.captureError(
        `Console Warning: ${args.join(' ')}`,
        ErrorLevel.WARNING,
        { args },
        'Console'
      )
      originalConsoleWarn.apply(console, args)
    }
  }

  // 生成会话ID
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }

  // 处理全局错误
  private handleGlobalError(event: ErrorEvent): void {
    if (this.shouldIgnoreError(event.message)) return
    if (!this.shouldSample()) return

    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level: ErrorLevel.ERROR,
      message: event.message,
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.addError(errorInfo)
  }

  // 处理未处理的Promise拒绝
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    if (!this.shouldSample()) return

    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level: ErrorLevel.ERROR,
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      context: {
        reason: event.reason
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.addError(errorInfo)
  }

  // 处理Vue错误
  private handleVueError(err: Error, vm: any, info: string): void {
    if (!this.shouldSample()) return

    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level: ErrorLevel.ERROR,
      message: err.message,
      stack: err.stack,
      context: {
        vueInfo: info,
        component: vm?.$options?.name
      },
      component: vm?.$options?.name,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.addError(errorInfo)
  }





  // 添加错误
  private addError(errorInfo: ErrorInfo): void {
    // 检查是否达到最大错误数量
    if (this.errors.length >= this.config.maxErrors) {
      this.errors.shift() // 移除最旧的错误
    }

    this.errors.push(errorInfo)

    // 记录到控制台
    if (this.config.logToConsole) {
      this.logToConsole(errorInfo)
    }

    // 记录到本地存储
    if (this.config.logToStorage) {
      this.logToStorage(errorInfo)
    }

    // 自动上报
    if (this.config.autoReport && this.config.reportUrl) {
      this.reportError(errorInfo)
    }
  }

  // 记录到控制台
  private logToConsole(errorInfo: ErrorInfo): void {
    const timestamp = new Date(errorInfo.timestamp).toISOString()
    const level = errorInfo.level.toUpperCase()
    
    const logMessage = `[${timestamp}] [${level}] ${errorInfo.message}`
    const errorDetails = JSON.stringify({
      id: errorInfo.id,
      timestamp: errorInfo.timestamp,
      level: errorInfo.level,
      message: errorInfo.message,
      stack: errorInfo.stack,
      context: errorInfo.context,
      url: errorInfo.url,
      userAgent: errorInfo.userAgent
    }, null, 2)
    
    // 使用保存的原始控制台方法避免递归调用
    switch (errorInfo.level) {
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        this.originalConsole.error(logMessage)
        this.originalConsole.error(errorDetails)
        break
      case ErrorLevel.WARNING:
        this.originalConsole.warn(logMessage)
        this.originalConsole.warn(errorDetails)
        break
      case ErrorLevel.INFO:
        this.originalConsole.info(logMessage)
        this.originalConsole.info(errorDetails)
        break
      case ErrorLevel.DEBUG:
        this.originalConsole.debug(logMessage)
        this.originalConsole.debug(errorDetails)
        break
    }
  }

  // 记录到本地存储
  private logToStorage(errorInfo: ErrorInfo): void {
    try {
      const storedErrors = JSON.parse(localStorage.getItem('error_monitoring') || '[]')
      storedErrors.push(errorInfo)
      
      // 限制存储数量
      if (storedErrors.length > 100) {
        storedErrors.splice(0, storedErrors.length - 100)
      }
      
      localStorage.setItem('error_monitoring', JSON.stringify(storedErrors))
    } catch (error) {
      console.warn('Failed to log error to storage:', error)
    }
  }

  // 上报错误
  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch(this.config.reportUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorInfo)
      })
    } catch (error) {
      console.warn('Failed to report error:', error)
    }
  }

  // 检查是否应该忽略错误
  private shouldIgnoreError(message: string): boolean {
    return this.config.ignorePatterns.some(pattern => pattern.test(message))
  }

  // 检查是否应该采样
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate
  }

  // 生成错误ID
  private generateErrorId(): string {
    return 'error_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }

  // 清理旧错误
  private cleanupOldErrors(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    
    for (let i = this.errors.length - 1; i >= 0; i--) {
      if (this.errors[i].timestamp < oneDayAgo) {
        this.errors.splice(i, 1)
      }
    }
  }

  // 手动记录错误
  captureError(
    message: string,
    level: ErrorLevel = ErrorLevel.ERROR,
    context?: Record<string, any>,
    component?: string
  ): string {
    if (!this.config.enabled) return ''
    if (!this.shouldSample()) return ''

    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level,
      message,
      context,
      component,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' && window.location ? window.location.href : '',
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.addError(errorInfo)
    return errorInfo.id
  }

  // 获取错误统计
  getErrorStats(): ErrorStats {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    
    const stats: ErrorStats = {
      total: this.errors.length,
      byLevel: {
        [ErrorLevel.DEBUG]: 0,
        [ErrorLevel.INFO]: 0,
        [ErrorLevel.WARNING]: 0,
        [ErrorLevel.ERROR]: 0,
        [ErrorLevel.CRITICAL]: 0
      },
      byComponent: {},
      last24Hours: this.errors.filter(error => error.timestamp > oneDayAgo).length,
      trend: 'stable'
    }

    // 统计错误级别
    this.errors.forEach(error => {
      stats.byLevel[error.level]++
      
      if (error.component) {
        stats.byComponent[error.component] = (stats.byComponent[error.component] || 0) + 1
      }
    })

    // 计算趋势（基于最近1小时与之前1小时的比较）
    const oneHourAgo = now - 60 * 60 * 1000
    const twoHoursAgo = now - 2 * 60 * 60 * 1000
    
    const recentErrors = this.errors.filter(error => error.timestamp > oneHourAgo).length
    const previousErrors = this.errors.filter(error => 
      error.timestamp > twoHoursAgo && error.timestamp <= oneHourAgo
    ).length
    
    if (recentErrors > previousErrors * 1.5) {
      stats.trend = 'worsening'
    } else if (recentErrors < previousErrors * 0.5) {
      stats.trend = 'improving'
    }

    return stats
  }

  // 获取错误列表
  getErrors(): ErrorInfo[] {
    return [...this.errors]
  }

  // 根据ID获取错误
  getErrorById(id: string): ErrorInfo | undefined {
    return this.errors.find(error => error.id === id)
  }

  // 根据组件获取错误
  getErrorsByComponent(component: string): ErrorInfo[] {
    return this.errors.filter(error => error.component === component)
  }

  // 根据级别获取错误
  getErrorsByLevel(level: ErrorLevel): ErrorInfo[] {
    return this.errors.filter(error => error.level === level)
  }

  // 清除错误
  clearErrors(): void {
    this.errors.splice(0, this.errors.length)
  }

  // 设置用户ID
  setUserId(userId: string): void {
    this.userId = userId
  }

  // 获取配置
  getConfig(): ErrorMonitoringConfig {
    return { ...this.config }
  }

  // 更新配置
  updateConfig(newConfig: Partial<ErrorMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 销毁服务
  destroy(): void {
    window.removeEventListener('error', this.handleGlobalError.bind(this))
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))
    
    if ((window as any).Vue) {
      (window as any).Vue.config.errorHandler = null
    }
  }
}

// 创建全局错误监控服务实例
export const errorMonitoringService = new ErrorMonitoringService({
  enabled: true,
  maxErrors: 500,
  autoReport: false,
  logToConsole: true,
  logToStorage: true,
  samplingRate: 1
})

// Vue错误处理插件
export const errorMonitoringPlugin = {
  install(app: any) {
    app.config.errorHandler = (err: Error, vm: any, info: string) => {
      errorMonitoringService.captureError(
        err.message,
        ErrorLevel.ERROR,
        { vueInfo: info, component: vm?.$options?.name },
        vm?.$options?.name
      )
    }

    // 提供错误监控服务
    app.provide('errorMonitoring', errorMonitoringService)
  }
}

// 错误边界组件（用于Vue 3）
export const ErrorBoundary = {
  name: 'ErrorBoundary',
  
  props: {
    fallback: {
      type: [String, Object, Function],
      default: () => 'Something went wrong.'
    },
    onError: Function
  },
  
  data() {
    return {
      hasError: false,
      error: null as Error | null,
      errorInfo: null as any
    }
  },
  
  errorCaptured(err: Error, vm: any, info: string) {
    const component = this as any
    component.hasError = true
    component.error = err
    component.errorInfo = info
    
    // 记录错误
    errorMonitoringService.captureError(
      err.message,
      ErrorLevel.ERROR,
      { vueInfo: info, component: vm?.$options?.name },
      vm?.$options?.name
    )
    
    // 调用自定义错误处理
    if ((this as any).onError) {
      (this as any).onError(err, vm, info)
    }
    
    return false // 阻止错误继续向上传播
  },
  
  render() {
    if ((this as any).hasError) {
      const fallback = (this as any).fallback
      return typeof fallback === 'function' 
        ? fallback({ error: (this as any).error, errorInfo: (this as any).errorInfo })
        : fallback
    }
    
    const slots = (this as any).$slots
    return slots?.default ? slots.default() : null
  }
}