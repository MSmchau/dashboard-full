import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, User as AuthUser } from '@/services/auth'

// 用户数据类型定义
interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: 'admin' | 'operator' | 'viewer'
  permissions: string[]
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      sound: boolean
    }
  }
  lastLogin: number
  createdAt: number
}

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  refreshToken: string | null
  tokenExpiry: number | null
}

interface UserState {
  currentUser: User | null
  auth: AuthState
  isLoading: boolean
  error: string | null
  success: string | null
  tokenTimeRemaining: number
  isTokenExpiring: boolean
  sessionWarningShown: boolean
}

// 扩展偏好设置
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sound: boolean
  }
  dashboard: {
    defaultLayout: string
    autoRefresh: boolean
    refreshInterval: number
  }
  privacy: {
    profileVisibility: 'public' | 'private'
    activityStatus: boolean
  }
}

// 错误类型定义
interface UserError {
  type: 'auth' | 'profile' | 'preferences' | 'password' | 'permission'
  message: string
  details?: any
  timestamp: number
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const state = ref<UserState>({
    currentUser: null,
    auth: {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      tokenExpiry: null
    },
    isLoading: false,
    error: null,
    success: null,
    tokenTimeRemaining: 0,
    isTokenExpiring: false,
    sessionWarningShown: false
  })

  // 错误日志
  const errorLog = ref<UserError[]>([])

  // 计算属性
  const currentUser = computed(() => state.value.currentUser)
  const isAuthenticated = computed(() => state.value.auth.isAuthenticated)
  const userRole = computed(() => state.value.currentUser?.role || 'viewer')
  const userPermissions = computed(() => state.value.currentUser?.permissions || [])
  const userPreferences = computed(() => state.value.currentUser?.preferences)

  const canEdit = computed(() => 
    ['admin', 'operator'].includes(userRole.value)
  )

  const canDelete = computed(() => 
    userRole.value === 'admin'
  )

  const canPublish = computed(() => 
    ['admin', 'operator'].includes(userRole.value)
  )

  const canManageUsers = computed(() => 
    userRole.value === 'admin'
  )

  const isAdmin = computed(() => userRole.value === 'admin')
  const isOperator = computed(() => userRole.value === 'operator')
  const isViewer = computed(() => userRole.value === 'viewer')

  // 增强的权限检查方法
  const hasPermission = (permission: string): boolean => {
    if (!state.value.currentUser || !state.value.auth.isAuthenticated) {
      return false
    }
    return state.value.currentUser.permissions.includes(permission) || 
           state.value.currentUser.role === 'admin'
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  const hasRole = (role: 'admin' | 'operator' | 'viewer'): boolean => {
    const roleHierarchy = {
      'admin': 3,
      'operator': 2,
      'viewer': 1
    }
    return roleHierarchy[userRole.value] >= roleHierarchy[role]
  }

  // 错误处理方法
  private addError = (type: UserError['type'], message: string, details?: any) => {
    const error: UserError = {
      type,
      message,
      details,
      timestamp: Date.now()
    }
    
    errorLog.value.unshift(error)
    
    // 保持错误日志在合理范围内
    if (errorLog.value.length > 100) {
      errorLog.value = errorLog.value.slice(0, 100)
    }
    
    console.error(`[UserStore Error] ${type}:`, message, details)
  }

  const clearErrors = () => {
    errorLog.value = []
    state.value.error = null
  }

  const clearError = (index?: number) => {
    if (index !== undefined && index >= 0 && index < errorLog.value.length) {
      errorLog.value.splice(index, 1)
    } else {
      clearErrors()
    }
  }

  // 消息处理
  const showSuccess = (message: string) => {
    state.value.success = message
    setTimeout(() => {
      state.value.success = null
    }, 5000)
  }

  const showError = (message: string) => {
    state.value.error = message
    setTimeout(() => {
      state.value.error = null
    }, 8000)
  }

  // Token管理
  const updateTokenTimeRemaining = () => {
    if (state.value.auth.tokenExpiry) {
      const now = Math.floor(Date.now() / 1000)
      state.value.tokenTimeRemaining = Math.max(0, state.value.auth.tokenExpiry - now)
      
      // 检查是否即将过期（5分钟内）
      const isExpiringSoon = state.value.tokenTimeRemaining <= 300
      state.value.isTokenExpiring = isExpiringSoon
      
      // 显示会话警告
      if (isExpiringSoon && !state.value.sessionWarningShown) {
        showSessionWarning()
      }
    }
  }

  const showSessionWarning = () => {
    state.value.sessionWarningShown = true
    // 这里可以触发UI组件显示会话即将过期的警告
    console.warn('用户会话即将过期')
  }

  // 异步操作
  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    state.value.isLoading = true
    state.value.error = null
    state.value.success = null
    clearErrors()

    try {
      // 使用认证服务登录
      const user = await authService.login(username, password, rememberMe)
      
      // 同步状态
      state.value.currentUser = user as User
      state.value.auth = {
        isAuthenticated: true,
        token: authService.state.token,
        refreshToken: null, // 暂时设为null，后续可以添加
        tokenExpiry: authService.state.expiresAt
      }
      
      // 更新token时间
      updateTokenTimeRemaining()
      
      // 应用用户偏好设置
      await applyUserPreferences()
      
      showSuccess(`欢迎回来，${user.username}！`)
      addError('auth', `用户 ${user.username} 登录成功`, { userId: user.id })
      
      console.log('登录成功:', user.username)
    } catch (error: any) {
      const errorMessage = error.message || '登录失败，请检查用户名和密码'
      state.value.error = errorMessage
      addError('auth', errorMessage, error)
      console.error('登录失败:', error)
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  const logout = async (secure: boolean = true) => {
    state.value.isLoading = true

    try {
      if (secure) {
        await authService.secureLogout()
      } else {
        await authService.logout()
      }
      
      // 清除本地状态
      state.value.currentUser = null
      state.value.auth = {
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        tokenExpiry: null
      }
      
      state.value.tokenTimeRemaining = 0
      state.value.isTokenExpiring = false
      state.value.sessionWarningShown = false
      
      showSuccess('已安全登出')
      
      console.log('登出成功')
    } catch (error: any) {
      console.error('登出失败:', error)
      addError('auth', '登出过程中出现错误', error)
    } finally {
      state.value.isLoading = false
    }
  }

  const checkAuth = async () => {
    try {
      // 尝试从认证服务恢复状态
      const isAuthenticated = await authService.initializeAuth()
      
      if (isAuthenticated) {
        const authUser = authService.currentUser
        if (authUser) {
          state.value.currentUser = authUser as User
          state.value.auth = {
            isAuthenticated: true,
            token: authService.state.token,
            refreshToken: null,
            tokenExpiry: authService.state.expiresAt
          }
          
          updateTokenTimeRemaining()
          await applyUserPreferences()
          
          console.log('认证状态已恢复:', authUser.username)
          return true
        }
      }
      
      return false
    } catch (error: any) {
      console.error('检查认证状态失败:', error)
      addError('auth', '认证状态检查失败', error)
      await logout(false)
      return false
    }
  }

  const refreshToken = async () => {
    try {
      const success = await authService.refreshToken()
      if (success) {
        state.value.auth.token = authService.state.token
        state.value.auth.tokenExpiry = authService.state.expiresAt
        updateTokenTimeRemaining()
        state.value.sessionWarningShown = false
        console.log('Token刷新成功')
      } else {
        throw new Error('Token刷新失败')
      }
    } catch (error: any) {
      console.error('刷新token失败:', error)
      addError('auth', 'Token刷新失败', error)
      await logout()
      throw error
    }
  }

  const applyUserPreferences = async () => {
    if (!state.value.currentUser?.preferences) return

    try {
      const { theme, language, notifications } = state.value.currentUser.preferences
      
      // 应用主题
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme)
      }
      
      // 应用语言（这里可以扩展多语言支持）
      if (language) {
        document.documentElement.setAttribute('lang', language)
      }
      
      // 应用通知设置
      // 这里可以集成实际的推送通知服务
      
    } catch (error: any) {
      console.error('应用用户偏好设置失败:', error)
      addError('preferences', '应用偏好设置失败', error)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.value.currentUser) {
      throw new Error('用户未登录')
    }

    state.value.isLoading = true
    state.value.error = null
    clearErrors()

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800))

      const updatedUser = {
        ...state.value.currentUser,
        ...updates
      }

      state.value.currentUser = updatedUser

      // 更新本地存储
      localStorage.setItem('user_data', JSON.stringify(updatedUser))

      showSuccess('个人信息更新成功')
      addError('profile', '用户信息更新成功', { userId: updatedUser.id })

      console.log('个人信息更新成功')
    } catch (error: any) {
      const errorMessage = error.message || '更新个人信息失败'
      state.value.error = errorMessage
      addError('profile', errorMessage, error)
      console.error('更新个人信息失败:', error)
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    if (!state.value.currentUser) {
      throw new Error('用户未登录')
    }

    state.value.isLoading = true
    state.value.error = null
    clearErrors()

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))

      state.value.currentUser.preferences = {
        ...state.value.currentUser.preferences,
        ...preferences
      }

      // 更新本地存储
      localStorage.setItem('user_data', JSON.stringify(state.value.currentUser))

      // 立即应用变更的设置
      await applyUserPreferences()

      showSuccess('偏好设置更新成功')
      addError('preferences', '偏好设置更新成功', { preferences })

      console.log('偏好设置更新成功')
    } catch (error: any) {
      const errorMessage = error.message || '更新偏好设置失败'
      state.value.error = errorMessage
      addError('preferences', errorMessage, error)
      console.error('更新偏好设置失败:', error)
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  const changePassword = async (passwordData: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => {
    state.value.isLoading = true
    state.value.error = null
    clearErrors()

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('新密码和确认密码不匹配')
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error('密码长度不能少于6位')
      }

      showSuccess('密码修改成功')
      addError('password', '密码修改成功', { timestamp: Date.now() })

      console.log('密码修改成功')
    } catch (error: any) {
      const errorMessage = error.message || '修改密码失败'
      state.value.error = errorMessage
      addError('password', errorMessage, error)
      console.error('修改密码失败:', error)
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  const resetPassword = async (email: string) => {
    state.value.isLoading = true
    state.value.error = null
    clearErrors()

    try {
      await authService.forgotPassword(email)

      showSuccess('密码重置邮件已发送，请查收')
      addError('password', `密码重置邮件已发送到: ${email}`, { email })

      console.log('密码重置邮件已发送到:', email)
    } catch (error: any) {
      const errorMessage = error.message || '发送重置邮件失败'
      state.value.error = errorMessage
      addError('password', errorMessage, error)
      console.error('发送重置邮件失败:', error)
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  // 会话管理
  const startSessionMonitoring = () => {
    // 每分钟检查一次token状态
    setInterval(() => {
      if (state.value.auth.isAuthenticated) {
        updateTokenTimeRemaining()
      }
    }, 60000)
  }

  // 监听认证状态变化
  const onAuthStateChange = (callback: (state: UserState) => void) => {
    return authService.onAuthStateChange((authState) => {
      // 同步状态
      state.value.auth = {
        isAuthenticated: authState.isAuthenticated,
        token: authState.token,
        refreshToken: null,
        tokenExpiry: authState.expiresAt
      }
      
      if (authState.user) {
        state.value.currentUser = authState.user as User
      }
      
      updateTokenTimeRemaining()
      callback(state.value)
    })
  }

  // 获取错误统计
  const getErrorStats = () => {
    const stats = {
      total: errorLog.value.length,
      byType: {} as Record<string, number>,
      recent: errorLog.value.slice(0, 10)
    }
    
    errorLog.value.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
    })
    
    return stats
  }

  // 初始化
  const initialize = async () => {
    try {
      await checkAuth()
      startSessionMonitoring()
      console.log('用户状态管理初始化完成')
    } catch (error: any) {
      console.error('用户状态管理初始化失败:', error)
      addError('auth', '初始化失败', error)
    }
  }

  return {
    // 状态
    state: state.value,
    errorLog: errorLog.value,
    
    // 计算属性
    currentUser,
    isAuthenticated,
    userRole,
    userPermissions,
    userPreferences,
    canEdit,
    canDelete,
    canPublish,
    canManageUsers,
    isAdmin,
    isOperator,
    isViewer,
    
    // 权限检查方法
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    
    // 错误处理方法
    addError,
    clearErrors,
    clearError,
    getErrorStats,
    
    // 消息处理
    showSuccess,
    showError,
    
    // Token管理
    updateTokenTimeRemaining,
    
    // 方法
    login,
    logout,
    checkAuth,
    refreshToken,
    updateProfile,
    updatePreferences,
    changePassword,
    resetPassword,
    applyUserPreferences,
    
    // 会话管理
    startSessionMonitoring,
    onAuthStateChange,
    
    // 初始化
    initialize
  }
})