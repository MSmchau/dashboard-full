<template>
  <div class="simple-test">
    <h1>路由守卫测试</h1>
    
    <div class="info">
      <h2>认证状态</h2>
      <p>是否登录: <strong>{{ isLoggedIn ? '是' : '否' }}</strong></p>
      <p>用户角色: <strong>{{ userRole || '未设置' }}</strong></p>
      <p>权限列表: <strong>{{ permissions.join(', ') || '无权限' }}</strong></p>
    </div>
    
    <div class="actions">
      <h2>测试操作</h2>
      <button @click="simulateLogin">模拟登录</button>
      <button @click="simulateLogout">登出</button>
      <button @click="checkRouterGuards">检查路由守卫</button>
      <button @click="testNavigation">测试导航</button>
    </div>
    
    <div class="console-output">
      <h2>控制台输出</h2>
      <div ref="consoleContainer" class="console-container">
        <div v-for="(log, index) in consoleLogs" :key="index" :class="log.type">
          {{ log.timestamp }} - {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '@/services/auth'

const router = useRouter()
const route = useRoute()
const consoleContainer = ref<HTMLElement>()

const isLoggedIn = ref(false)
const userRole = ref('')
const permissions = ref<string[]>([])
const consoleLogs = ref<Array<{timestamp: string, message: string, type: string}>>([])

const addLog = (message: string, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  consoleLogs.value.push({ timestamp, message, type })
  
  // 自动滚动到底部
  setTimeout(() => {
    if (consoleContainer.value) {
      consoleContainer.value.scrollTop = consoleContainer.value.scrollHeight
    }
  }, 10)
  
  // 同时输出到真实控制台
  console.log(`[${timestamp}] ${message}`)
}

const updateAuthStatus = () => {
  isLoggedIn.value = authService.isLoggedIn
  userRole.value = authService.userRole || ''
  permissions.value = authService.permissions || []
  addLog(`认证状态更新 - 登录: ${isLoggedIn.value}, 角色: ${userRole.value}`)
}

const simulateLogin = async () => {
  try {
    addLog('开始模拟登录...')
    const result = await authService.login('admin', 'admin123')
    addLog(`登录成功: ${JSON.stringify(result)}`)
    updateAuthStatus()
  } catch (error: any) {
    addLog(`登录失败: ${error.message || error}`, 'error')
  }
}

const simulateLogout = async () => {
  try {
    addLog('开始登出...')
    await authService.logout()
    addLog('登出成功')
    updateAuthStatus()
  } catch (error: any) {
    addLog(`登出失败: ${error.message || error}`, 'error')
  }
}

const checkRouterGuards = () => {
  addLog('检查路由守卫配置...')
  
  // 检查路由配置
  const routes = router.getRoutes()
  addLog(`当前路由数量: ${routes.length}`)
  
  routes.forEach(route => {
    if (route.meta) {
      const requiresAuth = route.meta.requiresAuth
      const permission = route.meta.permission
      const roles = route.meta.roles
      addLog(`路由 ${route.path}: requiresAuth=${requiresAuth}, permission=${permission}, roles=${roles}`)
    }
  })
}

const testNavigation = async () => {
  addLog('开始测试导航...')
  
  const testRoutes = ['/dashboard', '/device-monitor', '/users', '/login']
  
  for (const routePath of testRoutes) {
    try {
      addLog(`尝试导航到: ${routePath}`)
      await router.push(routePath)
      addLog(`✓ 导航到 ${routePath} 成功`)
    } catch (error: any) {
      if (error.name === 'NavigationFailure') {
        addLog(`⚠ 导航到 ${routePath} 被阻止 (类型: ${error.type})`)
      } else {
        addLog(`✗ 导航到 ${routePath} 失败: ${error.message}`, 'error')
      }
    }
  }
}

// 拦截console.log, console.warn, console.error
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
}

const interceptConsole = () => {
  console.log = function(...args) {
    addLog(args.join(' '))
    originalConsole.log.apply(console, args)
  }
  
  console.warn = function(...args) {
    addLog(args.join(' '), 'warning')
    originalConsole.warn.apply(console, args)
  }
  
  console.error = function(...args) {
    addLog(args.join(' '), 'error')
    originalConsole.error.apply(console, args)
  }
}

onMounted(() => {
  addLog('SimpleTest 组件已挂载')
  interceptConsole()
  updateAuthStatus()
  
  // 监听路由变化
  router.afterEach((to, from, failure) => {
    if (failure) {
      addLog(`路由跳转失败: ${from.path} -> ${to.path}, 错误: ${failure}`, 'error')
    } else {
      addLog(`路由跳转成功: ${from.path} -> ${to.path}`)
    }
  })
  
  addLog('路由守卫应该已经初始化')
  
  // 检查是否有"路由守卫已初始化"的日志
  setTimeout(() => {
    addLog('检查页面刷新后的路由守卫状态...')
  }, 2000)
})
</script>

<style scoped>
.simple-test {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.info, .actions, .console-output {
  margin: 20px 0;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.console-container {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  border-radius: 4px;
}

.info strong {
  color: #409eff;
}

button {
  background: #409eff;
  color: white;
  border: none;
  padding: 8px 16px;
  margin: 5px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #66b1ff;
}

.console-container div {
  margin: 2px 0;
  padding: 2px;
}

.console-container div.warning {
  color: #e6a23c;
}

.console-container div.error {
  color: #f56c6c;
}
</style>