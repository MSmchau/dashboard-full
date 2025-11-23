import { DirectiveBinding, ObjectDirective } from 'vue'
import { authService } from '@/services/auth'

// 权限指令
export const permissionDirective: ObjectDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const permission = typeof value === 'string' ? value : null

    if (permission && !authService.hasPermission(permission)) {
      el.style.display = 'none'
      el.setAttribute('data-permission-denied', 'true')
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const permission = typeof value === 'string' ? value : null

    if (permission && !authService.hasPermission(permission)) {
      el.style.display = 'none'
      el.setAttribute('data-permission-denied', 'true')
    } else {
      el.style.display = ''
      el.removeAttribute('data-permission-denied')
    }
  }
}

// 角色指令
export const roleDirective: ObjectDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const roles = Array.isArray(value) ? value : [value]
    const userRole = authService.userRole

    if (!userRole || !roles.includes(userRole)) {
      el.style.display = 'none'
      el.setAttribute('data-role-denied', 'true')
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const roles = Array.isArray(value) ? value : [value]
    const userRole = authService.userRole

    if (!userRole || !roles.includes(userRole)) {
      el.style.display = 'none'
      el.setAttribute('data-role-denied', 'true')
    } else {
      el.style.display = ''
      el.removeAttribute('data-role-denied')
    }
  }
}

// 登录状态指令
export const authDirective: ObjectDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const requireAuth = binding.value !== false

    if (requireAuth && !authService.isLoggedIn) {
      el.style.display = 'none'
      el.setAttribute('data-auth-required', 'true')
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    const requireAuth = binding.value !== false

    if (requireAuth && !authService.isLoggedIn) {
      el.style.display = 'none'
      el.setAttribute('data-auth-required', 'true')
    } else {
      el.style.display = ''
      el.removeAttribute('data-auth-required')
    }
  }
}

// 自定义权限检查组合式函数
export function usePermissions() {
  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission)
  }

  const hasRole = (role: string | string[]): boolean => {
    const roles = Array.isArray(role) ? role : [role]
    const userRole = authService.userRole
    return userRole ? roles.includes(userRole) : false
  }

  const isAdmin = (): boolean => {
    return authService.hasRole('admin')
  }

  const isOperator = (): boolean => {
    return authService.hasRole('operator') || authService.hasRole('admin')
  }

  const canView = (resource: string): boolean => {
    return authService.hasPermission(`${resource}:view`)
  }

  const canEdit = (resource: string): boolean => {
    return authService.hasPermission(`${resource}:edit`)
  }

  const canControl = (resource: string): boolean => {
    return authService.hasPermission(`${resource}:control`)
  }

  const canManage = (resource: string): boolean => {
    return authService.hasPermission(`${resource}:manage`)
  }

  return {
    hasPermission,
    hasRole,
    isAdmin,
    isOperator,
    canView,
    canEdit,
    canControl,
    canManage,
    currentUser: authService.currentUser,
    isLoggedIn: authService.isLoggedIn,
    userRole: authService.userRole
  }
}

// 权限检查工具函数
export const checkPermission = (permission: string): boolean => {
  return authService.hasPermission(permission)
}

export const checkRole = (role: string | string[]): boolean => {
  const roles = Array.isArray(role) ? role : [role]
  const userRole = authService.userRole
  return userRole ? roles.includes(userRole) : false
}

// 权限掩码定义
export const PERMISSIONS = {
  // 仪表盘权限
  DASHBOARD_VIEW: 'dashboard:view',
  
  // 设备权限
  DEVICE_VIEW: 'device:view',
  DEVICE_CONTROL: 'device:control',
  DEVICE_MANAGE: 'device:manage',
  
  // 配置权限
  CONFIG_VIEW: 'config:view',
  CONFIG_EDIT: 'config:edit',
  
  // 用户权限
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_MANAGE: 'user:manage',
  
  // 系统权限
  SYSTEM_VIEW: 'system:view',
  SYSTEM_MANAGE: 'system:manage',
  
  // 监控权限
  ERROR_VIEW: 'error:view',
  PERFORMANCE_VIEW: 'performance:view',
  PERFORMANCE_MANAGE: 'performance:manage'
} as const

// 角色定义
export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
} as const

export default {
  permissionDirective,
  roleDirective,
  authDirective,
  usePermissions,
  checkPermission,
  checkRole,
  PERMISSIONS,
  ROLES
}