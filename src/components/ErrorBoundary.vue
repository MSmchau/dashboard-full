<template>
  <div class="error-boundary" v-if="hasError">
    <!-- 错误详情模式 -->
    <div v-if="showDetails" class="error-details-modal">
      <div class="modal-overlay" @click="toggleDetails"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔍 错误详情</h3>
          <button @click="toggleDetails" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="error-section">
            <h4>错误信息</h4>
            <pre class="error-message">{{ errorInfo.error?.message || '未知错误' }}</pre>
          </div>
          <div class="error-section">
            <h4>组件信息</h4>
            <pre class="component-info">{{ errorInfo.componentInfo }}</pre>
          </div>
          <div class="error-section">
            <h4>错误堆栈</h4>
            <pre class="error-stack">{{ errorInfo.error?.stack || '无堆栈信息' }}</pre>
          </div>
          <div class="error-section">
            <h4>错误时间</h4>
            <pre class="error-time">{{ formatTime(errorInfo.timestamp) }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="reportError" class="report-button">📧 报告错误</button>
          <button @click="retry" class="retry-button">🔄 重试</button>
          <button @click="toggleDetails" class="cancel-button">关闭</button>
        </div>
      </div>
    </div>

    <!-- 错误边界主体 -->
    <div class="error-container" :class="[`error-level-${errorLevel}`, `theme-${theme}`]">
      <!-- 图标区域 -->
      <div class="error-icon">
        <span :class="`icon-${errorLevel}`">{{ errorIcon }}</span>
      </div>

      <!-- 错误信息 -->
      <div class="error-content">
        <h2 class="error-title">{{ errorTitle }}</h2>
        <p class="error-description">{{ errorDescription }}</p>
        
        <!-- 错误详情预览 -->
        <div v-if="showPreview" class="error-preview">
          <code>{{ errorPreview }}</code>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="error-actions">
        <button @click="retry" :disabled="isRetrying" class="retry-button">
          <span v-if="isRetrying" class="spinner"></span>
          <span v-else>🔄</span>
          {{ isRetrying ? '重试中...' : '重试' }}
        </button>
        
        <button @click="toggleDetails" class="details-button">
          📋 详情
        </button>
        
        <button 
          v-if="enableFallback" 
          @click="showFallback" 
          class="fallback-button"
        >
          🎭 备用方案
        </button>
        
        <button 
          v-if="enableReload" 
          @click="reloadPage" 
          class="reload-button"
        >
          🔄 重新加载
        </button>
      </div>

      <!-- 恢复选项 -->
      <div class="recovery-options" v-if="recoveryOptions.length > 0">
        <h4>💡 尝试以下解决方案：</h4>
        <ul class="options-list">
          <li v-for="option in recoveryOptions" :key="option.id">
            <button @click="executeRecovery(option)" class="recovery-option">
              {{ option.icon }} {{ option.title }}
            </button>
            <span class="option-description">{{ option.description }}</span>
          </li>
        </ul>
      </div>

      <!-- 统计信息 -->
      <div class="error-stats" v-if="showStats && errorStats.total > 1">
        <small>
          今天已发生 {{ errorStats.total }} 次错误，
          首次错误：{{ formatTime(errorStats.firstOccurrence) }}
        </small>
      </div>
    </div>

    <!-- 备用内容 -->
    <div v-if="showFallbackContent" class="fallback-content">
      <component :is="fallbackComponent" v-bind="fallbackProps" />
    </div>

    <!-- 通知中心 -->
    <div v-if="notifications.length > 0" class="notifications">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        :class="`notification ${notification.type}`"
        @click="removeNotification(notification.id)"
      >
        <span class="notification-icon">{{ notification.icon }}</span>
        <span class="notification-message">{{ notification.message }}</span>
        <button class="notification-close">×</button>
      </div>
    </div>
  </div>

  <!-- 正常内容渲染 -->
  <div v-else class="error-boundary-children">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'

interface ErrorInfo {
  componentInfo: string
  error: Error | null
  timestamp: number
  instance: any
}

interface RecoveryOption {
  id: string
  title: string
  description: string
  icon: string
  action: () => void | Promise<void>
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  icon: string
  message: string
  timeout?: number
}

// Props
interface Props {
  fallback?: string
  level?: 'error' | 'warning' | 'info'
  theme?: 'light' | 'dark' | 'auto'
  enableRetry?: boolean
  enableReload?: boolean
  enableFallback?: boolean
  showDetails?: boolean
  showStats?: boolean
  retryAttempts?: number
  retryDelay?: number
  enableNotifications?: boolean
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRetry?: () => void
  resetOnPropsChange?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fallback: 'DefaultErrorFallback',
  level: 'error',
  theme: 'auto',
  enableRetry: true,
  enableReload: true,
  enableFallback: true,
  showDetails: false,
  showStats: true,
  retryAttempts: 3,
  retryDelay: 1000,
  enableNotifications: true,
  resetOnPropsChange: true
})

// Emits
interface Emits {
  (e: 'error-captured', error: Error, errorInfo: ErrorInfo): void
  (e: 'retry-attempt', attempt: number): void
  (e: 'retry-success'): void
  (e: 'retry-failed', error: Error): void
  (e: 'fallback-shown'): void
  (e: 'error-recovered'): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const hasError = ref(false)
const errorInfo = ref<ErrorInfo>({
  componentInfo: '',
  error: null,
  timestamp: 0,
  instance: null
})
const isRetrying = ref(false)
const retryCount = ref(0)
const showDetails = ref(props.showDetails)
const showFallbackContent = ref(false)

// 错误统计
const errorStats = ref({
  total: 0,
  firstOccurrence: Date.now(),
  lastOccurrence: Date.now()
})

// 通知
const notifications = ref<Notification[]>([])

// 错误边界组件实例
let componentInstance: any = null

// 计算属性
const errorLevel = computed(() => props.level)
const theme = computed(() => {
  if (props.theme === 'auto') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  return props.theme
})

const errorIcon = computed(() => {
  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[errorLevel.value]
})

const errorTitle = computed(() => {
  const titles = {
    error: '😵 组件出现错误',
    warning: '⚠️ 组件出现问题',
    info: 'ℹ️ 组件状态异常'
  }
  return titles[errorLevel.value]
})

const errorDescription = computed(() => {
  const descriptions = {
    error: '很抱歉，当前组件遇到了意外错误。我们已记录此问题并尝试自动恢复。',
    warning: '当前组件遇到了一些问题，但不会影响整体功能。',
    info: '当前组件状态有变化，正在尝试适应新的环境。'
  }
  return descriptions[errorLevel.value]
})

const errorPreview = computed(() => {
  if (!errorInfo.value.error) return '未知错误'
  return errorInfo.value.error.message.length > 100 
    ? errorInfo.value.error.message.substring(0, 100) + '...'
    : errorInfo.value.error.message
})

const recoveryOptions = computed((): RecoveryOption[] => {
  const options: RecoveryOption[] = []

  if (props.enableRetry && retryCount.value < props.retryAttempts) {
    options.push({
      id: 'retry',
      title: '重试加载',
      description: `尝试重新渲染组件（剩余${props.retryAttempts - retryCount.value}次）`,
      icon: '🔄',
      action: retry
    })
  }

  if (props.enableFallback) {
    options.push({
      id: 'fallback',
      title: '使用备用内容',
      description: '显示简化的备用界面，避免功能完全中断',
      icon: '🎭',
      action: showFallback
    })
  }

  if (props.enableReload) {
    options.push({
      id: 'reload',
      title: '刷新页面',
      description: '重新加载整个页面，可能解决更深层的问题',
      icon: '🔄',
      action: reloadPage
    })
  }

  options.push({
    id: 'reset',
    title: '重置状态',
    description: '清除所有错误状态，重新开始',
    icon: '🗑️',
    action: resetErrorBoundary
  })

  return options
})

const fallbackComponent = computed(() => {
  // 这里可以根据不同的fallback类型返回不同的组件
  return resolveComponent(props.fallback)
})

const fallbackProps = computed(() => {
  return {
    error: errorInfo.value.error,
    componentInfo: errorInfo.value.componentInfo,
    onRetry: retry,
    onReset: resetErrorBoundary
  }
})

// 方法
const captureError = (error: Error, errorInfo: any) => {
  // 更新错误信息
  hasError.value = true
  errorInfo.value = {
    componentInfo: getComponentInfo(errorInfo),
    error,
    timestamp: Date.now(),
    instance: errorInfo.instance
  }

  // 更新统计信息
  errorStats.value.total++
  errorStats.value.lastOccurrence = Date.now()

  // 发送通知
  if (props.enableNotifications) {
    addNotification({
      type: 'error',
      icon: '🚨',
      message: `组件错误: ${error.message}`,
      timeout: 5000
    })
  }

  // 调用外部错误处理
  if (props.onError) {
    props.onError(error, errorInfo.value)
  }

  // 发出事件
  emit('error-captured', error, errorInfo.value)

  // 记录错误
  console.error('ErrorBoundary捕获错误:', error.message || error)
  console.error('错误详情:', JSON.stringify(errorInfo, null, 2))
}

const retry = async () => {
  if (isRetrying.value || retryCount.value >= props.retryAttempts) return

  isRetrying.value = true
  retryCount.value++
  
  emit('retry-attempt', retryCount.value)

  try {
    // 等待延迟
    await new Promise(resolve => setTimeout(resolve, props.retryDelay))
    
    // 重置错误状态
    resetErrorBoundary()
    
    // 触发重试成功事件
    emit('retry-success')
    addNotification({
      type: 'success',
      icon: '✅',
      message: '组件重试成功',
      timeout: 3000
    })

    // 调用外部重试回调
    if (props.onRetry) {
      props.onRetry()
    }
  } catch (error) {
    emit('retry-failed', error as Error)
    addNotification({
      type: 'error',
      icon: '❌',
      message: `重试失败: ${(error as Error).message}`,
      timeout: 5000
    })
  } finally {
    isRetrying.value = false
  }
}

const resetErrorBoundary = () => {
  hasError.value = false
  showFallbackContent.value = false
  errorInfo.value = {
    componentInfo: '',
    error: null,
    timestamp: 0,
    instance: null
  }
  
  emit('error-recovered')
  
  addNotification({
    type: 'info',
    icon: '🔄',
    message: '错误边界已重置',
    timeout: 2000
  })
}

const showFallback = () => {
  showFallbackContent.value = true
  emit('fallback-shown')
  
  addNotification({
    type: 'info',
    icon: '🎭',
    message: '已切换到备用界面',
    timeout: 3000
  })
}

const reloadPage = () => {
  window.location.reload()
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const executeRecovery = async (option: RecoveryOption) => {
  try {
    await option.action()
  } catch (error) {
    addNotification({
      type: 'error',
      icon: '❌',
      message: `恢复操作失败: ${(error as Error).message}`,
      timeout: 5000
    })
  }
}

const reportError = () => {
  const errorReport = {
    timestamp: errorInfo.value.timestamp,
    error: errorInfo.value.error?.message,
    stack: errorInfo.value.error?.stack,
    componentInfo: errorInfo.value.componentInfo,
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  // 这里可以实现实际的错误报告逻辑
  console.log('错误报告:', errorReport)
  
  addNotification({
    type: 'success',
    icon: '📧',
    message: '错误报告已发送',
    timeout: 3000
  })
}

const addNotification = (notification: Omit<Notification, 'id'>) => {
  const id = Date.now().toString()
  const newNotification: Notification = {
    id,
    ...notification
  }
  
  notifications.value.push(newNotification)
  
  // 自动移除通知
  if (notification.timeout) {
    setTimeout(() => {
      removeNotification(id)
    }, notification.timeout)
  }
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

const getComponentInfo = (errorInfo: any) => {
  try {
    return `组件: ${errorInfo.component?.name || 'Unknown'}
              位置: ${errorInfo.component?.__file || 'Unknown file'}
              错误: ${errorInfo.errorInfo?.componentStack || 'No stack info'}`
  } catch {
    return '无法获取组件信息'
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const resolveComponent = (name: string) => {
  // 简单的组件解析，实际项目中可能需要更复杂的逻辑
  return name
}

// 错误捕获钩子
const handleErrorCaptured = (error: Error, instance: any, info: string) => {
  captureError(error, { instance, info })
  return false // 阻止错误继续向上传播
}

// 生命周期
onMounted(() => {
  // 在 mounted 时注册错误捕获
  componentInstance = getCurrentInstance()
  
  if (componentInstance) {
    // Vue 3 中使用 onErrorCaptured
    const { onErrorCaptured } = componentInstance.appContext.config.globalProperties
    // 这里需要使用实际的 Vue 3 错误捕获机制
  }
})

onUnmounted(() => {
  componentInstance = null
})

// 暴露方法给父组件
defineExpose({
  retry,
  resetErrorBoundary,
  showFallback,
  captureError
})
</script>

<style scoped>
.error-boundary {
  @apply relative;
}

.error-boundary-children {
  @apply w-full h-full;
}

.error-details-modal {
  @apply fixed inset-0 z-50 flex items-center justify-center;
}

.modal-overlay {
  @apply absolute inset-0 bg-black bg-opacity-50;
}

.modal-content {
  @apply relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden;
  @apply m-4 w-full;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700;
}

.modal-header h3 {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.close-button {
  @apply p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.modal-body {
  @apply p-6 overflow-y-auto max-h-[60vh];
}

.error-section {
  @apply mb-6;
}

.error-section h4 {
  @apply text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2;
}

.error-message,
.component-info,
.error-stack,
.error-time {
  @apply p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm;
  @apply text-gray-800 dark:text-gray-200 overflow-x-auto;
  @apply whitespace-pre-wrap font-mono;
}

.modal-footer {
  @apply flex gap-3 justify-end p-6 border-t border-gray-200 dark:border-gray-700;
}

.report-button,
.retry-button,
.cancel-button {
  @apply px-4 py-2 rounded-md text-sm font-medium transition-colors;
}

.report-button {
  @apply bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800;
  @apply text-blue-800 dark:text-blue-200;
}

.retry-button {
  @apply bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800;
  @apply text-green-800 dark:text-green-200;
}

.cancel-button {
  @apply bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600;
  @apply text-gray-800 dark:text-gray-200;
}

.error-container {
  @apply flex flex-col items-center justify-center p-8 text-center;
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm border;
  @apply min-h-[400px];
}

.error-level-error {
  @apply border-red-200 dark:border-red-800;
  @apply bg-red-50 dark:bg-red-900/10;
}

.error-level-warning {
  @apply border-yellow-200 dark:border-yellow-800;
  @apply bg-yellow-50 dark:bg-yellow-900/10;
}

.error-level-info {
  @apply border-blue-200 dark:border-blue-800;
  @apply bg-blue-50 dark:bg-blue-900/10;
}

.error-icon {
  @apply mb-4;
}

.icon-error {
  @apply text-red-500 w-16 h-16;
}

.icon-warning {
  @apply text-yellow-500 w-16 h-16;
}

.icon-info {
  @apply text-blue-500 w-16 h-16;
}

.error-content {
  @apply mb-6;
}

.error-title {
  @apply text-2xl font-bold text-gray-900 dark:text-white mb-2;
}

.error-description {
  @apply text-gray-600 dark:text-gray-400 max-w-md;
}

.error-preview {
  @apply mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm;
  @apply text-gray-700 dark:text-gray-300 max-w-lg;
}

.error-actions {
  @apply flex gap-3 mb-6 flex-wrap justify-center;
}

.retry-button,
.details-button,
.fallback-button,
.reload-button {
  @apply px-4 py-2 rounded-md font-medium transition-all;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.retry-button {
  @apply bg-blue-600 hover:bg-blue-700 text-white;
  @apply focus:ring-blue-500;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.details-button {
  @apply bg-gray-600 hover:bg-gray-700 text-white;
  @apply focus:ring-gray-500;
}

.fallback-button {
  @apply bg-purple-600 hover:bg-purple-700 text-white;
  @apply focus:ring-purple-500;
}

.reload-button {
  @apply bg-orange-600 hover:bg-orange-700 text-white;
  @apply focus:ring-orange-500;
}

.spinner {
  @apply inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full;
  @apply animate-spin;
}

.recovery-options {
  @apply w-full max-w-lg;
}

.recovery-options h4 {
  @apply text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3;
}

.options-list {
  @apply space-y-2 text-left;
}

.recovery-option {
  @apply w-full text-left p-3 bg-white dark:bg-gray-700 rounded border;
  @apply hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors;
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.option-description {
  @apply block text-xs text-gray-500 dark:text-gray-400 mt-1;
}

.error-stats {
  @apply mt-4 text-xs text-gray-500 dark:text-gray-400;
}

.fallback-content {
  @apply w-full h-full;
}

.notifications {
  @apply fixed top-4 right-4 z-50 space-y-2;
}

.notification {
  @apply flex items-center gap-3 p-4 rounded-lg shadow-lg min-w-[300px];
  @apply cursor-pointer transition-all;
}

.notification.info {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.notification.success {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.notification.warning {
  @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200;
}

.notification.error {
  @apply bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200;
}

.notification-icon {
  @apply text-lg;
}

.notification-message {
  @apply flex-1 text-sm;
}

.notification-close {
  @apply text-lg opacity-70 hover:opacity-100;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-container {
    @apply p-4;
  }
  
  .error-actions {
    @apply flex-col w-full;
  }
  
  .modal-content {
    @apply m-2;
  }
  
  .modal-footer {
    @apply flex-col;
  }
  
  .notifications {
    @apply top-2 right-2 left-2;
  }
  
  .notification {
    @apply min-w-0;
  }
}

/* 动画效果 */
.error-boundary {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>