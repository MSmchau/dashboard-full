import { createRouter, createWebHistory } from 'vue-router'

// 导入权限常量
import { PERMISSIONS, ROLES } from '@/directives/permission'
// 导入路由守卫
import { createRouterGuards } from '@/guards/router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { 
      title: '登录',
      requiresAuth: false,
      hideForAuthenticated: true 
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPassword.vue'),
    meta: { 
      title: '忘记密码',
      requiresAuth: false 
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPassword.vue'),
    meta: { 
      title: '重置密码',
      requiresAuth: false 
    }
  },
  {
    path: '/offline',
    name: 'Offline',
    component: () => import('@/views/Offline.vue'),
    meta: { 
      title: '离线页面',
      requiresAuth: false 
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { 
      title: '全局数据总览大屏',
      requiresAuth: true,
      permission: PERMISSIONS.DASHBOARD_VIEW,
      icon: 'Monitor',
      description: '系统总览和关键指标监控'
    }
  },
  {
    path: '/devices',
    name: 'Devices',
    redirect: '/device-monitor'
  },
  {
    path: '/device-monitor',
    name: 'DeviceMonitor',
    component: () => import('@/views/DeviceMonitor.vue'),
    meta: { 
      title: '设备监控详情页',
      requiresAuth: true,
      permission: PERMISSIONS.DEVICE_VIEW,
      icon: 'Cpu',
      description: '实时监控设备状态和性能指标',
      keepAlive: true
    }
  },
  {
    path: '/device-config',
    name: 'Config',
    component: () => import('@/views/Config.vue'),
    meta: { 
      title: '低代码配置页面',
      requiresAuth: true,
      permission: PERMISSIONS.DEVICE_MANAGE,
      roles: [ROLES.OPERATOR, ROLES.ADMIN],
      icon: 'Setting',
      description: '设备参数配置和管理',
      keepAlive: false
    }
  },
  {
    path: '/error-monitor',
    name: 'ErrorMonitoring',
    component: () => import('@/views/ErrorMonitoring.vue'),
    meta: { 
      title: '错误监控中心',
      requiresAuth: true,
      permission: PERMISSIONS.ERROR_VIEW,
      icon: 'Warning',
      description: '系统错误和异常监控',
      keepAlive: true
    }
  },
  {
    path: '/error-logs',
    name: 'ErrorLogs',
    component: () => import('@/views/ErrorLogs.vue'),
    meta: { 
      title: '错误日志',
      requiresAuth: true,
      permission: PERMISSIONS.ERROR_VIEW,
      icon: 'Document',
      description: '查看最近的错误日志记录',
      keepAlive: true
    }
  },
  {
    path: '/performance',
    name: 'PerformanceMonitoring',
    component: () => import('@/views/PerformanceMonitoring.vue'),
    meta: { 
      title: '性能监控中心',
      requiresAuth: true,
      permission: PERMISSIONS.PERFORMANCE_VIEW,
      icon: 'TrendCharts',
      description: 'API性能测试和分析',
      keepAlive: true
    }
  },
  {
    path: '/performance-test',
    name: 'PerformanceTest',
    component: () => import('@/views/PerformanceTest.vue'),
    meta: { 
      title: '性能测试页面',
      requiresAuth: true,
      permission: PERMISSIONS.PERFORMANCE_VIEW,
      description: '性能测试和监控',
      keepAlive: false
    }
  },
  {
    path: '/test-auth',
    name: 'TestAuth',
    component: () => import('@/views/TestAuth.vue'),
    meta: { 
      title: '认证系统测试',
      requiresAuth: true,
      permission: PERMISSIONS.DASHBOARD_VIEW,
      description: '认证系统和权限测试'
    }
  },
  {
    path: '/simple-test',
    name: 'SimpleTest',
    component: () => import('@/views/SimpleTest.vue'),
    meta: { 
      title: '路由守卫测试',
      requiresAuth: false 
    }
  },
  {
    path: '/router-test',
    name: 'RouterTest',
    component: () => import('@/views/RouterTest.vue'),
    meta: { 
      title: '路由守卫详细测试',
      requiresAuth: false 
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { 
      title: '页面未找到',
      requiresAuth: false 
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 路由行为配置
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash }
    } else {
      return { top: 0 }
    }
  }
})

// 初始化路由守卫
createRouterGuards(router)

console.log('路由守卫已初始化')

// 路由信息获取辅助函数
export const getRoutePermission = (routeName: string): string | null => {
  const route = routes.find(r => r.name === routeName)
  return route?.meta?.permission || null
}

export const getRouteRoles = (routeName: string): string[] => {
  const route = routes.find(r => r.name === routeName)
  const roles = route?.meta?.roles
  return Array.isArray(roles) ? roles : []
}

export const getRouteIcon = (routeName: string): string | null => {
  const route = routes.find(r => r.name === routeName)
  return route?.meta?.icon || null
}

export const getRouteDescription = (routeName: string): string | null => {
  const route = routes.find(r => r.name === routeName)
  return route?.meta?.description || null
}

export default router