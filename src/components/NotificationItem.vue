<template>
  <div
    class="notification-item"
    :class="[
      typeClass,
      themeClass,
      { 'persistent': notification.persistent, 'unread': !notification.read }
    ]"
    role="alert"
    :aria-live="getAriaLive()"
    :aria-label="getAriaLabel()"
  >
    <!-- 通知图标 -->
    <div class="notification-icon">
      <span :class="iconClass">{{ iconText }}</span>
    </div>
    
    <!-- 通知内容 -->
    <div class="notification-content">
      <div class="notification-header">
        <h4 class="notification-title">{{ notification.title }}</h4>
        <div class="notification-meta">
          <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
          <button
            v-if="!notification.persistent"
            @click="close"
            class="close-button"
            type="button"
            :aria-label="'关闭通知: ' + notification.title"
          >
            <span class="close-icon">❌</span>
          </button>
        </div>
      </div>
      
      <p class="notification-message">{{ notification.message }}</p>
      
      <!-- 上下文信息 -->
      <div v-if="notification.context && showContext" class="notification-context">
        <button
          @click="toggleContext"
          class="context-toggle"
          type="button"
        >
          <span
            class="context-icon"
            :class="{ 'rotate': contextExpanded }"
          >
            {{ contextExpanded ? '🔼' : '🔽' }}
          </span>
          {{ contextExpanded ? '隐藏' : '显示' }}详细信息
        </button>
        
        <transition name="context">
          <div v-if="contextExpanded" class="context-content">
            <pre class="context-text">{{ formatContext(notification.context) }}</pre>
          </div>
        </transition>
      </div>
      
      <!-- 操作按钮 -->
      <div v-if="notification.actions && notification.actions.length > 0" class="notification-actions">
        <button
          v-for="action in notification.actions"
          :key="action.action"
          @click="handleAction(action.action)"
          class="action-button"
          :class="action.style || 'secondary'"
          type="button"
        >
          {{ action.label }}
        </button>
      </div>
      
      <!-- 重试信息 -->
      <div v-if="notification.retryable && notification.retryCount" class="retry-info">
        <div class="retry-indicator">
          <span class="retry-icon">🔄</span>
          <span class="retry-text">
            重试次数: {{ notification.retryCount }}/{{ notification.maxRetries }}
          </span>
        </div>
        <div class="retry-progress">
          <div
            class="retry-progress-bar"
            :style="{ width: (notification.retryCount / notification.maxRetries * 100) + '%' }"
          />
        </div>
      </div>
    </div>
    
    <!-- 通知指示器 -->
    <div v-if="!notification.read" class="notification-indicator" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
// 使用Emoji替代Heroicons图标

// Props
interface Props {
  notification: {
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    duration?: number
    persistent?: boolean
    actions?: Array<{
      label: string
      action: string
      style?: 'primary' | 'secondary' | 'danger'
    }>
    context?: any
    createdAt: Date
    read?: boolean
    retryable?: boolean
    retryCount?: number
    maxRetries?: number
  }
  theme?: 'light' | 'dark' | 'auto'
  showContext?: boolean
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'close', notificationId: string): void
  (e: 'action', notification: Props['notification'], action: string): void
  (e: 'retry', notification: Props['notification']): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const contextExpanded = ref(false)
const timeAgo = ref('')

// 计算属性
const typeClass = computed(() => `notification-${props.notification.type}`)

const themeClass = computed(() => {
  if (props.theme === 'auto') {
    return document.documentElement.classList.contains('dark') ? 'theme-dark' : 'theme-light'
  }
  return `theme-${props.theme}`
})

const typeInfo = computed(() => ({
  success: '✅',
  warning: '⚠️',  
  error: '❌',
  info: 'ℹ️'
}))

const iconText = computed(() => {
  return typeInfo.value[props.notification.type]
})

const iconComponent = computed(() => {
  // 返回空组件，让图标区域显示emoji文本
  return 'span'
})

const iconClass = computed(() => `icon-${props.notification.type}`)

// 方法
const close = () => {
  emit('close', props.notification.id)
}

const handleAction = (action: string) => {
  emit('action', props.notification, action)
}

const retry = () => {
  emit('retry', props.notification)
}

const toggleContext = () => {
  contextExpanded.value = !contextExpanded.value
}

const getAriaLive = () => {
  if (props.notification.type === 'error') {
    return 'assertive'
  }
  return 'polite'
}

const getAriaLabel = () => {
  const typeLabels = {
    info: '信息',
    success: '成功',
    warning: '警告',
    error: '错误'
  }
  return `${typeLabels[props.notification.type]}通知: ${props.notification.title}`
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const updateTimeAgo = () => {
  timeAgo.value = formatTime(props.notification.createdAt)
}

const formatContext = (context: any) => {
  if (typeof context === 'string') {
    return context
  }
  try {
    return JSON.stringify(context, null, 2)
  } catch (error) {
    return String(context)
  }
}

// 生命周期
onMounted(() => {
  updateTimeAgo()
  // 每分钟更新时间显示
  const timer = setInterval(updateTimeAgo, 60000)
  
  onUnmounted(() => {
    clearInterval(timer)
  })
})
</script>

<style scoped>
.notification-item {
  @apply relative flex items-start gap-3 p-4;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-lg;
  @apply max-w-sm w-full;
  @apply overflow-hidden;
  @apply transition-all duration-200;
  @apply hover:shadow-xl;
  @apply cursor-pointer;
}

.notification-item.unread {
  @apply border-l-4 border-l-blue-500;
}

.notification-item.persistent {
  @apply border-l-yellow-500;
}

/* 主题变体 */
.notification-item.theme-light {
  @apply bg-white border-gray-200;
}

.notification-item.theme-dark {
  @apply bg-gray-800 border-gray-700;
}

/* 类型变体 */
.notification-info {
  @apply border-l-blue-500;
}

.notification-success {
  @apply border-l-green-500;
}

.notification-warning {
  @apply border-l-yellow-500;
}

.notification-error {
  @apply border-l-red-500;
}

/* 图标区域 */
.notification-icon {
  @apply flex-shrink-0 mt-0.5;
}

.icon-info {
  @apply w-5 h-5 text-blue-500;
}

.icon-success {
  @apply w-5 h-5 text-green-500;
}

.icon-warning {
  @apply w-5 h-5 text-yellow-500;
}

.icon-error {
  @apply w-5 h-5 text-red-500;
}

/* 内容区域 */
.notification-content {
  @apply flex-1 min-w-0;
}

.notification-header {
  @apply flex items-start justify-between gap-2;
  @apply mb-1;
}

.notification-title {
  @apply text-sm font-medium text-gray-900 dark:text-gray-100;
  @apply leading-tight;
  @apply flex-1;
}

.notification-meta {
  @apply flex items-center gap-2;
  @apply flex-shrink-0;
}

.notification-time {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

.close-button {
  @apply p-1 rounded-full;
  @apply text-gray-400 hover:text-gray-600 dark:hover:text-gray-300;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-colors duration-200;
  @apply opacity-70 hover:opacity-100;
}

.close-icon {
  @apply w-4 h-4;
}

.notification-message {
  @apply text-sm text-gray-600 dark:text-gray-300;
  @apply leading-relaxed;
  @apply mb-3;
}

/* 上下文信息 */
.notification-context {
  @apply mb-3;
}

.context-toggle {
  @apply inline-flex items-center gap-1 text-xs;
  @apply text-blue-600 dark:text-blue-400;
  @apply hover:text-blue-800 dark:hover:text-blue-300;
  @apply transition-colors duration-200;
}

.context-icon {
  @apply w-3 h-3 transition-transform duration-200;
}

.context-icon.rotate {
  @apply transform rotate-180;
}

.context-content {
  @apply mt-2 p-2 bg-gray-50 dark:bg-gray-700/50;
  @apply rounded text-xs;
  @apply border border-gray-200 dark:border-gray-600;
}

.context-text {
  @apply text-gray-600 dark:text-gray-400;
  @apply whitespace-pre-wrap;
  @apply overflow-x-auto;
  @apply font-mono leading-relaxed;
}

/* 操作按钮 */
.notification-actions {
  @apply flex gap-2 mb-2;
  @apply flex-wrap;
}

.action-button {
  @apply px-3 py-1 text-xs font-medium;
  @apply border border-transparent;
  @apply rounded-md;
  @apply transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.action-button.primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white;
  @apply focus:ring-blue-500;
}

.action-button.secondary {
  @apply bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600;
  @apply text-gray-700 dark:text-gray-300;
  @apply focus:ring-gray-500;
}

.action-button.danger {
  @apply bg-red-600 hover:bg-red-700 text-white;
  @apply focus:ring-red-500;
}

/* 重试信息 */
.retry-info {
  @apply mt-2 p-2 bg-gray-50 dark:bg-gray-700/50;
  @apply rounded text-xs;
}

.retry-indicator {
  @apply flex items-center gap-2 mb-1;
}

.retry-icon {
  @apply w-4 h-4 text-gray-500;
}

.retry-text {
  @apply text-gray-600 dark:text-gray-400;
}

.retry-progress {
  @apply w-full h-1 bg-gray-200 dark:bg-gray-600;
  @apply rounded-full overflow-hidden;
}

.retry-progress-bar {
  @apply h-full bg-yellow-500 transition-all duration-300;
}

/* 通知指示器 */
.notification-indicator {
  @apply absolute top-2 right-2;
  @apply w-2 h-2 bg-blue-500 rounded-full;
  @apply animate-pulse;
}

/* 过渡动画 */
.context-enter-active,
.context-leave-active {
  transition: all 0.2s ease;
}

.context-enter-from,
.context-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-item {
    @apply max-w-none w-full;
    @apply rounded-none border-l-0 border-r-0;
  }
  
  .notification-header {
    @apply flex-col items-start gap-1;
  }
  
  .notification-meta {
    @apply self-end;
  }
  
  .notification-actions {
    @apply w-full;
  }
  
  .action-button {
    @apply flex-1 text-center;
  }
}

@media (max-width: 480px) {
  .notification-item {
    @apply p-3;
  }
  
  .notification-title {
    @apply text-xs;
  }
  
  .notification-message {
    @apply text-xs;
  }
}
</style>