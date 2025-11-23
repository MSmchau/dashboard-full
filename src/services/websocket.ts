import { env } from '@/config/environment'
import { apiService } from './api'

// WebSocket 消息类型定义
export interface WebSocketMessage {
  type: 'device_status' | 'sensor_data' | 'alert' | 'performance' | 'system'
  data: any
  timestamp: number
  service?: string
}

// WebSocket 连接状态枚举
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// WebSocket 配置接口
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectAttempts: number
  reconnectInterval: number
  heartbeatInterval: number
  timeout: number
}

// WebSocket 服务类
export class WebSocketService {
  private ws: WebSocket | null = null
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  
  private config: WebSocketConfig

  constructor() {
    this.config = {
      url: env.WS_URL || 'ws://localhost:8080/ws',
      protocols: [],
      reconnectAttempts: env.WS_RECONNECT_ATTEMPTS || 5,
      reconnectInterval: env.WS_RECONNECT_INTERVAL || 3000,
      heartbeatInterval: env.WS_HEARTBEAT_INTERVAL || 30000,
      timeout: env.WS_TIMEOUT || 10000
    }
  }

  // 获取连接状态
  getStatus(): ConnectionStatus {
    return this.status
  }

  // 连接到WebSocket
  async connect(): Promise<void> {
    if (this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.CONNECTED) {
      return Promise.resolve()
    }

    this.setStatus(ConnectionStatus.CONNECTING)
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWsUrl()
        this.ws = new WebSocket(wsUrl, this.config.protocols)

        // 连接超时处理
        const timeoutId = setTimeout(() => {
          if (this.ws) {
            this.ws.close()
            reject(new Error('WebSocket连接超时'))
          }
        }, this.config.timeout)

        this.ws.onopen = () => {
          clearTimeout(timeoutId)
          console.info('WebSocket连接已建立')
          this.setStatus(ConnectionStatus.CONNECTED)
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.flushMessageQueue()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeoutId)
          console.warn('WebSocket连接已关闭', event.code, event.reason)
          this.cleanup()
          
          if (event.code !== 1000 && this.reconnectAttempts < this.config.reconnectAttempts) {
            this.scheduleReconnect()
          } else if (this.reconnectAttempts >= this.config.reconnectAttempts) {
            this.setStatus(ConnectionStatus.FAILED)
            reject(new Error(`WebSocket重连失败，已达到最大重连次数(${this.config.reconnectAttempts})`))
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeoutId)
          console.error('WebSocket错误:', error)
          this.setStatus(ConnectionStatus.FAILED)
          reject(new Error('WebSocket连接错误'))
        }

      } catch (error) {
        console.error('WebSocket连接失败:', error)
        this.setStatus(ConnectionStatus.FAILED)
        reject(error)
      }
    })
  }

  // 断开WebSocket连接
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanup()
    if (this.ws) {
      this.ws.close(1000, '用户主动断开连接')
      this.ws = null
    }
    this.setStatus(ConnectionStatus.DISCONNECTED)
  }

  // 发送消息
  send(message: WebSocketMessage): void {
    if (this.status === ConnectionStatus.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('WebSocket发送消息失败:', error)
        this.messageQueue.push(message)
      }
    } else {
      this.messageQueue.push(message)
    }
  }

  // 订阅消息类型
  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(callback)

    // 返回取消订阅函数
    return () => {
      const typeListeners = this.listeners.get(type)
      if (typeListeners) {
        typeListeners.delete(callback)
        if (typeListeners.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  // 批量订阅
  subscribeBatch(types: string[], callback: (type: string, data: any) => void): () => void {
    const unsubscribes = types.map(type => this.subscribe(type, (data) => callback(type, data)))
    
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }

  // 设置连接状态
  private setStatus(status: ConnectionStatus): void {
    this.status = status
    // 触发状态变化事件
    this.emit('status_change', { status, timestamp: Date.now() })
  }

  // 构建WebSocket URL
  private buildWsUrl(): string {
    const baseUrl = this.config.url
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    
    if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
      return baseUrl
    }
    
    return `${protocol}//${host}${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`
  }

  // 处理接收到的消息
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      
      if (!message.type || !message.timestamp) {
        console.warn('无效的WebSocket消息格式:', message)
        return
      }

      // 触发对应的监听器
      const typeListeners = this.listeners.get(message.type)
      if (typeListeners) {
        typeListeners.forEach(callback => {
          try {
            callback(message.data)
          } catch (error) {
            console.error('WebSocket消息处理错误:', error)
          }
        })
      }

      // 触发通用消息事件
      this.emit('message', message)

    } catch (error) {
      console.error('WebSocket消息解析失败:', error, data)
    }
  }

  // 安排重连
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++
    this.setStatus(ConnectionStatus.RECONNECTING)
    
    const delay = Math.min(this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000)
    
    console.info(`安排WebSocket重连 (${this.reconnectAttempts}/${this.config.reconnectAttempts}), ${delay}ms后重试`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(error => {
        console.error('WebSocket重连失败:', error)
      })
    }, delay)
  }

  // 启动心跳
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.status === ConnectionStatus.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'system',
          data: { action: 'ping' },
          timestamp: Date.now()
        })
      }
    }, this.config.heartbeatInterval)
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 清空消息队列
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!
      try {
        this.ws?.send(JSON.stringify(message))
      } catch (error) {
        console.error('发送队列消息失败:', error)
        this.messageQueue.unshift(message) // 重新放回队列
        break
      }
    }
  }

  // 清理资源
  private cleanup(): void {
    this.stopHeartbeat()
    this.messageQueue = []
  }

  // 触发事件
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`WebSocket事件处理错误 (${event}):`, error)
        }
      })
    }
  }
}

// 创庺全局WebSocket服务实例
export const wsService = new WebSocketService()

// 导出便捷方法
export const connectWebSocket = () => wsService.connect()
export const disconnectWebSocket = () => wsService.disconnect()
export const sendWebSocketMessage = (message: WebSocketMessage) => wsService.send(message)
export const subscribeWebSocket = (type: string, callback: (data: any) => void) => 
  wsService.subscribe(type, callback)

export default wsService