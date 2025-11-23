import { ConnectionStatus, WebSocketMessage, WebSocketConfig } from './websocket'

// 模拟WebSocket服务类
export class MockWebSocketService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private config: WebSocketConfig

  constructor() {
    this.config = {
      url: 'mock://localhost/ws',
      protocols: [],
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      timeout: 1000
    }
  }

  // 获取连接状态
  getStatus(): ConnectionStatus {
    return this.status
  }

  // 模拟连接到WebSocket
  async connect(): Promise<void> {
    if (this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.CONNECTED) {
      return Promise.resolve()
    }

    this.setStatus(ConnectionStatus.CONNECTING)
    
    return new Promise((resolve) => {
      // 模拟连接延迟
      setTimeout(() => {
        this.setStatus(ConnectionStatus.CONNECTED)
        this.reconnectAttempts = 0
        console.info('模拟WebSocket连接已建立')
        
        // 开始模拟心跳和消息
        this.startMockHeartbeat()
        this.startMockMessageGeneration()
        this.flushMessageQueue()
        resolve()
      }, 100) // 模拟快速连接
    })
  }

  // 断开模拟WebSocket连接
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.cleanup()
    this.setStatus(ConnectionStatus.DISCONNECTED)
    console.info('模拟WebSocket连接已断开')
  }

  // 发送消息
  send(message: WebSocketMessage): void {
    if (this.status === ConnectionStatus.CONNECTED) {
      console.debug('模拟WebSocket发送消息:', message)
      // 在真实场景中，这里会发送到服务器
      this.messageQueue.push(message)
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

  // 触发事件
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  // 清理资源
  private cleanup(): void {
    this.messageQueue = []
    // 注意：不清理listeners，因为它们可能在组件间共享
  }

  // 清空消息队列
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        console.debug('清空消息队列:', message)
        // 在真实场景中，这里会发送消息到服务器
      }
    }
  }

  // 开始模拟心跳
  private startMockHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.status === ConnectionStatus.CONNECTED) {
        console.debug('模拟WebSocket心跳')
        // 发送心跳消息
        const heartbeatMessage: WebSocketMessage = {
          type: 'system',
          data: { type: 'heartbeat', status: 'alive' },
          timestamp: Date.now()
        }
        this.handleMessage(JSON.stringify(heartbeatMessage))
      }
    }, this.config.heartbeatInterval)
  }

  // 开始模拟消息生成
  private startMockMessageGeneration(): void {
    // 定期生成模拟数据
    setInterval(() => {
      if (this.status === ConnectionStatus.CONNECTED) {
        this.generateMockData()
      }
    }, 5000) // 每5秒生成一次模拟数据
  }

  // 生成模拟数据
  private generateMockData(): void {
    const mockTypes = ['device_status', 'sensor_data', 'alert', 'performance', 'system']
    const randomType = mockTypes[Math.floor(Math.random() * mockTypes.length)]
    
    let mockData: any = {}
    
    switch (randomType) {
      case 'device_status':
        mockData = {
          deviceId: `device_${Math.floor(Math.random() * 10) + 1}`,
          status: ['online', 'offline', 'warning'][Math.floor(Math.random() * 3)],
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          temperature: 40 + Math.random() * 20
        }
        break
        
      case 'sensor_data':
        mockData = {
          sensorId: `sensor_${Math.floor(Math.random() * 5) + 1}`,
          value: Math.random() * 100,
          unit: '%',
          location: `位置 ${Math.floor(Math.random() * 5) + 1}`
        }
        break
        
      case 'alert':
        mockData = {
          alertId: `alert_${Date.now()}`,
          severity: ['critical', 'warning', 'info'][Math.floor(Math.random() * 3)],
          title: '模拟告警',
          message: '这是一个模拟的告警消息',
          deviceId: `device_${Math.floor(Math.random() * 10) + 1}`
        }
        break
        
      case 'performance':
        mockData = {
          cpu: 30 + Math.random() * 40,
          memory: 50 + Math.random() * 30,
          network: Math.random() * 100,
          responseTime: 100 + Math.random() * 200
        }
        break
        
      case 'system':
        mockData = {
          status: 'running',
          uptime: Date.now(),
          version: '1.0.0-mock'
        }
        break
    }

    const message: WebSocketMessage = {
      type: randomType as any,
      data: mockData,
      timestamp: Date.now(),
      service: 'mock-service'
    }

    this.handleMessage(JSON.stringify(message))
  }

  // 处理接收到的消息
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      
      // 分发消息给相应的监听器
      const typeListeners = this.listeners.get(message.type)
      if (typeListeners) {
        typeListeners.forEach(callback => {
          try {
            callback(message.data)
          } catch (error) {
            console.error('模拟WebSocket消息处理错误:', error)
          }
        })
      }
      
      // 触发所有消息事件
      const allListeners = this.listeners.get('*')
      if (allListeners) {
        allListeners.forEach(callback => {
          try {
            callback(message)
          } catch (error) {
            console.error('模拟WebSocket全局消息处理错误:', error)
          }
        })
      }
      
    } catch (error) {
      console.error('模拟WebSocket消息解析错误:', error, '原始数据:', data)
    }
  }

  // 获取统计信息
  getStats() {
    return {
      status: this.status,
      messageQueueLength: this.messageQueue.length,
      listenersCount: this.listeners.size,
      uptime: Date.now()
    }
  }
}

// 创建全局单例实例
export const mockWebSocketService = new MockWebSocketService()

// 导出便捷方法
export const mockConnect = () => mockWebSocketService.connect()
export const mockDisconnect = () => mockWebSocketService.disconnect()
export const mockSend = (message: WebSocketMessage) => mockWebSocketService.send(message)
export const mockSubscribe = (type: string, callback: (data: any) => void) => 
  mockWebSocketService.subscribe(type, callback)

export default mockWebSocketService