<template>
  <div class="default-error-fallback" :class="theme">
    <!-- 简化的图标区域 -->
    <div class="fallback-header">
      <div class="fallback-icon">
        <component :is="getFallbackIcon()" />
      </div>
      <h3 class="fallback-title">{{ getFallbackTitle() }}</h3>
    </div>

    <!-- 简化的内容区域 -->
    <div class="fallback-content">
      <div class="content-message">
        <p>{{ getFallbackMessage() }}</p>
      </div>

      <!-- 简化状态指示 -->
      <div class="status-indicator">
        <div class="status-dot" :class="statusClass"></div>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <button 
          v-if="canRetry" 
          @click="handleRetry" 
          class="quick-action retry"
          :disabled="isRetrying"
        >
          <span v-if="isRetrying" class="spinner"></span>
          <span v-else>🔄</span>
          {{ isRetrying ? '重试中...' : '快速重试' }}
        </button>
        
        <button 
          @click="handleRefresh" 
          class="quick-action refresh"
        >
          🔃 刷新页面
        </button>
        
        <button 
          v-if="showDetails" 
          @click="handleShowDetails" 
          class="quick-action details"
        >
          ℹ️ 更多信息
        </button>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="fallback-tips">
      <h4>💡 建议操作：</h4>
      <ul class="tips-list">
        <li v-for="tip in getFallbackTips()" :key="tip">
          {{ tip }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  error?: Error | null
  componentInfo?: string
  errorType?: 'network' | 'render' | 'data' | 'unknown'
  canRetry?: boolean
  onRetry?: () => void
  onReset?: () => void
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  componentInfo: '',
  errorType: 'unknown',
  canRetry: true,
  showDetails: false
})

// 响应式状态
const isRetrying = ref(false)
const retryCount = ref(0)

// 计算属性
const theme = computed(() => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
})

const statusClass = computed(() => {
  const statusMap = {
    network: 'status-error',
    render: 'status-warning', 
    data: 'status-warning',
    unknown: 'status-info'
  }
  return statusMap[props.errorType] || 'status-info'
})

const statusText = computed(() => {
  const statusMap = {
    network: '网络连接问题',
    render: '渲染组件异常',
    data: '数据加载失败',
    unknown: '组件状态异常'
  }
  return statusMap[props.errorType] || '组件状态异常'
})

// 方法
const getFallbackIcon = () => {
  const icons = {
    network: '🌐',
    render: '🎨',
    data: '📊',
    unknown: '⚠️'
  }
  return icons[props.errorType] || '⚠️'
}

const getFallbackTitle = () => {
  const titles = {
    network: '网络连接失败',
    render: '界面渲染异常',
    data: '数据获取失败',
    unknown: '组件出现错误'
  }
  return titles[props.errorType] || '组件出现错误'
}

const getFallbackMessage = () => {
  const messages = {
    network: '无法连接到服务器，请检查网络连接后重试。',
    render: '界面组件渲染时出现问题，我们已尝试修复。',
    data: '获取数据时遇到问题，请稍后重试。',
    unknown: '组件遇到了意外问题，但不影响整体功能。'
  }
  return messages[props.errorType] || '组件遇到了意外问题。'
}

const getFallbackTips = () => {
  const tipsMap = {
    network: [
      '检查网络连接是否正常',
      '尝试刷新页面',
      '稍后重试或联系管理员'
    ],
    render: [
      '尝试刷新页面',
      '清除浏览器缓存',
      '使用其他浏览器访问'
    ],
    data: [
      '稍后重试',
      '检查数据源是否正常',
      '联系技术支持'
    ],
    unknown: [
      '刷新页面重试',
      '如问题持续请联系支持',
      '尝试重新登录'
    ]
  }
  return tipsMap[props.errorType] || [
    '刷新页面重试',
    '稍后再试'
  ]
}

const handleRetry = async () => {
  if (!props.canRetry || isRetrying.value) return

  isRetrying.value = true
  retryCount.value++

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (props.onRetry) {
      props.onRetry()
    }
    
    // 如果重试成功，父组件应该会重新渲染
  } catch (error) {
    console.error('Fallback重试失败:', error)
  } finally {
    isRetrying.value = false
  }
}

const handleRefresh = () => {
  window.location.reload()
}

const handleShowDetails = () => {
  if (props.error) {
    console.group('🔍 错误详情')
    console.error('错误信息:', props.error.message)
    console.error('错误堆栈:', props.error.stack)
    console.error('组件信息:', props.componentInfo)
    console.groupEnd()
    
    // 在实际应用中，这里可以打开一个模态框显示详情
    alert(`错误详情:\n${props.error.message}\n\n检查控制台获取更多信息`)
  }
}

onMounted(() => {
  console.warn('Fallback组件已加载:', {
    error: props.error?.message,
    componentInfo: props.componentInfo,
    errorType: props.errorType
  })
})
</script>

<style scoped>
.default-error-fallback {
  @apply flex flex-col items-center justify-center p-8 text-center;
  @apply bg-gray-50 dark:bg-gray-800 rounded-lg border;
  @apply min-h-[300px] w-full;
}

.fallback-header {
  @apply mb-6;
}

.fallback-icon {
  @apply text-6xl mb-3;
}

.fallback-title {
  @apply text-xl font-semibold text-gray-800 dark:text-white;
}

.fallback-content {
  @apply mb-6;
}

.content-message {
  @apply mb-4;
}

.content-message p {
  @apply text-gray-600 dark:text-gray-400 text-sm max-w-sm;
}

.status-indicator {
  @apply flex items-center justify-center gap-2 mb-4;
}

.status-dot {
  @apply w-3 h-3 rounded-full;
}

.status-error {
  @apply bg-red-500;
}

.status-warning {
  @apply bg-yellow-500;
}

.status-info {
  @apply bg-blue-500;
}

.status-text {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.quick-actions {
  @apply flex gap-2 flex-wrap justify-center;
}

.quick-action {
  @apply px-3 py-2 text-xs font-medium rounded-md transition-all;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.quick-action.retry {
  @apply bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800;
  @apply text-green-800 dark:text-green-200;
  @apply focus:ring-green-500;
}

.quick-action.refresh {
  @apply bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800;
  @apply text-blue-800 dark:text-blue-200;
  @apply focus:ring-blue-500;
}

.quick-action.details {
  @apply bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600;
  @apply text-gray-700 dark:text-gray-300;
  @apply focus:ring-gray-500;
}

.quick-action:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.spinner {
  @apply inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full;
  @apply animate-spin;
}

.fallback-tips {
  @apply w-full max-w-sm text-left;
}

.fallback-tips h4 {
  @apply text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2;
}

.tips-list {
  @apply space-y-1;
}

.tips-list li {
  @apply text-xs text-gray-600 dark:text-gray-400;
  @apply list-disc list-inside;
}

/* 删除响应式设计代码 */
</style>