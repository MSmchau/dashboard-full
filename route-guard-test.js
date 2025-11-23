// 路由守卫功能测试脚本
console.log('=== 路由守卫功能测试开始 ===');

// 测试1: 检查路由守卫是否正确初始化
console.log('\n1. 检查路由守卫初始化状态...');
if (window.authService) {
  console.log('✓ 认证服务可用');
  console.log('  - 认证状态:', window.authService.state?.isAuthenticated || false);
  console.log('  - 当前用户:', window.authService.currentUser?.username || '无');
  console.log('  - Token状态:', window.authService.state?.token ? '已设置' : '未设置');
} else {
  console.log('✗ 认证服务不可用');
}

// 测试2: 检查路由实例
console.log('\n2. 检查Vue Router实例...');
if (window.$router) {
  console.log('✓ Vue Router实例可用');
  console.log('  - 路由数量:', window.$router.getRoutes()?.length || '未知');
} else {
  console.log('✗ Vue Router实例不可用');
}

// 测试3: 检查Pinia stores
console.log('\n3. 检查Pinia状态管理...');
if (window.$pinia) {
  console.log('✓ Pinia实例可用');
  
  // 检查用户store
  const userStore = window.$pinia._s.get('user');
  if (userStore) {
    console.log('✓ 用户Store可用');
    console.log('  - 认证状态:', userStore.isAuthenticated || false);
    console.log('  - 用户角色:', userStore.userRole || '未设置');
  } else {
    console.log('✗ 用户Store不可用');
  }
} else {
  console.log('✗ Pinia实例不可用');
}

// 测试4: 检查路由权限配置
console.log('\n4. 检查路由权限配置...');
const protectedRoutes = ['/dashboard', '/config', '/device-monitor'];
protectedRoutes.forEach(route => {
  console.log(`  检查路由 ${route}:`);
  
  // 模拟路由守卫检查
  const routeConfig = {
    path: route,
    meta: { requiresAuth: route !== '/simple-test' && route !== '/router-test' }
  };
  
  if (routeConfig.meta.requiresAuth) {
    console.log(`    ✓ ${route} 需要认证`);
    if (!window.authService?.state?.isAuthenticated) {
      console.log(`    ✗ 未认证用户访问 ${route} 应该被重定向`);
    }
  } else {
    console.log(`    ✓ ${route} 不需要认证`);
  }
});

// 测试5: 检查认证流程
console.log('\n5. 认证流程测试...');
if (window.authService) {
  console.log('  - 尝试获取认证状态...');
  const authState = {
    isAuthenticated: window.authService.state?.isAuthenticated || false,
    token: window.authService.state?.token ? '已设置' : '未设置',
    expiresAt: window.authService.state?.expiresAt ? new Date(window.authService.state.expiresAt * 1000).toLocaleString() : '未设置'
  };
  console.log('  当前认证状态:', authState);
}

// 测试6: 权限检查测试
console.log('\n6. 权限检查测试...');
if (window.authService?.checkPermission) {
  const testPermissions = ['read:dashboard', 'write:config', 'admin:users'];
  testPermissions.forEach(permission => {
    const hasPermission = window.authService.checkPermission(permission);
    console.log(`  ${permission}: ${hasPermission ? '✓' : '✗'}`);
  });
} else {
  console.log('  权限检查方法不可用');
}

console.log('\n=== 路由守卫功能测试完成 ===');

// 生成测试报告
function generateTestReport() {
  const report = {
    timestamp: new Date().toISOString(),
    authService: !!window.authService,
    router: !!window.$router,
    pinia: !!window.$pinia,
    userStore: !!window.$pinia?._s?.get('user'),
    authStatus: window.authService?.state?.isAuthenticated || false,
    currentUser: window.authService?.currentUser?.username || null
  };
  
  console.log('\n📊 测试报告:', JSON.stringify(report, null, 2));
  return report;
}

// 导出测试函数到全局
window.routeGuardTest = {
  generateTestReport,
  testAuth: () => {
    console.log('手动执行认证测试...');
    generateTestReport();
  },
  simulateLogin: async (username, password) => {
    if (window.authService) {
      try {
        const user = await window.authService.login(username, password);
        console.log('模拟登录成功:', user.username);
        return true;
      } catch (error) {
        console.error('模拟登录失败:', error);
        return false;
      }
    } else {
      console.log('认证服务不可用');
      return false;
    }
  }
};

console.log('\n🧪 测试工具已注册到 window.routeGuardTest');
console.log('📋 使用方法:');
console.log('  - window.routeGuardTest.generateTestReport() // 生成测试报告');
console.log('  - window.routeGuardTest.testAuth() // 执行认证测试');
console.log('  - window.routeGuardTest.simulateLogin("user", "pass") // 模拟登录');

// 立即生成初始报告
generateTestReport();