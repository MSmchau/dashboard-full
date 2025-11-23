<template>
  <div id="app" class="app-root">
    <!-- Skip导航链接 - 提高可访问性 -->
    <a 
      href="#main-content" 
      class="skip-link"
      tabindex="0"
      @keydown.enter="$refs.mainContent?.focus()"
    >
      跳转到主要内容
    </a>
    
    <!-- 主要内容区域 -->
    <main 
      ref="mainContent"
      id="main-content"
      role="main"
      tabindex="-1"
      aria-label="主要应用内容"
      class="main-content"
    >
      <!-- 导航区域 - 只在非登录页面显示 -->
      <nav 
        v-if="!isLoginPage"
        role="navigation" 
        aria-label="主导航"
        class="main-navigation"
      >
        <div class="nav-links">
          <router-link 
            to="/dashboard" 
            aria-label="仪表板"
            tabindex="0"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span class="nav-text">仪表板</span>
          </router-link>
          <router-link 
            to="/device-monitor" 
            aria-label="设备监控"
            tabindex="0"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span class="nav-text">设备监控</span>
          </router-link>
          <router-link 
            to="/error-monitor" 
            aria-label="错误监控"
            tabindex="0"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span class="nav-text">错误监控</span>
          </router-link>
          <router-link 
            to="/error-logs" 
            aria-label="错误日志"
            tabindex="0"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="nav-text">错误日志</span>
          </router-link>
          <router-link 
            to="/performance" 
            aria-label="性能监控"
            tabindex="0"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span class="nav-text">性能监控</span>
          </router-link>
          <router-link 
            to="/device-config" 
            aria-label="设备配置"
            tabindex="0"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="nav-text">设备配置</span>
          </router-link>
        </div>
        
        <div class="nav-actions">
          <!-- 保存状态指示器 -->
          <div class="save-status" v-if="!isLoginPage">
            <el-button 
              :loading="isConfigSaving" 
              :disabled="!hasUnsavedChanges"
              size="small" 
              type="primary"
              plain
              @click="handleSave"
              aria-label="保存配置"
            >
              <el-icon v-if="!isConfigSaving && hasUnsavedChanges" class="save-icon"><DocumentChecked /></el-icon>
              <el-icon v-else-if="!isConfigSaving" class="save-icon"><Document /></el-icon>
              <span v-if="hasUnsavedChanges" class="save-text">保存</span>
              <span v-else class="save-text">已保存</span>
            </el-button>
          </div>

          <!-- 主题切换按钮 -->
          <button class="theme-toggle" @click="toggleTheme" aria-label="切换主题">
            <svg v-if="appTheme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
          </button>
          
          <div class="user-menu">
            <div class="user-avatar">A</div>
          </div>
        </div>
      </nav>

      <!-- 全局Error Boundary包装整个应用 -->
      <ErrorBoundary
      level="error"
      theme="auto"
      :enable-retry="true"
      :enable-reload="true"
      :enable-fallback="true"
      :show-stats="true"
      :enable-notifications="true"
      @error-captured="handleGlobalError"
      @retry-success="handleRetrySuccess"
    >
      <!-- 主要内容区域 -->
      <div class="app-container" :class="[themeClass, { 'loading': isAppLoading }]">
        <!-- 顶部加载指示器 -->
        <GlobalLoadingIndicator 
          v-if="isAppLoading" 
          :message="loadingMessage"
          :progress="loadingProgress"
        />
        
        <!-- 全局通知中心 -->
        <NotificationCenter />
        
        <!-- 路由视图与Error Boundary包装 -->
        <ErrorBoundary
          level="warning"
          :enable-retry="true"
          :enable-fallback="true"
          :show-details="false"
          @error-captured="handleRouteError"
        >
          <router-view v-slot="{ Component, route }">
            <transition
              :name="getTransitionName(route)"
              mode="out-in"
              appear
            >
              <Suspense>
                <template #default>
                  <ErrorBoundary
                    level="info"
                    :enable-retry="true"
                    :enable-fallback="true"
                    :show-stats="false"
                    @error-captured="handleComponentError"
                  >
                    <component 
                      :is="Component" 
                      :key="route.fullPath"
                      class="route-component"
                    />
                  </ErrorBoundary>
                </template>
                <template #fallback>
                  <ComponentLoader />
                </template>
              </Suspense>
            </transition>
          </router-view>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { DocumentChecked, Document } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import GlobalLoadingIndicator from '@/components/GlobalLoadingIndicator.vue'
import NotificationCenter from '@/components/NotificationCenter.vue'
import ComponentLoader from '@/components/ComponentLoader.vue'

// 路由器
const router = useRouter()

// Config Store
const configStore = useConfigStore()

// 保存状态
const isConfigSaving = computed(() => configStore.isSaving)
const hasUnsavedChanges = computed(() => configStore.hasUnsavedChanges)

// 应用状态
const isAppLoading = ref(false)
const loadingMessage = ref('应用加载中...')
const loadingProgress = ref(0)
const appTheme = ref<'light' | 'dark' | 'auto'>('auto')
const mainContent = ref<HTMLElement>()

// 计算属性
const themeClass = computed(() => {
  if (appTheme.value === 'auto') {
    return document.documentElement.classList.contains('dark') ? 'dark-theme' : 'light-theme'
  }
  return `${appTheme.value}-theme`
})

const isDark = computed(() => {
  if (appTheme.value === 'auto') {
    return document.documentElement.classList.contains('dark')
  }
  return appTheme.value === 'dark'
})

// 判断是否为登录页面
const isLoginPage = computed(() => {
  return router.currentRoute.value?.path === '/login' || router.currentRoute.value?.name === 'Login'
})

// 方法
const handleGlobalError = (error: Error | string, errorInfo?: any) => {
  console.error('全局错误捕获:', error)
  if (errorInfo) {
    console.error('错误详情:', JSON.stringify(errorInfo, null, 2))
  }
  
  // 如果是密码验证错误，提供更友好的提示
  if (typeof error === 'string' && error.includes('密码强度太弱')) {
    if (typeof window !== 'undefined' && (window as any).ElMessage) {
      (window as any).ElMessage.error('密码强度不足，请使用包含大小写字母、数字或特殊字符的密码')
    }
    return
  }
  
  // 如果是用户名/邮箱验证错误，提供更友好的提示
  if (typeof error === 'string' && error.includes('请输入有效的用户名或邮箱')) {
    if (typeof window !== 'undefined' && (window as any).ElMessage) {
      (window as any).ElMessage.error('请输入有效的用户名或邮箱地址')
    }
    return
  }
  
  // 可以发送错误报告到监控服务
  const errorMessage = typeof error === 'string' ? error : error.message || '发生未知错误'
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: errorMessage,
      fatal: false
    })
  }
  
  // 显示错误消息
  if (typeof window !== 'undefined' && (window as any).ElMessage) {
    (window as any).ElMessage.error(errorMessage)
  }
  
  // 更新应用状态
  isAppLoading.value = false
  loadingProgress.value = 0
}

const handleRouteError = (error: Error, errorInfo: any) => {
  console.error('路由错误捕获:', error)
  console.error('路由错误详情:', JSON.stringify(errorInfo, null, 2))
  
  // 可以记录路由级别的错误
  if (typeof window !== 'undefined') {
    // 记录到分析服务
    console.info('路由错误详情:', {
      error: error.message,
      path: router.currentRoute.value?.fullPath || 'unknown',
      timestamp: Date.now()
    })
  }
}

const handleComponentError = (error: Error, errorInfo: any) => {
  console.error('组件错误捕获:', error)
  console.error('组件错误详情:', JSON.stringify(errorInfo, null, 2))
  
  // 记录组件错误，但不阻塞整个应用
  console.warn('组件错误详情:', {
    component: errorInfo.componentInfo,
    error: error.message,
    path: router.currentRoute.value?.fullPath || 'unknown'
  })
}

const handleRetrySuccess = () => {
  console.info('应用重试成功')
  
  // 清除加载状态
  isAppLoading.value = false
  loadingProgress.value = 100
}

const getTransitionName = (route: any) => {
  // 根据路由元信息决定过渡动画
  const meta = route.meta || {}
  return meta.transition || 'fade'
}

// 应用初始化
const initializeApp = async () => {
  isAppLoading.value = true
  loadingMessage.value = '初始化应用...'
  loadingProgress.value = 10

  try {
    // 检测并设置主题
    const savedTheme = localStorage.getItem('app-theme')
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      appTheme.value = savedTheme as 'light' | 'dark' | 'auto'
    }
    
    loadingMessage.value = '加载配置...'
    loadingProgress.value = 30

    // 应用配置加载
    await new Promise(resolve => setTimeout(resolve, 500))

    loadingMessage.value = '初始化路由...'
    loadingProgress.value = 50

    // 路由准备完成
    await new Promise(resolve => setTimeout(resolve, 300))

    loadingMessage.value = '启动应用...'
    loadingProgress.value = 80

    // 最终初始化
    await new Promise(resolve => setTimeout(resolve, 200))

    loadingMessage.value = '准备就绪...'
    loadingProgress.value = 100

    // 完成加载
    setTimeout(() => {
      isAppLoading.value = false
    }, 500)

  } catch (error) {
    console.error('应用初始化失败:', error)
    isAppLoading.value = false
    
    // 显示初始化错误
    loadingMessage.value = '应用初始化失败，请刷新页面重试'
    loadingProgress.value = 0
  }
}

// 主题管理
const toggleTheme = (newTheme?: 'light' | 'dark' | 'auto') => {
  if (newTheme) {
    appTheme.value = newTheme
  } else {
    const themes: ('light' | 'dark' | 'auto')[] = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(appTheme.value)
    appTheme.value = themes[(currentIndex + 1) % themes.length]
  }
  
  localStorage.setItem('app-theme', appTheme.value)
  
  // 更新HTML类名
  const html = document.documentElement
  html.classList.remove('light', 'dark')
  
  if (appTheme.value !== 'auto') {
    html.classList.add(appTheme.value)
  } else {
    // 自动模式：根据系统偏好设置
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      // 测试环境或不支持matchMedia时的回退
      html.classList.add('light')
    }
  }
}

// 提供全局方法
provide('toggleTheme', toggleTheme)
provide('appTheme', appTheme)

// 保存功能
const handleSave = async () => {
  if (!hasUnsavedChanges.value) {
    return
  }
  
  try {
    await configStore.saveConfig()
    
    // 显示成功消息
    if (typeof window !== 'undefined' && (window as any).ElMessage) {
      (window as any).ElMessage.success('配置保存成功')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    
    // 显示错误消息
    if (typeof window !== 'undefined' && (window as any).ElMessage) {
      (window as any).ElMessage.error('保存配置失败，请重试')
    }
  }
}

// 键盘快捷键
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + Shift + T: 切换主题
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
    event.preventDefault()
    toggleTheme()
  }
  
  // Ctrl/Cmd + Shift + R: 刷新页面
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
    event.preventDefault()
    window.location.reload()
  }
  
  // Ctrl/Cmd + S: 保存配置
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    handleSave()
  }
}

// 监听系统主题变化
const handleSystemThemeChange = (e: MediaQueryListEvent) => {
  if (appTheme.value === 'auto') {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.classList.add(e.matches ? 'dark' : 'light')
  }
}

// 生命周期
onMounted(() => {
  // 初始化应用
  initializeApp()
  
  // 设置初始主题
  toggleTheme(appTheme.value)
  
  // 监听键盘事件
  document.addEventListener('keydown', handleKeyDown)
  
  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  }
  
  // 全局错误处理
  window.addEventListener('error', (event) => {
    console.error('全局JavaScript错误:', event.error)
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('检测到未处理的Promise拒绝:', event.reason)
    
    // 使用全局错误处理器处理Promise拒绝，但避免重复提示用户
    const error = event.reason instanceof Error ? event.reason : String(event.reason)
    const errorInfo = {
      type: 'unhandledrejection',
      timestamp: Date.now(),
      path: router.currentRoute.value.fullPath,
      handled: true
    }
    
    // 记录错误但不显示给用户，避免重复提示
    console.info('Promise拒绝已被全局处理器捕获:', {
      error: error.message || error,
      info: errorInfo
    })
    
    // 对于测试类的错误，直接在控制台记录
    if (typeof error === 'string' && error.includes('测试')) {
      console.log('这是测试错误，已忽略用户提示')
      event.preventDefault()
      return
    }
    
    // 对于其他真实错误，才调用全局错误处理器
    if (!error.message?.includes('测试')) {
      handleGlobalError(error, errorInfo)
    }
    
    // 阻止默认的错误显示
    event.preventDefault()
  })
  
  // 性能监控
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      console.info('页面加载性能:', {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart
      })
    })
  }
})

// 暴露方法给全局
if (typeof window !== 'undefined') {
  (window as any).appTheme = {
    toggle: toggleTheme,
    set: (theme: 'light' | 'dark' | 'auto') => toggleTheme(theme),
    get: () => appTheme.value
  }
}
</script>

<style>
/* CSS重置，确保跨浏览器一致性 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}

#app {
  width: 100%;
  min-height: 100vh;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.app-root {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 主要内容区域样式 */
.main-content {
  flex: 1;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 0;
}

/* 可访问性支持样式 */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #1890ff;
  color: white;
  padding: 8px;
  border-radius: 4px;
  text-decoration: none;
  z-index: 9999;
  font-weight: bold;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .main-navigation {
    background: #0f1429;
    border-bottom: 2px solid #1890ff;
  }
  
  .main-navigation a {
    color: #ffffff;
    border: 1px solid transparent;
  }
  
  .main-navigation a:hover,
  .main-navigation a:focus {
    background: rgba(24, 144, 255, 0.3);
    border-color: #1890ff;
  }
  
  .main-navigation a[aria-current="page"] {
    background: rgba(24, 144, 255, 0.4);
    border: 2px solid #1890ff;
  }
  
  .theme-toggle {
    background: rgba(24, 144, 255, 0.2);
    border: 2px solid #1890ff;
    color: #ffffff;
  }
}

.main-navigation {
  @apply flex items-center justify-between px-6 py-3;
  background: linear-gradient(135deg, rgba(15, 20, 41, 0.95), rgba(15, 20, 41, 0.85));
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
  flex-shrink: 0;
  height: 60px;
}

.dark .main-navigation {
  background: linear-gradient(135deg, rgba(15, 20, 41, 0.98), rgba(15, 20, 41, 0.9));
  border-bottom: 1px solid rgba(24, 144, 255, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.main-navigation .nav-links {
  @apply flex items-center gap-1;
}

.main-navigation .nav-actions {
  @apply flex items-center gap-4;
}

.save-status {
  @apply flex items-center gap-2;
}

.save-status .save-icon {
  @apply w-4 h-4;
}

.save-status .save-text {
  @apply text-sm font-medium;
}

.save-status .el-button {
  @apply transition-all duration-200;
  @apply bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20;
  @apply text-blue-400 hover:text-blue-300;
}

.save-status .el-button:hover {
  @apply transform scale-105;
}

.save-status .el-button:disabled {
  @apply bg-gray-500/10 border-gray-500/20 text-gray-400;
}

.theme-toggle {
  @apply p-2 rounded-lg;
  @apply bg-blue-500/10 hover:bg-blue-500/20;
  @apply text-blue-400 hover:text-blue-300;
  @apply border border-blue-500/20;
  @apply transition-all duration-200;
}

.theme-toggle:hover {
  @apply transform scale-105;
}

.main-navigation a {
  @apply px-4 py-2 rounded-lg transition-all duration-200 relative;
  @apply text-gray-300 dark:text-gray-300;
  @apply hover:bg-blue-500/20 hover:text-blue-400;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500/50;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  position: relative;
  overflow: hidden;
}

.main-navigation a::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #1890ff, #36cfc9);
  transform: translateX(-50%);
  transition: width 0.3s ease;
}

.main-navigation a:hover::before {
  width: 80%;
}

.main-navigation a[aria-current="page"] {
  @apply text-blue-400;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(54, 207, 201, 0.05));
}

.main-navigation a[aria-current="page"]::before {
  width: 80%;
}

.main-navigation .nav-icon {
  @apply w-5 h-5 mr-2;
}

.main-navigation .nav-badge {
  @apply absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center;
  font-size: 10px;
  font-weight: bold;
}

.main-navigation .user-menu {
  @apply flex items-center gap-3;
}

.main-navigation .user-avatar {
  @apply w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium;
}

.main-navigation .theme-toggle {
  @apply p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors;
}



main[role="main"] {
  flex: 1;
  width: 100%;
  height: calc(100vh - 60px);
  outline: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}



.app-container {
  flex: 1;
  width: 100%;
  min-height: 0;
  @apply bg-white dark:bg-gray-900;
  @apply text-gray-900 dark:text-gray-100;
  @apply transition-colors duration-200;
  overflow: visible;
}

.app-container.loading {
  @apply pointer-events-none;
}

/* 主题类 */
.light-theme {
  @apply bg-white text-gray-900;
}

.dark-theme {
  @apply bg-gray-900 text-gray-100;
}

/* 路由组件样式 */
.route-component {
  width: 100%;
  min-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s ease;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 全局重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 统一按钮样式 */
.el-button {
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

.el-button--primary {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  color: white !important;
}

.el-button--primary:hover {
  background-color: var(--primary-hover) !important;
  border-color: var(--primary-hover) !important;
  color: white !important;
}

.el-button--primary.is-plain {
  background-color: transparent !important;
  border-color: var(--primary-color) !important;
  color: var(--primary-color) !important;
}

.el-button--primary.is-plain:hover {
  background-color: var(--primary-color) !important;
  color: white !important;
}

.el-button--text {
  color: var(--primary-color) !important;
}

.el-button--text:hover {
  color: var(--primary-hover) !important;
}

.el-button--success {
  background-color: var(--success-color) !important;
  border-color: var(--success-color) !important;
  color: white !important;
}

.el-button--success:hover {
  background-color: #389e0d !important;
  border-color: #389e0d !important;
  color: white !important;
}

.el-button--warning {
  background-color: var(--warning-color) !important;
  border-color: var(--warning-color) !important;
  color: white !important;
}

.el-button--warning:hover {
  background-color: #d48806 !important;
  border-color: #d48806 !important;
  color: white !important;
}

.el-button--danger {
  background-color: var(--error-color) !important;
  border-color: var(--error-color) !important;
  color: white !important;
}

.el-button--danger:hover {
  background-color: #cf1322 !important;
  border-color: #cf1322 !important;
  color: white !important;
}

*::before,
*::after {
  box-sizing: border-box;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}

/* 选择文本样式 */
::selection {
  @apply bg-blue-200 dark:bg-blue-800;
}

::-moz-selection {
  @apply bg-blue-200 dark:bg-blue-800;
}

/* 焦点样式 */
:focus {
  outline: 2px solid theme('colors.blue.500');
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}

/* 固定字体大小 */

/* 打印样式 */
@media print {
  #app {
    @apply text-black bg-white;
  }
  
  .no-print {
    display: none !important;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .app-container {
    @apply border-2 border-black dark:border-white;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>