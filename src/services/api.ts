import { ref } from 'vue'
import { env, serviceConfig } from '@/config/environment'

// 请求配置
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, any>
  timeout?: number
  retryAttempts?: number
  service?: keyof typeof serviceConfig
  endpoint?: string
  // 新增缓存相关配置
  cache?: boolean
  cacheTTL?: number
  // 新增防抖节流配置
  debounceKey?: string
  deduplicate?: boolean
}

// API响应格式
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
  requestId?: string
}

// 缓存项接口
interface CacheItem {
  data: any
  timestamp: number
  ttl: number
}

// 错误类型
export class ApiError extends Error {
  constructor(
    message: string,
    public code: number = 500,
    public details?: any,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// HTTP状态码映射
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
}

// 可重试的HTTP状态码
const RETRYABLE_STATUS_CODES = [
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT
]

// API服务类
class ApiService {
  private abortControllers: Map<string, AbortController> = new Map()
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = []
  private responseInterceptors: Array<(response: ApiResponse) => ApiResponse> = []
  
  // 新增缓存和防抖机制
  private cache: Map<string, CacheItem> = new Map()
  private pendingRequests: Map<string, Promise<any>> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    // 注册默认拦截器
    this.setupDefaultInterceptors()
    
    // 启动缓存清理定时器
    this.startCacheCleanup()
  }

  // 设置默认拦截器
  private setupDefaultInterceptors() {
    // 请求拦截器 - 添加认证信息
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        }
      }
      
      // 添加请求ID用于链路追踪
      config.headers = {
        ...config.headers,
        'X-Request-ID': this.generateRequestId(),
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0'
      }
      
      return config
    })

    // 响应拦截器 - 处理响应数据
    this.addResponseInterceptor((response) => {
      console.debug('API Response:', response)
      return response
    })
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig) {
    this.requestInterceptors.push(interceptor)
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: (response: ApiResponse) => ApiResponse) {
    this.responseInterceptors.push(interceptor)
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 构建完整URL
  private buildUrl(service: keyof typeof serviceConfig, endpoint: string, params?: Record<string, any>): string {
    const baseURL = serviceConfig[service]
    let url = `${baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    
    if (params) {
      const searchParams = new URLSearchParams()
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, params[key].toString())
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    
    return url
  }

  // 缓存管理方法
  private getCacheKey(service: string, endpoint: string, params?: any): string {
    const key = `${service}_${endpoint}_${JSON.stringify(params || {})}`
    return key
  }

  private getFromCache(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  private setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.cache.delete(key)
        }
      }
    }, 60000) // 每分钟清理一次过期缓存
  }

  // 防抖节流方法
  private debounceRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    delay: number = 300
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // 清除之前的定时器
      const existingTimer = this.debounceTimers.get(key)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // 设置新的定时器
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key)
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)

      this.debounceTimers.set(key, timer)
    })
  }

  // 去重请求方法
  private deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 如果已有相同请求正在进行，返回该请求的Promise
    const existingRequest = this.pendingRequests.get(key)
    if (existingRequest) {
      return existingRequest
    }

    // 创建新的请求
    const newRequest = requestFn()
      .finally(() => {
        this.pendingRequests.delete(key)
      })

    this.pendingRequests.set(key, newRequest)
    return newRequest
  }

  // 计算指数退避延迟
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000 // 1秒基础延迟
    const maxDelay = 10000 // 10秒最大延迟
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    const jitter = Math.random() * 0.1 * exponentialDelay // 添加10%随机抖动
    return Math.floor(exponentialDelay + jitter)
  }

  // 请求方法（支持重试机制、缓存、防抖节流）
  async request<T = any>(
    service: keyof typeof serviceConfig,
    endpoint: string,
    config: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = env.TIMEOUT,
      retryAttempts = env.RETRY_ATTEMPTS,
      cache = false,
      cacheTTL = 5 * 60 * 1000, // 5分钟默认缓存
      debounceKey,
      deduplicate = false
    } = config

    // 生成缓存键
    const cacheKey = this.getCacheKey(service.toString(), endpoint, params)

    // 检查缓存
    if (method === 'GET' && cache) {
      const cachedData = this.getFromCache(cacheKey)
      if (cachedData) {
        console.debug('Cache hit:', cacheKey)
        return cachedData
      }
    }

    // 构建请求函数
    const executeRequest = async (): Promise<ApiResponse<T>> => {
      // 应用请求拦截器
      let processedConfig = { 
        method, 
        headers: headers || {}, 
        body, 
        params, 
        timeout, 
        retryAttempts 
      }
      this.requestInterceptors.forEach(interceptor => {
        processedConfig = interceptor(processedConfig)
      })

      let lastError: Error | null = null
      const requestId = this.generateRequestId()

      for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        const controller = new AbortController()
        const controllerKey = `${service}_${endpoint}_${requestId}_${attempt}`
        
        this.abortControllers.set(controllerKey, controller)

        try {
          const url = this.buildUrl(service, endpoint, params)
          const timeoutId = setTimeout(() => {
            controller.abort()
          }, timeout)

          const response = await fetch(url, {
            method: processedConfig.method,
            headers: {
              ...processedConfig.headers,
              'X-Request-ID': requestId,
              'X-Attempt': (attempt + 1).toString()
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
          })

          clearTimeout(timeoutId)
          this.abortControllers.delete(controllerKey)

          if (!response.ok) {
            const isRetryable = RETRYABLE_STATUS_CODES.includes(response.status)
            
            if (attempt < retryAttempts && isRetryable) {
              console.warn(`Request failed (attempt ${attempt + 1}/${retryAttempts + 1}), retrying...`, response.status)
              await this.delay(this.calculateBackoffDelay(attempt))
              continue
            }
            
            throw new ApiError(
              `HTTP错误: ${response.status} ${response.statusText}`,
              response.status,
              null,
              isRetryable
            )
          }

          const responseData: ApiResponse<T> = await response.json()

          // 应用响应拦截器
          let processedResponse = responseData
          this.responseInterceptors.forEach(interceptor => {
            processedResponse = interceptor(processedResponse)
          })

          if (processedResponse.code !== 200) {
            throw new ApiError(
              processedResponse.message || 'API请求失败',
              processedResponse.code,
              processedResponse.data
            )
          }

          // 缓存响应数据
          if (method === 'GET' && cache) {
            this.setCache(cacheKey, processedResponse, cacheTTL)
          }

          console.info(`Request succeeded: ${service}${endpoint}`, {
            attempt: attempt + 1,
            requestId
          })

          return processedResponse

        } catch (error) {
          this.abortControllers.delete(controllerKey)
          lastError = error as Error

          if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
            const timeoutError = new ApiError('请求超时', 408)
            if (attempt < retryAttempts) {
              console.warn(`Request timeout (attempt ${attempt + 1}/${retryAttempts + 1}), retrying...`)
              await this.delay(this.calculateBackoffDelay(attempt))
              continue
            }
            throw timeoutError
          }

          if (error instanceof ApiError) {
            if (!error.isRetryable || attempt >= retryAttempts) {
              throw error
            }
            console.warn(`Request failed (attempt ${attempt + 1}/${retryAttempts + 1}), retrying...`, error.message)
            await this.delay(this.calculateBackoffDelay(attempt))
            continue
          }

          // 网络错误
          if (attempt < retryAttempts) {
            console.warn(`Network error (attempt ${attempt + 1}/${retryAttempts + 1}), retrying...`, error)
            await this.delay(this.calculateBackoffDelay(attempt))
            continue
          }

          throw new ApiError(
            error instanceof Error ? error.message : '网络请求失败'
          )
        }
      }

      throw lastError || new ApiError('请求失败，所有重试尝试已用尽')
    }

    // 处理防抖节流和去重
    if (debounceKey) {
      return this.debounceRequest(cacheKey, executeRequest, 300)
    } else if (deduplicate) {
      return this.deduplicateRequest(cacheKey, executeRequest)
    } else {
      return executeRequest()
    }
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 取消请求
  cancelRequest(requestId: string) {
    const controller = this.abortControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(requestId)
    }
  }

  // 取消所有请求
  cancelAllRequests() {
    this.abortControllers.forEach(controller => controller.abort())
    this.abortControllers.clear()
    
    // 清除防抖定时器
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }

  // 清除缓存
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  // 清除特定服务的缓存
  clearServiceCache(service: string): void {
    const regex = new RegExp(`^${service}_`)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  // 获取缓存统计信息
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  // GET请求
  get<T = any>(
    service: keyof typeof serviceConfig,
    endpoint: string, 
    params?: any,
    options: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, { method: 'GET', params, ...options })
  }

  // POST请求
  post<T = any>(
    service: keyof typeof serviceConfig,
    endpoint: string, 
    data?: any,
    options: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, { method: 'POST', body: data, ...options })
  }

  // PUT请求
  put<T = any>(
    service: keyof typeof serviceConfig,
    endpoint: string, 
    data?: any,
    options: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, { method: 'PUT', body: data, ...options })
  }

  // DELETE请求
  delete<T = any>(
    service: keyof typeof serviceConfig,
    endpoint: string,
    options: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, { method: 'DELETE', ...options })
  }
}

// 创建API服务实例
export const apiService = new ApiService()

// 模拟数据服务（开发环境使用）
class MockApiService {
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 模拟仪表板数据
  async getDashboardData() {
    await this.delay(800)
    
    return {
      code: 200,
      message: '成功',
      data: {
        overview: {
          totalDevices: 156,
          onlineDevices: 128,
          offlineDevices: 28,
          warningDevices: 12,
          totalAlerts: 45,
          resolvedAlerts: 32,
          pendingAlerts: 13
        },
        metrics: {
          cpuUsage: 65.2,
          memoryUsage: 78.5,
          diskUsage: 42.3,
          networkTraffic: 125.6,
          responseTime: 156,
          uptime: 99.8
        },
        charts: {
          deviceStatus: {
            online: 128,
            offline: 28,
            warning: 12
          },
          performanceTrend: [
            { time: '00:00', value: 45 },
            { time: '04:00', value: 52 },
            { time: '08:00', value: 68 },
            { time: '12:00', value: 72 },
            { time: '16:00', value: 65 },
            { time: '20:00', value: 48 }
          ],
          alertDistribution: {
            critical: 8,
            warning: 25,
            info: 12
          }
        }
      },
      timestamp: Date.now()
    }
  }

  // 模拟设备数据
  async getDevices(params?: { page?: number; size?: number; status?: string }) {
    await this.delay(600)
    
    const mockDevices = Array.from({ length: 50 }, (_, i) => ({
      id: `device_${i + 1}`,
      name: `设备 ${i + 1}`,
      type: ['服务器', '路由器', '交换机', '防火墙', '存储设备'][i % 5],
      status: ['online', 'offline', 'warning'][i % 3],
      ip: `192.168.1.${i + 1}`,
      location: `机房 ${(i % 3) + 1}`,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      lastUpdate: Date.now() - Math.random() * 86400000,
      alerts: Math.floor(Math.random() * 10)
    }))

    // 应用筛选
    let filteredDevices = mockDevices
    if (params?.status) {
      filteredDevices = mockDevices.filter(device => device.status === params.status)
    }

    // 分页
    const page = params?.page || 1
    const size = params?.size || 10
    const startIndex = (page - 1) * size
    const paginatedDevices = filteredDevices.slice(startIndex, startIndex + size)

    return {
      code: 200,
      message: '成功',
      data: {
        devices: paginatedDevices,
        total: filteredDevices.length,
        page,
        size,
        totalPages: Math.ceil(filteredDevices.length / size)
      },
      timestamp: Date.now()
    }
  }

  // 模拟设备详情
  async getDeviceDetail(deviceId: string) {
    await this.delay(400)
    
    const mockDevice = {
      id: deviceId,
      name: `设备 ${deviceId.split('_')[1]}`,
      type: '服务器',
      status: 'online',
      ip: '192.168.1.100',
      location: '机房 1',
      specifications: {
        cpu: 'Intel Xeon E5-2680',
        memory: '64GB',
        storage: '2TB SSD',
        os: 'CentOS 7.9'
      },
      metrics: {
        cpuUsage: 45.6,
        memoryUsage: 68.2,
        diskUsage: 32.1,
        networkIn: 125.4,
        networkOut: 89.7,
        temperature: 42.5
      },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: Date.now() - (23 - i) * 3600000,
        cpuUsage: 30 + Math.random() * 40,
        memoryUsage: 50 + Math.random() * 30,
        diskUsage: 20 + Math.random() * 20
      }))
    }

    return {
      code: 200,
      message: '成功',
      data: mockDevice,
      timestamp: Date.now()
    }
  }

  // 模拟告警数据
  async getAlerts(params?: { severity?: string; status?: string }) {
    await this.delay(500)
    
    const mockAlerts = Array.from({ length: 30 }, (_, i) => ({
      id: `alert_${i + 1}`,
      deviceId: `device_${(i % 10) + 1}`,
      deviceName: `设备 ${(i % 10) + 1}`,
      severity: ['critical', 'warning', 'info'][i % 3],
      status: ['active', 'resolved'][i % 2],
      title: `告警标题 ${i + 1}`,
      description: `这是告警 ${i + 1} 的详细描述`,
      timestamp: Date.now() - Math.random() * 86400000,
      resolvedAt: i % 2 === 0 ? Date.now() - Math.random() * 43200000 : null
    }))

    // 应用筛选
    let filteredAlerts = mockAlerts
    if (params?.severity) {
      filteredAlerts = mockAlerts.filter(alert => alert.severity === params.severity)
    }
    if (params?.status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === params.status)
    }

    return {
      code: 200,
      message: '成功',
      data: filteredAlerts,
      timestamp: Date.now()
    }
  }

  // 模拟配置数据
  async getDashboardConfigs() {
    await this.delay(300)
    
    const mockConfigs = Array.from({ length: 5 }, (_, i) => ({
      id: `config_${i + 1}`,
      name: `大屏配置 ${i + 1}`,
      description: `这是大屏配置 ${i + 1} 的描述`,
      createdAt: Date.now() - Math.random() * 2592000000,
      updatedAt: Date.now() - Math.random() * 86400000,
      status: ['draft', 'published'][i % 2],
      components: Math.floor(Math.random() * 20) + 5
    }))

    return {
      code: 200,
      message: '成功',
      data: mockConfigs,
      timestamp: Date.now()
    }
  }

  // 模拟用户登录
  async login(credentials: { username: string; password: string }) {
    await this.delay(800)
    
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      return {
        code: 200,
        message: '登录成功',
        data: {
          token: 'mock_jwt_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          user: {
            id: 'user_001',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            permissions: ['*']
          }
        },
        timestamp: Date.now()
      }
    } else if (credentials.username === 'user' && credentials.password === 'user123') {
      return {
        code: 200,
        message: '登录成功',
        data: {
          token: 'mock_jwt_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          user: {
            id: 'user_002',
            username: 'user',
            email: 'user@example.com',
            role: 'editor',
            permissions: ['dashboard:view', 'dashboard:edit', 'devices:view']
          }
        },
        timestamp: Date.now()
      }
    } else {
      throw new ApiError('用户名或密码错误', 401)
    }
  }
}

// 创建模拟API服务实例
export const mockApiService = new MockApiService()

// 根据环境选择API服务
export const api = (import.meta as any).env.DEV ? mockApiService : apiService

// 响应式API状态
export const useApi = () => {
  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)

  const execute = async <T>(apiCall: () => Promise<ApiResponse<T>>) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiCall()
      return response.data
    } catch (err) {
      error.value = err instanceof ApiError ? err : new ApiError('API请求失败')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    execute
  }
}