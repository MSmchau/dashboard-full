<template>
  <div class="router-test">
    <h1>路由守卫详细测试</h1>
    
    <div class="test-section">
      <h2>当前认证状态</h2>
      <p>登录状态: <span class="status" :class="{ 'logged-in': isLoggedIn, 'logged-out': !isLoggedIn }">
        {{ isLoggedIn ? '已登录' : '未登录' }}
      </span></p>
      <p>用户名: <strong>{{ username || '未设置' }}</strong></p>
      <p>角色: <strong>{{ role || '未设置' }}</strong></p>
      <p>权限: <strong>{{ permissions.join(', ') || '无权限' }}</strong></p>
    </div>
    
    <div class="test-section">
      <h2>路由测试</h2>
      <div class="route-buttons">
        <button @click="testRoute('/')">首页</button>
        <button @click="testRoute('/login')">登录页</button>
        <button @click="testRoute('/dashboard')">仪表盘</button>
        <button @click="testRoute('/device-monitor')">设备监控</button>
        <button @click="testRoute('/users')">用户管理</button>
        <button @click="testRoute('/403')">403页面</button>
      </div>
    </div>
    
    <div class="test-section">
      <h2>登录测试</h2>
      <div class="login-buttons">
        <button @click="login('admin', 'admin123')">登录admin</button>
        <button @click="login('operator', 'admin123')">登录operator</button>
        <button @click="login('viewer', 'admin123')">登录viewer</button>
        <button @click="logout">登出</button>
      </div>
    </div>
    
    <div class="test-section">
      <h2>路由守卫监控</h2>
      <button @click="monitorRouterGuards">监控路由守卫</button>
      <button @click="clearLogs">清除日志</button>
      <div class="log-container">
        <div v-for="log in logs" :key="log.id" :class="log.level">
          [{{ log.time }}] {{ log.message }}
        </div>
      </div>
    </div>
    
    <div class="test-section">
      <h2>API测试</h2>
      <button @click="testApiCalls">测试API调用</button>
      <button @click="testTokenValidation">测试Token验证</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '@/services/auth'

const router = useRouter()
const route = useRoute()

// 状态
const isLoggedIn = ref(false)
const username = ref('')
const role = ref('')
const permissions = ref<string[]>([])
const logs = ref<Array<{ id: number, time: string, message: string, level: string }>>([])

// 日志管理
let logId = 0
const addLog = (message: string, level: string = 'info') => {
  logId++
  const timestamp = new Date().toLocaleTimeString()
  logs.value.push({
    id: logId,
    time: timestamp,
    message,
    level
  })
  
  // 保持最多50条日志
  if (logs.value.length > 50) {
    logs.value.shift()
  }
}

const clearLogs = () => {
  logs.value = []
  addLog('日志已清除')
}

// 更新认证状态
const updateAuthState = () => {
  isLoggedIn.value = authService.isLoggedIn
  username.value = authService.currentUser?.username || ''
  role.value = authService.userRole || ''
  permissions.value = authService.currentUser?.permissions || []
  
  addLog(`状态更新: ${username.value} (${role.value})`)
}

// 路由测试
const testRoute = async (path: string) => {
  addLog(`测试路由: ${path}`, 'info')
  try {
    await router.push(path)
    addLog(`✓ 成功跳转到 ${path}`, 'success')
  } catch (error: any) {
    addLog(`✗ 路由跳转失败: ${error.message}`, 'error')
  }
}

// 登录测试
const login = async (username: string, password: string) => {
  addLog(`尝试登录: ${username}`, 'info')
  try {
    const user = await authService.login(username, password)
    addLog(`✓ 登录成功: ${user.username} (${user.role})`, 'success')
    updateAuthState()
  } catch (error: any) {
    addLog(`✗ 登录失败: ${error.message}`, 'error')
  }
}

// 登出测试
const logout = async () => {
  addLog('尝试登出', 'info')
  try {
    await authService.logout()
    addLog('✓ 登出成功', 'success')
    updateAuthState()
  } catch (error: any) {
    addLog(`✗ 登出失败: ${error.message}`, 'error')
  }
}

// 监控路由守卫
const monitorRouterGuards = () => {
  addLog('开始监控路由守卫', 'info')
  
  // 检查路由配置
  const routes = router.getRoutes()
  addLog(`当前路由数量: ${routes.length}`, 'info')
  
  // 显示路由配置
  routes.forEach((r, index) => {
    const meta = r.meta as any
    const requiresAuth = meta?.requiresAuth
    const permission = meta?.permission
    const roles = meta?.roles
    
    addLog(`路由 ${index + 1}: ${r.path}`, 'info')
    if (requiresAuth) {
      addLog(`  - 需要认证`, 'warning')
    }
    if (permission) {
      addLog(`  - 需要权限: ${permission}`, 'warning')
    }
    if (roles) {
      addLog(`  - 需要角色: ${roles.join(', ')}`, 'warning')
    }
  })
  
  // 检查认证服务状态
  const authState = authService.getAuthState()
  addLog(`认证状态: ${JSON.stringify(authState)}`, 'info')
}

// API测试
const testApiCalls = async () => {
  addLog('开始API测试', 'info')
  
  try {
    // 测试权限检查
    const hasDevicePermission = authService.hasPermission('device:view')
    addLog(`设备查看权限: ${hasDevicePermission}`, 'info')
    
    // 测试角色检查
    const isAdmin = authService.hasRole('admin')
    addLog(`管理员角色: ${isAdmin}`, 'info')
    
    // 测试Token状态
    const isTokenValid = authService.isTokenValid()
    addLog(`Token有效性: ${isTokenValid}`, 'info')
    
    addLog('API测试完成', 'success')
  } catch (error: any) {
    addLog(`API测试失败: ${error.message}`, 'error')
  }
}

// Token验证测试
const testTokenValidation = () => {
  addLog('开始Token验证测试', 'info')
  
  if (!authService.isLoggedIn) {
    addLog('未登录状态，无法验证Token', 'warning')
    return
  }
  
  const tokenTimeRemaining = authService.getTokenTimeRemaining()
  const isExpiringSoon = authService.isTokenExpiringSoon(5) // 5分钟内过期
  
  addLog(`Token剩余时间: ${Math.floor(tokenTimeRemaining / 60)}分钟`, 'info')
  addLog(`即将过期: ${isExpiringSoon ? '是' : '否'}`, isExpiringSoon ? 'warning' : 'info')
  
  if (isExpiringSoon) {
    addLog('⚠ Token即将过期，可能需要刷新', 'warning')
  } else {
    addLog('✓ Token状态正常', 'success')
  }
}

// 拦截全局错误
const handleGlobalError = (event: ErrorEvent) => {
  addLog(`全局错误: ${event.message}`, 'error')
}

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  addLog(`未处理的Promise拒绝: ${event.reason}`, 'error')
}

// 路由导航监控
const handleRouterError = (error: any) => {
  if (error.name === 'NavigationFailure') {
    addLog(`导航失败: ${error.type}`, 'error')
  } else {
    addLog(`路由错误: ${error.message}`, 'error')
  }
}

// 组件生命周期
onMounted(() => {
  addLog('RouterTest 组件已挂载', 'info')
  
  // 监听全局错误
  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  
  // 监听路由导航
  router.afterEach((to, from, failure) => {
    if (failure) {
      handleRouterError(failure)
    } else {
      addLog(`路由导航: ${from.path} -> ${to.path}`, 'info')
    }
  })
  
  // 初始状态更新
  updateAuthState()
  
  addLog('路由守卫测试组件已就绪', 'success')
})

onUnmounted(() => {
  // 清理监听器
  window.removeEventListener('error', handleGlobalError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
})
</script>

<style scoped>
.router-test {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.test-section {
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.test-section h2 {
  margin-top: 0;
  color: #495057;
}

.status {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

.status.logged-in {
  background-color: #d4edda;
  color: #155724;
}

.status.logged-out {
  background-color: #f8d7da;
  color: #721c24;
}

.route-buttons, .login-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #0056b3;
}

button:active {
  background: #004085;
}

.log-container {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  border-radius: 4px;
  margin-top: 10px;
}

.log-container div {
  margin: 2px 0;
  padding: 2px 4px;
  border-left: 3px solid transparent;
}

.log-container div.info {
  border-left-color: #17a2b8;
}

.log-container div.success {
  border-left-color: #28a745;
  color: #d4edda;
}

.log-container div.warning {
  border-left-color: #ffc107;
  color: #fff3cd;
}

.log-container div.error {
  border-left-color: #dc3545;
  color: #f8d7da;
}

strong {
  color: #007bff;
}
</style>