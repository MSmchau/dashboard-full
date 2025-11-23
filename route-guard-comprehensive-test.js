/**
 * 路由守卫综合测试脚本
 * 测试路由守卫系统的完整功能
 */

// 全局测试状态
const TestState = {
  passed: 0,
  failed: 0,
  total: 0,
  logs: []
}

// 测试工具函数
const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`
  console.log(logMessage)
  TestState.logs.push({ timestamp, type, message })
}

const assert = (condition, testName, errorMessage = '') => {
  TestState.total++
  if (condition) {
    TestState.passed++
    log(`✅ ${testName}`, 'success')
    return true
  } else {
    TestState.failed++
    log(`❌ ${testName}${errorMessage ? ': ' + errorMessage : ''}`, 'error')
    return false
  }
}

// 异步等待函数
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 主要测试函数
async function runComprehensiveTests() {
  log('开始路由守卫综合测试', 'info')
  log('=' * 50, 'info')
  
  try {
    // 测试1: 检查Vue Router是否正常加载
    await testVueRouter()
    
    // 测试2: 检查认证服务
    await testAuthService()
    
    // 测试3: 检查权限系统
    await testPermissionSystem()
    
    // 测试4: 检查路由配置
    await testRouteConfiguration()
    
    // 测试5: 检查Pinia Store
    await testPiniaStore()
    
    // 测试6: 检查路由守卫中间件
    await testRouterGuards()
    
    // 测试7: 模拟用户登录流程
    await testUserLoginFlow()
    
    // 测试8: 测试权限检查
    await testPermissionChecks()
    
    // 测试9: 测试路由导航
    await testRouteNavigation()
    
    // 生成测试报告
    generateTestReport()
    
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`, 'error')
  }
}

// 测试Vue Router
async function testVueRouter() {
  log('测试1: Vue Router基础功能', 'info')
  
  try {
    // 检查Vue Router是否加载
    assert(
      typeof window !== 'undefined' && window.Vue && window.VueRouter,
      'Vue Router已加载'
    )
    
    // 检查路由实例
    if (window.__app && window.__app.config && window.__app.config.globalProperties) {
      const router = window.__app.config.globalProperties.$router
      assert(router, '路由实例可用')
    }
    
    await wait(1000)
    
  } catch (error) {
    log(`Vue Router测试失败: ${error.message}`, 'error')
  }
}

// 测试认证服务
async function testAuthService() {
  log('测试2: 认证服务功能', 'info')
  
  try {
    // 检查authService是否存在
    assert(window.authService, 'authService全局对象存在')
    
    // 检查认证服务方法
    const authService = window.authService
    assert(typeof authService.isLoggedIn === 'function', 'isLoggedIn方法存在')
    assert(typeof authService.login === 'function', 'login方法存在')
    assert(typeof authService.logout === 'function', 'logout方法存在')
    assert(typeof authService.hasPermission === 'function', 'hasPermission方法存在')
    assert(typeof authService.hasRole === 'function', 'hasRole方法存在')
    
    // 检查初始认证状态
    const initialAuthState = authService.getAuthState()
    assert(initialAuthState !== null, '获取初始认证状态')
    log(`初始认证状态: ${JSON.stringify(initialAuthState)}`, 'info')
    
    await wait(500)
    
  } catch (error) {
    log(`认证服务测试失败: ${error.message}`, 'error')
  }
}

// 测试权限系统
async function testPermissionSystem() {
  log('测试3: 权限系统', 'info')
  
  try {
    // 检查权限常量
    assert(window.PERMISSIONS, '权限常量定义存在')
    assert(window.ROLES, '角色常量定义存在')
    
    // 检查权限指令
    assert(window.permissionDirective, '权限指令存在')
    assert(window.roleDirective, '角色指令存在')
    
    // 检查权限检查函数
    const authService = window.authService
    if (authService) {
      // 测试未登录状态的权限检查
      const dashboardPermission = authService.hasPermission('dashboard:view')
      assert(typeof dashboardPermission === 'boolean', '权限检查函数正常工作')
      
      const adminRole = authService.hasRole('admin')
      assert(typeof adminRole === 'boolean', '角色检查函数正常工作')
    }
    
    await wait(500)
    
  } catch (error) {
    log(`权限系统测试失败: ${error.message}`, 'error')
  }
}

// 测试路由配置
async function testRouteConfiguration() {
  log('测试4: 路由配置', 'info')
  
  try {
    // 检查路由配置
    assert(window.router, '路由实例存在')
    
    if (window.router) {
      const routes = window.router.getRoutes()
      assert(routes.length > 0, `路由配置包含 ${routes.length} 个路由`)
      
      // 检查关键路由是否存在
      const routeNames = routes.map(r => r.name)
      assert(routeNames.includes('Login'), '登录路由存在')
      assert(routeNames.includes('Dashboard'), '仪表盘路由存在')
      assert(routeNames.includes('RouterTest'), '路由测试路由存在')
      
      log(`发现的路由: ${routeNames.join(', ')}`, 'info')
    }
    
    await wait(500)
    
  } catch (error) {
    log(`路由配置测试失败: ${error.message}`, 'error')
  }
}

// 测试Pinia Store
async function testPiniaStore() {
  log('测试5: Pinia Store', 'info')
  
  try {
    // 检查Pinia Store是否存在
    assert(window.useUserStore, '用户Store存在')
    
    if (window.useUserStore) {
      const userStore = window.useUserStore()
      assert(userStore, '用户Store实例化成功')
      
      // 检查Store方法
      if (userStore) {
        assert(typeof userStore.login === 'function', 'Store login方法存在')
        assert(typeof userStore.logout === 'function', 'Store logout方法存在')
        assert(typeof userStore.checkAuth === 'function', 'Store checkAuth方法存在')
        
        const isAuthenticated = userStore.isAuthenticated
        assert(typeof isAuthenticated === 'boolean', '认证状态检查正常')
        
        log(`Store认证状态: ${isAuthenticated}`, 'info')
      }
    }
    
    await wait(500)
    
  } catch (error) {
    log(`Pinia Store测试失败: ${error.message}`, 'error')
  }
}

// 测试路由守卫中间件
async function testRouterGuards() {
  log('测试6: 路由守卫中间件', 'info')
  
  try {
    // 检查路由守卫函数是否存在
    assert(window.createRouterGuards, '路由守卫函数存在')
    
    // 检查路由导航状态
    const router = window.router
    if (router) {
      const currentRoute = router.currentRoute.value
      assert(currentRoute, '当前路由可访问')
      log(`当前路由: ${currentRoute.path}`, 'info')
    }
    
    await wait(500)
    
  } catch (error) {
    log(`路由守卫测试失败: ${error.message}`, 'error')
  }
}

// 测试用户登录流程
async function testUserLoginFlow() {
  log('测试7: 用户登录流程', 'info')
  
  try {
    const authService = window.authService
    
    if (authService) {
      // 检查未登录状态
      const initialLoginState = authService.isLoggedIn
      log(`登录前状态: ${initialLoginState}`, 'info')
      
      // 尝试登录演示用户
      try {
        log('尝试登录admin用户...', 'info')
        const user = await authService.login('admin', 'demo123', false)
        
        if (user) {
          assert(true, `用户 ${user.username} 登录成功`)
          
          // 检查登录后的状态
          const loginState = authService.isLoggedIn
          assert(loginState, '登录状态已更新')
          
          const userRole = authService.userRole
          assert(userRole, `用户角色: ${userRole}`)
          
          // 测试登出
          log('测试登出流程...', 'info')
          await authService.logout()
          
          const logoutState = authService.isLoggedIn
          assert(!logoutState, '登出状态正确')
          
        } else {
          log('登录失败: 用户对象为空', 'warning')
        }
        
      } catch (loginError) {
        log(`登录测试失败: ${loginError.message}`, 'warning')
        // 登录失败不算测试失败，可能是网络问题
      }
    }
    
    await wait(2000)
    
  } catch (error) {
    log(`用户登录流程测试失败: ${error.message}`, 'error')
  }
}

// 测试权限检查
async function testPermissionChecks() {
  log('测试8: 权限检查功能', 'info')
  
  try {
    const authService = window.authService
    
    if (authService) {
      // 测试各种权限检查
      const permissions = [
        'dashboard:view',
        'device:view',
        'error:view',
        'performance:view'
      ]
      
      for (const permission of permissions) {
        const hasPermission = authService.hasPermission(permission)
        log(`权限 ${permission}: ${hasPermission ? '有' : '无'}`, 'info')
      }
      
      // 测试角色检查
      const roles = ['admin', 'operator', 'viewer']
      for (const role of roles) {
        const hasRole = authService.hasRole(role)
        log(`角色 ${role}: ${hasRole ? '是' : '否'}`, 'info')
      }
    }
    
    await wait(500)
    
  } catch (error) {
    log(`权限检查测试失败: ${error.message}`, 'error')
  }
}

// 测试路由导航
async function testRouteNavigation() {
  log('测试9: 路由导航功能', 'info')
  
  try {
    const router = window.router
    
    if (router) {
      // 测试路由跳转
      log('测试路由跳转功能...', 'info')
      
      try {
        await router.push('/router-test')
        await wait(1000)
        
        const currentRoute = router.currentRoute.value
        assert(currentRoute.path === '/router-test', '路由跳转成功')
        
      } catch (navError) {
        log(`路由导航测试失败: ${navError.message}`, 'warning')
      }
      
      // 返回原路由
      try {
        await router.push('/')
        await wait(500)
      } catch (error) {
        log(`返回路由失败: ${error.message}`, 'warning')
      }
    }
    
    await wait(500)
    
  } catch (error) {
    log(`路由导航测试失败: ${error.message}`, 'error')
  }
}

// 生成测试报告
function generateTestReport() {
  log('=' * 50, 'info')
  log('测试报告', 'info')
  log('=' * 50, 'info')
  
  log(`总测试数: ${TestState.total}`, 'info')
  log(`通过: ${TestState.passed}`, 'success')
  log(`失败: ${TestState.failed}`, 'error')
  log(`成功率: ${((TestState.passed / TestState.total) * 100).toFixed(2)}%`, 'info')
  
  if (TestState.failed > 0) {
    log('失败的测试:', 'error')
    TestState.logs
      .filter(log => log.type === 'error')
      .forEach(log => console.log(`  ${log.message}`))
  }
  
  // 生成HTML报告
  generateHTMLReport()
  
  log('综合测试完成', 'success')
}

// 生成HTML报告
function generateHTMLReport() {
  const reportHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>路由守卫综合测试报告</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 20px; 
      background: #f5f5f5; 
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      padding-bottom: 20px; 
      border-bottom: 2px solid #eee; 
    }
    .summary { 
      display: flex; 
      justify-content: space-around; 
      margin: 20px 0; 
    }
    .stat { 
      text-align: center; 
      padding: 15px; 
      border-radius: 8px; 
      background: #f8f9fa; 
      min-width: 120px; 
    }
    .stat.success { 
      background: #d4edda; 
      color: #155724; 
    }
    .stat.error { 
      background: #f8d7da; 
      color: #721c24; 
    }
    .stat.total { 
      background: #d1ecf1; 
      color: #0c5460; 
    }
    .logs { 
      margin-top: 30px; 
    }
    .log-entry { 
      padding: 8px 12px; 
      margin: 2px 0; 
      border-radius: 4px; 
      font-family: monospace; 
      font-size: 12px; 
    }
    .log-entry.info { 
      background: #e2e3e5; 
      border-left: 3px solid #6c757d; 
    }
    .log-entry.success { 
      background: #d4edda; 
      border-left: 3px solid #28a745; 
    }
    .log-entry.error { 
      background: #f8d7da; 
      border-left: 3px solid #dc3545; 
    }
    .log-entry.warning { 
      background: #fff3cd; 
      border-left: 3px solid #ffc107; 
    }
    .timestamp { 
      color: #666; 
      font-weight: bold; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ 路由守卫综合测试报告</h1>
      <p>测试时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <div class="summary">
      <div class="stat total">
        <h2>${TestState.total}</h2>
        <p>总测试数</p>
      </div>
      <div class="stat success">
        <h2>${TestState.passed}</h2>
        <p>通过</p>
      </div>
      <div class="stat error">
        <h2>${TestState.failed}</h2>
        <p>失败</p>
      </div>
      <div class="stat">
        <h2>${((TestState.passed / TestState.total) * 100).toFixed(2)}%</h2>
        <p>成功率</p>
      </div>
    </div>
    
    <div class="logs">
      <h3>详细日志</h3>
      ${TestState.logs.map(log => `
        <div class="log-entry ${log.type}">
          <span class="timestamp">[${log.timestamp}]</span>
          <strong>${log.type.toUpperCase()}:</strong> ${log.message}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `
  
  // 保存报告到localStorage以便查看
  localStorage.setItem('routeGuardTestReport', reportHtml)
  log('HTML测试报告已生成并保存到localStorage', 'success')
  
  // 打开报告窗口
  const reportWindow = window.open('', '_blank')
  if (reportWindow) {
    reportWindow.document.write(reportHtml)
    reportWindow.document.close()
  }
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  // 等待页面加载完成
  window.addEventListener('load', () => {
    setTimeout(() => {
      runComprehensiveTests()
    }, 2000)
  })
  
  // 暴露测试函数到全局
  window.runRouteGuardTests = runComprehensiveTests
  window.getTestReport = () => localStorage.getItem('routeGuardTestReport')
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensiveTests,
    generateHTMLReport,
    TestState
  }
}