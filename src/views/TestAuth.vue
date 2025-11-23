<template>
  <div class="test-auth">
    <h1>认证系统测试</h1>
    
    <div class="test-section">
      <h2>1. 认证状态检查</h2>
      <button @click="checkAuthStatus">检查认证状态</button>
      <div class="result" v-if="authStatus">
        <pre>{{ authStatus }}</pre>
      </div>
    </div>
    
    <div class="test-section">
      <h2>2. 路由测试</h2>
      <button @click="testRouter">测试路由守卫</button>
      <div class="result" v-if="routerTest">
        <pre>{{ routerTest }}</pre>
      </div>
    </div>
    
    <div class="test-section">
      <h2>3. 权限测试</h2>
      <button @click="testPermissions">测试权限</button>
      <div class="result" v-if="permissionTest">
        <pre>{{ permissionTest }}</pre>
      </div>
    </div>
    
    <div class="test-section">
      <h2>4. 快速登录测试</h2>
      <div class="login-buttons">
        <button @click="quickLogin('admin')">管理员登录</button>
        <button @click="quickLogin('operator')">操作员登录</button>
        <button @click="logout">登出</button>
      </div>
      <div class="result" v-if="loginTest">
        <pre>{{ loginTest }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '@/services/auth'

const router = useRouter()
const route = useRoute()

const authStatus = ref('')
const routerTest = ref('')
const permissionTest = ref('')
const loginTest = ref('')

const checkAuthStatus = () => {
  try {
    const status = {
      isLoggedIn: authService.isLoggedIn,
      userRole: authService.userRole,
      permissions: authService.permissions,
      token: authService.token ? '存在' : '不存在',
      userInfo: authService.user
    }
    
    authStatus.value = JSON.stringify(status, null, 2)
    console.log('认证状态检查:', status)
  } catch (error) {
    authStatus.value = `检查失败: ${error}`
  }
}

const testRouter = async () => {
  try {
    const testRoutes = ['/dashboard', '/device-monitor', '/users']
    const results = []
    
    for (const routePath of testRoutes) {
      try {
        await router.push(routePath)
        results.push(`${routePath}: ✓ 访问成功`)
      } catch (error: any) {
        if (error.name === 'NavigationFailure') {
          results.push(`${routePath}: ⚠ 导航被阻止 (${error.type})`)
        } else {
          results.push(`${routePath}: ✗ 访问失败 (${error.message})`)
        }
      }
    }
    
    routerTest.value = results.join('\n')
    console.log('路由测试结果:', results)
  } catch (error) {
    routerTest.value = `路由测试失败: ${error}`
  }
}

const testPermissions = () => {
  try {
    const tests = [
      { permission: 'dashboard:view', result: authService.hasPermission('dashboard:view') },
      { permission: 'device:view', result: authService.hasPermission('device:view') },
      { permission: 'user:view', result: authService.hasPermission('user:view') },
      { permission: 'admin', result: authService.hasRole('admin') },
      { permission: 'operator', result: authService.hasRole('operator') }
    ]
    
    const results = tests.map(test => 
      `${test.permission}: ${test.result ? '✓' : '✗'}`
    ).join('\n')
    
    permissionTest.value = results
    console.log('权限测试结果:', tests)
  } catch (error) {
    permissionTest.value = `权限测试失败: ${error}`
  }
}

const quickLogin = async (role: string) => {
  try {
    loginTest.value = '正在登录...'
    
    let loginData
    if (role === 'admin') {
      loginData = { username: 'admin', password: 'admin123' }
    } else {
      loginData = { username: 'operator', password: 'operator123' }
    }
    
    const result = await authService.login(loginData.username, loginData.password)
    loginTest.value = `✓ 登录成功: ${JSON.stringify(result, null, 2)}`
    
    // 检查认证状态
    setTimeout(() => {
      checkAuthStatus()
    }, 1000)
    
  } catch (error: any) {
    loginTest.value = `✗ 登录失败: ${error.message || error}`
  }
}

const logout = async () => {
  try {
    await authService.logout()
    loginTest.value = '✓ 已登出'
    
    // 检查认证状态
    setTimeout(() => {
      checkAuthStatus()
    }, 1000)
    
  } catch (error) {
    loginTest.value = `登出失败: ${error}`
  }
}

// 页面加载时检查认证状态
checkAuthStatus()

console.log('TestAuth 组件已加载')
console.log('路由守卫应该已初始化')
</script>

<style scoped>
.test-auth {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.result {
  margin-top: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.result pre {
  margin: 0;
  white-space: pre-wrap;
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

.login-buttons {
  margin: 10px 0;
}
</style>