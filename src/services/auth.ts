import { ref, reactive, computed } from 'vue'
import { apiService } from '@/services/api'
import { env } from '@/config/environment'

// 用户信息接口
export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
  permissions: string[]
  avatar?: string
  lastLogin?: string
}

// 认证状态接口
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean // 新增：初始化状态
}

// 登录凭据接口
export interface LoginCredentials {
  username: string
  password: string
  rememberMe?: boolean
}

// 权限配置
export const ROLE_PERMISSIONS = {
  admin: [
    'dashboard:view',
    'device:view',
    'device:control',
    'config:edit',
    'user:manage',
    'system:manage',
    'error:view',
    'performance:view'
  ],
  operator: [
    'dashboard:view',
    'device:view',
    'device:control',
    'error:view',
    'performance:view'
  ],
  viewer: [
    'dashboard:view',
    'device:view',
    'error:view',
    'performance:view'
  ]
}

// 认证服务类
export class AuthService {
  private state = reactive<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false
  })

  private readonly TOKEN_KEY = 'auth_token'
  private readonly USER_KEY = 'auth_user'
  private readonly REMEMBER_TOKEN_KEY = 'remember_token'

  constructor() {
    this.initializeAuth()
  }

  // 获取认证状态
  get authState() {
    return this.state
  }

  // 计算属性
  get currentUser(): User | null {
    return this.state.user
  }

  get isLoggedIn(): boolean {
    return this.state.isAuthenticated
  }

  get userRole(): string | null {
    return this.state.user?.role || null
  }

  // 增强的权限检查
  hasPermission(permission: string): boolean {
    if (!this.state.user || !this.state.isAuthenticated) {
      return false
    }
    
    return this.state.user.permissions.includes(permission) || 
           this.state.user.role === 'admin'
  }

  // 检查角色权限
  hasRole(role: 'admin' | 'operator' | 'viewer'): boolean {
    if (!this.state.user || !this.state.isAuthenticated) {
      return false
    }
    
    const roleHierarchy = {
      'admin': 3,
      'operator': 2,
      'viewer': 1
    }
    
    return roleHierarchy[this.state.user.role] >= roleHierarchy[role]
  }

  // 批量权限检查
  hasPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  // 增强的token验证
  isTokenValid(): boolean {
    if (!this.state.token || !this.state.expiresAt) {
      return false
    }
    
    const now = Math.floor(Date.now() / 1000)
    return this.state.expiresAt > now
  }

  // 获取剩余token时间（秒）
  getTokenTimeRemaining(): number {
    if (!this.state.expiresAt) {
      return 0
    }
    
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, this.state.expiresAt - now)
  }

  // 自动token刷新
  private async scheduleTokenRefresh(): Promise<void> {
    if (!this.state.isAuthenticated || !this.state.expiresAt) {
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = this.state.expiresAt - now
    
    // 在token过期前5分钟开始刷新
    const refreshTime = Math.max(0, timeUntilExpiry - 300) * 1000
    
    if (refreshTime > 0) {
      setTimeout(async () => {
        try {
          await this.refreshToken()
        } catch (error) {
          console.error('自动刷新token失败:', error)
          await this.logout()
        }
      }, refreshTime)
    }
  }

  // 增强的状态管理
  getAuthState(): AuthState {
    return {
      ...this.state,
      tokenTimeRemaining: this.getTokenTimeRemaining()
    }
  }

  // 监听认证状态变化
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    const originalCallback = callback
    const wrappedCallback = (state: AuthState) => {
      originalCallback({
        ...state,
        tokenTimeRemaining: this.getTokenTimeRemaining()
      })
    }
    
    return this.state.onChange(wrappedCallback)
  }

  // 安全登出
  async secureLogout(): Promise<void> {
    try {
      // 通知服务器登出
      await this.logout()
      
      // 清除敏感数据
      this.clearSensitiveData()
      
      // 记录安全日志
      console.log('安全登出完成', {
        user: this.state.user?.username,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('安全登出过程中出现错误:', error)
      // 即使出错也要清除本地数据
      this.clearSensitiveData()
    }
  }

  // 清除敏感数据
  private clearSensitiveData(): void {
    this.state.user = null
    this.state.token = null
    this.state.refreshToken = null
    this.state.expiresAt = null
    this.state.isAuthenticated = false
    
    // 清除本地存储
    if (this.state.rememberMe) {
      // 只清除认证相关数据，保留记住的用户名
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('expiresAt')
      localStorage.removeItem('user')
    } else {
      localStorage.clear()
    }
    
    // 清除会话存储
    sessionStorage.clear()
  }

  // 初始化认证状态
  async initializeAuth(): Promise<boolean> {
    try {
      const token = localStorage.getItem('token')
      const expiresAtStr = localStorage.getItem('expiresAt')
      const userStr = localStorage.getItem('user')
      const rememberMe = localStorage.getItem('rememberMe') === 'true'
      
      if (!token || !expiresAtStr || !userStr) {
        return false
      }
      
      const expiresAt = parseInt(expiresAtStr)
      const user = JSON.parse(userStr)
      
      // 检查token是否有效
      if (expiresAt <= Math.floor(Date.now() / 1000)) {
        console.log('Token已过期')
        this.clearSensitiveData()
        return false
      }
      
      // 恢复认证状态
      this.state.user = user
      this.state.token = token
      this.state.expiresAt = expiresAt
      this.state.isAuthenticated = true
      this.state.rememberMe = rememberMe
      
      // 启动自动刷新
      this.scheduleTokenRefresh()
      
      console.log(`认证状态已恢复: ${user.username}`)
      return true
      
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      this.clearSensitiveData()
      return false
    }
  }

  // 登录
  async login(username: string, password: string, rememberMe: boolean = false): Promise<User> {
    this.state.isLoading = true

    try {
      // 模拟真实登录流程
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 模拟不同用户角色的登录验证
      const demoUsers = {
        'admin': {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin' as const,
          permissions: ROLE_PERMISSIONS.admin,
          avatar: '/avatars/admin.jpg',
          lastLogin: new Date().toISOString()
        },
        'operator': {
          id: '2',
          username: 'operator',
          email: 'operator@example.com',
          role: 'operator' as const,
          permissions: ROLE_PERMISSIONS.operator,
          avatar: '/avatars/operator.jpg',
          lastLogin: new Date().toISOString()
        },
        'viewer': {
          id: '3',
          username: 'viewer',
          email: 'viewer@example.com',
          role: 'viewer' as const,
          permissions: ROLE_PERMISSIONS.viewer,
          avatar: '/avatars/viewer.jpg',
          lastLogin: new Date().toISOString()
        }
      }
      
      // 验证演示账户
      if (demoUsers[username as keyof typeof demoUsers] && password === 'demo123') {
        const user = demoUsers[username as keyof typeof demoUsers]
        const token = this.generateDemoToken(user)
        const expiresIn = 3600 // 1小时
        
        // 更新状态
        this.state.user = user
        this.state.token = token
        this.state.isAuthenticated = true
        
        // 保存认证信息
        this.saveAuthInfo(token, user, expiresIn, rememberMe)
        
        // 记录登录日志
        console.log(`用户 ${user.username} 登录成功`, {
          role: user.role,
          permissions: user.permissions.length,
          timestamp: new Date().toISOString()
        })
        
        return user
      }
      
      // 验证测试账户
      if ((username === 'test' || username === 'user') && password === '123456') {
        const user = {
          id: '4',
          username: 'test',
          email: 'test@example.com',
          role: 'viewer' as const,
          permissions: ROLE_PERMISSIONS.viewer,
          avatar: '/avatars/default.jpg',
          lastLogin: new Date().toISOString()
        }
        const token = this.generateDemoToken(user)
        const expiresIn = 3600
        
        this.state.user = user
        this.state.token = token
        this.state.isAuthenticated = true
        
        this.saveAuthInfo(token, user, expiresIn, rememberMe)
        
        console.log(`测试用户 ${user.username} 登录成功`)
        return user
      }
      
      throw new Error('用户名或密码错误')
      
    } catch (error: any) {
      console.error('登录失败:', error)
      
      // 确保错误是Error类型，正确处理Promise拒绝
      if (error instanceof Error) {
        // 详细的错误处理
        if (error.message?.includes('网络')) {
          throw new Error('网络连接失败，请检查网络设置')
        } else if (error.message?.includes('服务器')) {
          throw new Error('服务器暂时不可用，请稍后重试')
        } else {
          throw error // 保留原始错误信息
        }
      } else {
        // 如果不是Error类型，转换为Error
        throw new Error('登录失败，请检查用户名和密码')
      }
    } finally {
      this.state.isLoading = false
    }
  }

  // 生成演示token
  private generateDemoToken(user: User): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
    }))
    const signature = btoa('demo-signature')
    
    return `${header}.${payload}.${signature}`
  }

  // 第三方登录
  async socialLogin(provider: 'github' | 'google', token: string): Promise<User> {
    this.state.isLoading = true

    try {
      // 模拟第三方登录验证
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const providerUsers = {
        github: {
          id: 'github_123',
          username: 'github_user',
          email: 'user@github.com',
          role: 'viewer' as const,
          permissions: ROLE_PERMISSIONS.viewer,
          avatar: '/avatars/github.jpg',
          lastLogin: new Date().toISOString()
        },
        google: {
          id: 'google_123',
          username: 'google_user',
          email: 'user@gmail.com',
          role: 'viewer' as const,
          permissions: ROLE_PERMISSIONS.viewer,
          avatar: '/avatars/google.jpg',
          lastLogin: new Date().toISOString()
        }
      }
      
      const user = providerUsers[provider]
      const jwtToken = this.generateDemoToken(user)
      const expiresIn = 3600
      
      this.state.user = user
      this.state.token = jwtToken
      this.state.isAuthenticated = true
      
      this.saveAuthInfo(jwtToken, user, expiresIn, false)
      
      console.log(`${provider} 用户 ${user.username} 登录成功`)
      return user
      
    } catch (error: any) {
      console.error(`${provider} 登录失败:`, error)
      throw new Error(`${provider} 登录失败: ${error.message}`)
    } finally {
      this.state.isLoading = false
    }
  }

  // 忘记密码
  async forgotPassword(email: string): Promise<void> {
    try {
      // 模拟发送重置邮件
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('请输入有效的邮箱地址')
      }
      
      console.log(`密码重置邮件已发送到: ${email}`)
      // 在真实环境中，这里会调用API发送重置邮件
      
    } catch (error: any) {
      console.error('发送重置邮件失败:', error)
      throw new Error('发送重置邮件失败，请稍后重试')
    }
  }

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // 模拟密码重置
      await new Promise(resolve => setTimeout(resolve, 800))
      
      if (!newPassword || newPassword.length < 6) {
        throw new Error('密码长度不能少于6位')
      }
      
      console.log('密码重置成功')
      // 在真实环境中，这里会调用API重置密码
      
    } catch (error: any) {
      console.error('密码重置失败:', error)
      throw new Error('密码重置失败，请检查重置链接是否有效')
    }
  }

  // 登出
  async logout(): Promise<void> {
    try {
      // 调用后端登出接口（演示模式下可选）
      if (this.state.token && !env.ENABLE_MOCK_DATA) {
        await apiService.post<{}>('auth', 'auth/logout', {})
      } else if (env.ENABLE_MOCK_DATA) {
        console.log('演示模式：跳过登出API调用')
      }
    } catch (error) {
      console.warn('登出API调用失败:', error)
      // 在演示模式下，登出API失败不应阻止本地登出
    } finally {
      // 清理本地认证信息
      this.clearAuthInfo()
      this.resetState()
    }
  }

  // 刷新token
  async refreshToken(): Promise<string> {
    try {
      // 演示模式下使用模拟刷新
      if (env.ENABLE_MOCK_DATA && this.state.user && this.state.token) {
        console.log('演示模式：模拟token刷新')
        
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 生成新的token
        const newToken = this.generateDemoToken(this.state.user)
        const expiresIn = 3600 // 1小时
        
        this.state.token = newToken
        this.saveToken(newToken, expiresIn)
        
        console.log('演示模式：token刷新成功')
        return newToken
      }
      
      // 生产模式下调用真实API
      const response = await apiService.post<{
        data: { token: string; expiresIn: number }
      }>('auth', 'auth/refresh', {})

      const { token, expiresIn } = response.data

      this.state.token = token
      this.saveToken(token, expiresIn)

      return token

    } catch (error) {
      console.error('Token刷新失败:', error)
      
      // 在演示模式下，如果刷新失败不清除登录状态
      if (env.ENABLE_MOCK_DATA) {
        console.log('演示模式：保持登录状态，即使刷新失败')
        return this.state.token || ''
      }
      
      await this.logout()
      throw new Error('会话已过期，请重新登录')
    }
  }

  // 获取当前token
  getToken(): string | null {
    return this.state.token
  }

  // 获取认证头
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // 检查token是否即将过期
  isTokenExpiringSoon(expiryBufferMinutes = 5): boolean {
    const token = this.getToken()
    if (!token) return true

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiryTime = payload.exp * 1000
      const bufferTime = expiryBufferMinutes * 60 * 1000
      return Date.now() + bufferTime >= expiryTime
    } catch (error) {
      console.error('Token解析失败:', error)
      return true
    }
  }

  // 公共初始化方法 - 用于外部调用
  async init(): Promise<void> {
    // 设置初始化标志，避免重复初始化
    if (this.state.isInitialized) {
      console.log('认证服务已经初始化，跳过重复初始化')
      return
    }
    
    this.state.isLoading = true
    try {
      // 初始化认证状态（从本地存储恢复）
      const initialized = await this.initializeAuth()
      
      // 设置自动刷新token的定时器
      this.setupTokenRefreshTimer()
      
      console.log('认证服务初始化完成', {
        initialized,
        isAuthenticated: this.state.isAuthenticated,
        hasToken: !!this.state.token
      })
    } catch (error) {
      console.error('认证服务初始化失败:', error)
    } finally {
      this.state.isLoading = false
      this.state.isInitialized = true
    }
  }

  // 检查认证服务是否已初始化
  isInitialized(): boolean {
    return this.state.isInitialized
  }

  // 等待认证服务初始化完成
  async waitForInitialization(timeout: number = 3000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (this.state.isInitialized) {
        return true
      }
      // 等待100ms再检查
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.warn('等待认证服务初始化超时')
    return false
  }

  // 设置token自动刷新定时器
  private setupTokenRefreshTimer(): void {
    // 每分钟检查一次token是否需要刷新
    setInterval(() => {
      if (this.state.isAuthenticated && this.isTokenExpiringSoon(2)) {
        console.log('Token即将过期，准备刷新...')
        this.refreshToken().catch((error) => {
          console.error('自动刷新token失败:', error)
        })
      }
    }, 60000) // 每分钟检查一次
  }

  // 保存认证信息
  private saveAuthInfo(token: string, user: User, expiresIn: number, rememberMe: boolean = false): void {
    // 保存token
    this.saveToken(token, expiresIn)
    
    // 保存用户信息
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))

    // 如果选择记住登录，保存长期token
    if (rememberMe) {
      this.saveRememberToken(token, expiresIn)
    }
  }

  // 保存token
  private saveToken(token: string, expiresIn: number): void {
    const expiryTime = Date.now() + (expiresIn * 1000)
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify({
      token,
      expiryTime
    }))
  }

  // 保存记住登录token
  private saveRememberToken(token: string, expiresIn: number): void {
    const expiryTime = Date.now() + (expiresIn * 1000 * 24 * 7) // 7天
    localStorage.setItem(this.REMEMBER_TOKEN_KEY, JSON.stringify({
      token,
      expiryTime
    }))
  }

  // 获取存储的token
  private getStoredToken(): string | null {
    const tokenData = localStorage.getItem(this.TOKEN_KEY)
    if (tokenData) {
      try {
        const { token, expiryTime } = JSON.parse(tokenData)
        if (Date.now() < expiryTime) {
          return token
        } else {
          // Token已过期，清理
          localStorage.removeItem(this.TOKEN_KEY)
        }
      } catch (error) {
        console.error('Token数据解析失败:', error)
        localStorage.removeItem(this.TOKEN_KEY)
      }
    }

    // 检查记住登录token
    const rememberTokenData = localStorage.getItem(this.REMEMBER_TOKEN_KEY)
    if (rememberTokenData) {
      try {
        const { token, expiryTime } = JSON.parse(rememberTokenData)
        if (Date.now() < expiryTime) {
          return token
        } else {
          localStorage.removeItem(this.REMEMBER_TOKEN_KEY)
        }
      } catch (error) {
        console.error('Remember token解析失败:', error)
        localStorage.removeItem(this.REMEMBER_TOKEN_KEY)
      }
    }

    return null
  }

  // 获取存储的用户信息
  private getStoredUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY)
    if (userData) {
      try {
        return JSON.parse(userData)
      } catch (error) {
        console.error('用户数据解析失败:', error)
        localStorage.removeItem(this.USER_KEY)
      }
    }
    return null
  }

  // 清理认证信息
  private clearAuthInfo(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REMEMBER_TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  // 重置状态
  private resetState(): void {
    this.state.user = null
    this.state.token = null
    this.state.isAuthenticated = false
    this.state.isLoading = false
  }
}

// 创建全局认证服务实例
export const authService = new AuthService()

// 导出便捷方法
export const useAuth = () => {
  return {
    authState: authService.authState,
    currentUser: authService.currentUser,
    isLoggedIn: authService.isLoggedIn,
    userRole: authService.userRole,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    refreshToken: authService.refreshToken.bind(authService),
    getToken: authService.getToken.bind(authService),
    getAuthHeaders: authService.getAuthHeaders.bind(authService),
    hasPermission: authService.hasPermission.bind(authService),
    hasRole: authService.hasRole.bind(authService),
    isTokenExpiringSoon: authService.isTokenExpiringSoon.bind(authService)
  }
}

export default authService