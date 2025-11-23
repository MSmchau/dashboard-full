// 环境配置文件

// 服务配置接口
export interface ServiceConfig {
  baseUrl: string
  path: string
  timeout?: number
  headers?: Record<string, string>
}

// 环境配置接口
export interface EnvironmentConfig {
  // 基础配置
  NODE_ENV: 'development' | 'production' | 'test'
  BASE_URL: string
  API_BASE_URL: string
  API_GATEWAY_URL: string
  API_TIMEOUT: number
  TIMEOUT: number
  RETRY_ATTEMPTS: number
  
  // 服务URL配置
  AUTH_SERVICE_URL: string
  DEVICE_SERVICE_URL: string
  MONITOR_SERVICE_URL: string
  DATA_SERVICE_URL: string
  CONFIG_SERVICE_URL: string
  
  // WebSocket配置  
  WEBSOCKET_URL: string
  WEBSOCKET_RECONNECT_INTERVAL: number
  WS_URL: string
  WS_RECONNECT_ATTEMPTS: number
  WS_RECONNECT_INTERVAL: number
  WS_HEARTBEAT_INTERVAL: number
  WS_TIMEOUT: number
  
  // 功能开关
  ENABLE_MOCK_DATA: boolean
}

// 默认配置
const defaultConfig: EnvironmentConfig = {
  NODE_ENV: 'development',
  BASE_URL: '/',
  API_BASE_URL: 'http://localhost:8080/api',
  API_GATEWAY_URL: 'http://localhost:8080',
  WEBSOCKET_URL: 'ws://localhost:8080/ws',
  WS_URL: 'ws://localhost:8080/ws', // WebSocket URL别名
  AUTH_SERVICE_URL: 'http://localhost:8080/api/auth',
  DEVICE_SERVICE_URL: 'http://localhost:8080/api/devices',
  MONITOR_SERVICE_URL: 'http://localhost:8080/api/monitor',
  DATA_SERVICE_URL: 'http://localhost:8080/api/data',
  CONFIG_SERVICE_URL: 'http://localhost:8080/api/config',
  API_TIMEOUT: 30000,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  WEBSOCKET_RECONNECT_INTERVAL: 5000,
  WS_RECONNECT_INTERVAL: 5000, // WebSocket重连间隔
  WS_RECONNECT_ATTEMPTS: 5,
  WS_HEARTBEAT_INTERVAL: 30000,
  WS_TIMEOUT: 10000,
  ENABLE_MOCK_DATA: true // 开发环境启用模拟数据
}

// 根据环境变量覆盖配置
const getEnvironmentConfig = (): EnvironmentConfig => {
  const config = { ...defaultConfig }
  
  // 从环境变量读取配置
  if (import.meta.env) {
    const env = import.meta.env
    
    if (env.VITE_API_BASE_URL) config.API_BASE_URL = env.VITE_API_BASE_URL
    if (env.VITE_API_GATEWAY_URL) config.API_GATEWAY_URL = env.VITE_API_GATEWAY_URL
    if (env.VITE_WEBSOCKET_URL) config.WEBSOCKET_URL = env.VITE_WEBSOCKET_URL
    if (env.VITE_WS_URL) config.WS_URL = env.VITE_WS_URL // 添加WS_URL环境变量
    if (env.VITE_AUTH_SERVICE_URL) config.AUTH_SERVICE_URL = env.VITE_AUTH_SERVICE_URL
    if (env.VITE_DEVICE_SERVICE_URL) config.DEVICE_SERVICE_URL = env.VITE_DEVICE_SERVICE_URL
    if (env.VITE_MONITOR_SERVICE_URL) config.MONITOR_SERVICE_URL = env.VITE_MONITOR_SERVICE_URL
    if (env.VITE_DATA_SERVICE_URL) config.DATA_SERVICE_URL = env.VITE_DATA_SERVICE_URL
    if (env.VITE_CONFIG_SERVICE_URL) config.CONFIG_SERVICE_URL = env.VITE_CONFIG_SERVICE_URL
    if (env.VITE_TIMEOUT) config.TIMEOUT = parseInt(env.VITE_TIMEOUT)
    if (env.VITE_API_TIMEOUT) config.API_TIMEOUT = parseInt(env.VITE_API_TIMEOUT)
    if (env.VITE_RETRY_ATTEMPTS) config.RETRY_ATTEMPTS = parseInt(env.VITE_RETRY_ATTEMPTS)
    if (env.VITE_WEBSOCKET_RECONNECT_INTERVAL) config.WEBSOCKET_RECONNECT_INTERVAL = parseInt(env.VITE_WEBSOCKET_RECONNECT_INTERVAL)
    if (env.VITE_WS_RECONNECT_ATTEMPTS) config.WS_RECONNECT_ATTEMPTS = parseInt(env.VITE_WS_RECONNECT_ATTEMPTS)
    if (env.VITE_WS_RECONNECT_INTERVAL) config.WS_RECONNECT_INTERVAL = parseInt(env.VITE_WS_RECONNECT_INTERVAL)
    if (env.VITE_WS_HEARTBEAT_INTERVAL) config.WS_HEARTBEAT_INTERVAL = parseInt(env.VITE_WS_HEARTBEAT_INTERVAL)
    if (env.VITE_WS_TIMEOUT) config.WS_TIMEOUT = parseInt(env.VITE_WS_TIMEOUT)
    if (env.VITE_ENABLE_MOCK_DATA !== undefined) config.ENABLE_MOCK_DATA = env.VITE_ENABLE_MOCK_DATA === 'true'
    if (env.VITE_BASE_URL) config.BASE_URL = env.VITE_BASE_URL
  }
  
  return config
}

export const env = getEnvironmentConfig()

// 服务配置映射
export const serviceConfig = {
  auth: env.AUTH_SERVICE_URL,
  devices: env.DEVICE_SERVICE_URL,
  monitor: env.MONITOR_SERVICE_URL,
  data: env.DATA_SERVICE_URL,
  config: env.CONFIG_SERVICE_URL,
  websocket: env.WEBSOCKET_URL,
  gateway: env.API_GATEWAY_URL
}

export default env