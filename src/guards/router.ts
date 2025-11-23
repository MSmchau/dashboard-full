import { Router, NavigationFailureType } from 'vue-router'
import { authService } from '@/services/auth'
import { apiService } from '@/services/api'
import { ElNotification } from 'element-plus'

// 路由守卫辅助函数
const handleUnauthorized = async () => {
  try {
    await authService.logout()
    ElNotification({
      title: '认证失败',
      message: '登录已过期，请重新登录',
      type: 'warning',
      duration: 3000
    })
  } catch (error) {
    console.error('登出失败:', error)
  }
}

const handleNetworkError = () => {
  ElNotification({
    title: '网络错误',
    message: '网络连接异常，请检查网络设置',
    type: 'error',
    duration: 3000
  })
}

const handlePermissionDenied = (requiredPermission: string) => {
  ElNotification({
    title: '权限不足',
    message: `您没有访问此页面的权限: ${requiredPermission}`,
    type: 'warning',
    duration: 3000
  })
}

// 权限检查中间件
const checkPermission = (requiredPermission: string): boolean => {
  return authService.hasPermission(requiredPermission)
}

// 角色检查中间件
const checkRole = (allowedRoles: string | string[]): boolean => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  const userRole = authService.userRole
  return userRole ? roles.includes(userRole) : false
}

// 页面访问权限映射
const PAGE_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'dashboard:view',
  '/devices': 'device:view',
  '/device-monitor': 'device:view',
  '/device-config': 'device:manage',
  '/config': 'config:view',
  '/users': 'user:view',
  '/system': 'system:view',
  '/error-monitor': 'error:view',
  '/performance': 'performance:view'
}

const ADMIN_ONLY_ROUTES = [
  '/users',
  '/system'
]

const OPERATOR_ROUTES = [
  '/device-config',
  '/config'
]

// 创建路由守卫配置
export const createRouterGuards = (router: Router) => {
  // 全局前置守卫
  router.beforeEach(async (to, from, next) => {
    console.log(`路由跳转: ${from.path} -> ${to.path}`)
    
    // 不等待认证服务初始化，直接进行基础验证
    // 动态导入页面组件，实现懒加载
    const meta = to.meta as any
    const isPublicRoute = meta?.requiresAuth === false
    const requiredPermission = meta?.permission
    const requiredRoles = meta?.roles
    
    // 检查路由是否公开或用户已登录
    const isAuthenticated = authService.isLoggedIn
    
    // 公开路由直接放行
    if (isPublicRoute) {
      console.log('公开路由，放行')
      return next()
    }
    
    // 非公开路由需要认证
    if (!isAuthenticated) {
      console.log('未认证用户，重定向到登录页')
      
      // 保存当前路径，登录成功后跳转回来
      if (to.path !== '/login') {
        sessionStorage.setItem('redirectPath', to.fullPath)
      }
      
      return next('/login')
    }
    
    // 权限检查
    if (requiredPermission && !authService.hasPermission(requiredPermission)) {
      console.log('权限不足，跳转到403页面')
      return next('/403')
    }
    
    // 角色检查
    if (requiredRoles && requiredRoles.length > 0) {
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
      const hasRole = roles.some(role => authService.hasRole(role))
      if (!hasRole) {
        console.log('角色权限不足，跳转到403页面')
        return next('/403')
      }
    }
    
    console.log('路由验证通过，继续跳转')
    next()
  })
  
  // 全局解析守卫
  router.beforeResolve(async (to, from, next) => {
    console.log(`路由解析: ${from.path} -> ${to.path}`)
    
    // 检查token是否即将过期，如果是且用户在线，则尝试刷新
    if (authService.isLoggedIn && authService.isTokenExpiringSoon(2)) {
      console.log('Token即将过期，尝试刷新...')
      try {
        await authService.refreshToken()
        console.log('Token刷新成功')
      } catch (error) {
        console.error('Token刷新失败:', error)
        // 刷新失败，清除认证状态并重定向到登录页
        await authService.logout()
        return next('/login')
      }
    }
    
    next()
  })
  
  // 全局后置守卫
  router.afterEach((to, from, failure) => {
    if (failure) {
      console.error('路由跳转失败:', failure)
      
      // 针对特定错误提供用户友好的提示
      if (failure.type === NavigationFailureType.redirected) {
        console.log('路由被重定向')
      } else if (failure.type === NavigationFailureType.cancelled) {
        console.log('路由跳转被取消')
      } else if (failure.type === NavigationFailureType.duplicated) {
        console.log('重复的路由跳转')
      }
    } else {
      console.log(`路由跳转成功: ${from.path} -> ${to.path}`)
    }
  })
}

// 路由权限装饰器
export const withPermission = (permission: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !descriptor.value) {
      console.warn(`无法为 ${propertyKey} 应用权限装饰器: descriptor 无效`)
      return descriptor
    }
    
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      if (!checkPermission(permission)) {
        throw new Error(`权限不足: ${permission}`)
      }
      return originalMethod.apply(this, args)
    }
    
    return descriptor
  }
}

// 路由角色装饰器
export const withRole = (role: string | string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !descriptor.value) {
      console.warn(`无法为 ${propertyKey} 应用角色装饰器: descriptor 无效`)
      return descriptor
    }
    
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      if (!checkRole(role)) {
        throw new Error(`角色权限不足: ${role}`)
      }
      return originalMethod.apply(this, args)
    }
    
    return descriptor
  }
}

// 动态权限检查函数
export const canAccessRoute = (routePath: string): boolean => {
  const requiredPermission = PAGE_PERMISSIONS[routePath]
  if (!requiredPermission) return true
  
  return checkPermission(requiredPermission)
}

// 检查路由是否需要管理员权限
export const requiresAdmin = (routePath: string): boolean => {
  return ADMIN_ONLY_ROUTES.includes(routePath)
}

// 检查路由是否需要操作员权限
export const requiresOperator = (routePath: string): boolean => {
  return OPERATOR_ROUTES.includes(routePath)
}

export default {
  createRouterGuards,
  withPermission,
  withRole,
  canAccessRoute,
  requiresAdmin,
  requiresOperator
}