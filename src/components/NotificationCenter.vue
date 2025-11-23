<template>
  <Teleport to="body">
    <div
      class="notification-center"
      :class="[position, theme]"
      role="region"
      aria-label="通知中心"
    >
      <!-- 通知容器 -->
      <transition-group
        name="notification"
        tag="div"
        class="notification-container"
        :class="{ 'stack-mode': stackMode }"
      >
        <NotificationItem
          v-for="notification in visibleNotifications"
          :key="notification.id"
          :notification="notification"
          :theme="theme"
          @close="closeNotification"
          @action="handleAction"
          @retry="retryNotification"
        />
      </transition-group>
      
      <!-- 通知统计 -->
      <div
        v-if="showStats && totalCount > 0"
        class="notification-stats"
        :class="{ 'expanded': statsExpanded }"
      >
        <button
          @click="toggleStats"
          class="stats-button"
          :class="{ 'has-unread': unreadCount > 0 }"
        >
          <span class="stats-icon">🔔</span>
          <span class="stats-count">{{ totalCount }}</span>
          <span class="stats-arrow" :class="{ 'rotate': statsExpanded }">{{ statsExpanded ? '🔼' : '🔽' }}</span>
        </button>
        
        <transition name="stats-panel">
          <div v-if="statsExpanded" class="stats-panel">
            <div class="stats-content">
              <h4 class="stats-title">通知统计</h4>
              <div class="stats-list">
                <div class="stats-item">
                  <span class="stats-label">未读</span>
                  <span class="stats-value text-info">{{ unreadCount }}</span>
                </div>
                <div class="stats-item">
                  <span class="stats-label">总计</span>
                  <span class="stats-value">{{ totalCount }}</span>
                </div>
              </div>
              <div class="stats-actions">
                <button @click="markAllAsRead" class="action-button">
                  全部已读
                </button>
                <button @click="clearAll" class="action-button danger">
                  清空全部
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
// 使用Emoji替代Heroicons图标
import NotificationItem from './NotificationItem.vue'

// 类型定义
interface Notification {
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

interface Props {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  theme?: 'light' | 'dark' | 'auto'
  maxNotifications?: number
  stackMode?: boolean
  defaultDuration?: number
  showStats?: boolean
  autoHide?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right',
  theme: 'auto',
  maxNotifications: 10,
  stackMode: true,
  defaultDuration: 5000,
  showStats: true,
  autoHide: true
})

// Emits
interface Emits {
  (e: 'notification-added', notification: Notification): void
  (e: 'notification-closed', notificationId: string): void
  (e: 'notification-action', notification: Notification, action: string): void
  (e: 'notification-retry', notification: Notification): void
  (e: 'all-notifications-cleared'): void
  (e: 'all-notifications-read'): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const notifications = ref<Notification[]>([])
const statsExpanded = ref(false)

// 计算属性
const themeClass = computed(() => {
  if (props.theme === 'auto') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  return props.theme
})

const visibleNotifications = computed(() => {
  return notifications.value.slice(0, props.maxNotifications)
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const totalCount = computed(() => {
  return notifications.value.length
})

// 方法
const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'retryCount'>) => {
  const id = generateId()
  const newNotification: Notification = {
    ...notification,
    id,
    createdAt: new Date(),
    read: false,
    retryCount: 0,
    maxRetries: notification.retryable ? 3 : 0
  }
  
  notifications.value.unshift(newNotification)
  emit('notification-added', newNotification)
  
  // 自动隐藏
  if (props.autoHide && !newNotification.persistent) {
    const duration = notification.duration || props.defaultDuration
    setTimeout(() => {
      closeNotification(id)
    }, duration)
  }
  
  // 限制通知数量
  if (notifications.value.length > props.maxNotifications) {
    const toRemove = notifications.value.slice(props.maxNotifications)
    toRemove.forEach(n => closeNotification(n.id))
  }
  
  return id
}

const closeNotification = (notificationId: string) => {
  const index = notifications.value.findIndex(n => n.id === notificationId)
  if (index !== -1) {
    notifications.value.splice(index, 1)
    emit('notification-closed', notificationId)
  }
}

const handleAction = (notification: Notification, action: string) => {
  emit('notification-action', notification, action)
  
  // 执行内置操作
  switch (action) {
    case 'dismiss':
      closeNotification(notification.id)
      break
    case 'retry':
      retryNotification(notification)
      break
    case 'mark-read':
      markAsRead(notification.id)
      break
    default:
      // 自定义操作由父组件处理
      break
  }
}

const retryNotification = (notification: Notification) => {
  if (notification.retryable && notification.retryCount! < notification.maxRetries!) {
    notification.retryCount!++
    emit('notification-retry', notification)
    
    // 重新显示通知
    if (!notification.persistent) {
      const duration = notification.duration || props.defaultDuration
      setTimeout(() => {
        closeNotification(notification.id)
      }, duration)
    }
  }
}

const markAsRead = (notificationId: string) => {
  const notification = notifications.value.find(n => n.id === notificationId)
  if (notification) {
    notification.read = true
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true)
  emit('all-notifications-read')
}

const clearAll = () => {
  notifications.value = []
  emit('all-notifications-cleared')
}

const toggleStats = () => {
  statsExpanded.value = !statsExpanded.value
}

const generateId = (): string => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 创建 notification API
const createNotificationAPI = () => {
  return {
    // 基本通知方法
    info: (title: string, message: string, options?: Partial<Notification>) => {
      const id = addNotification({ type: 'info', title, message, ...options })
      return { id, type: 'info', title, message, ...options }
    },
    
    success: (title: string, message: string, options?: Partial<Notification>) => {
      const id = addNotification({ type: 'success', title, message, ...options })
      return { id, type: 'success', title, message, ...options }
    },
    
    warning: (title: string, message: string, options?: Partial<Notification>) => {
      const id = addNotification({ type: 'warning', title, message, ...options })
      return { id, type: 'warning', title, message, ...options }
    },
    
    error: (title: string, message: string, options?: Partial<Notification>) => {
      const id = addNotification({ type: 'error', title, message, ...options })
      return { id, type: 'error', title, message, ...options }
    },
    
    // 复杂通知
    confirm: (title: string, message: string, actions?: Array<{label: string, action: string, style?: string}>) => {
      const id = addNotification({
        type: 'info',
        title,
        message,
        persistent: true,
        actions: actions || [
          { label: '确认', action: 'confirm', style: 'primary' },
          { label: '取消', action: 'dismiss', style: 'secondary' }
        ]
      })
      return { id, type: 'confirm', title, message, actions: actions || [] }
    },
    
    retry: (title: string, message: string, retryAction?: () => void) => {
      const id = addNotification({
        type: 'error',
        title,
        message,
        persistent: true,
        retryable: true,
        actions: [
          { label: '重试', action: 'retry', style: 'primary' },
          { label: '忽略', action: 'dismiss', style: 'secondary' }
        ]
      })
      return { id, type: 'retry', title, message, retryable: true }
    },
    
    // 管理方法
    remove: closeNotification,
    clear: clearAll,
    getAll: () => [...notifications.value],
    getUnread: () => notifications.value.filter(n => !n.read)
  }
}

// 创建并注册 notification API
const createSafeNotificationAPI = () => {
  try {
    const api = createNotificationAPI()
    // 确保返回的是一个有效的对象
    if (!api || typeof api !== 'object') {
      throw new Error('notificationAPI is not a valid object')
    }
    return api
  } catch (error) {
    console.warn('创建 notificationAPI 失败，使用默认实现:', error)
    // 返回一个默认的API对象作为回退
    return {
      info: () => console.log('info'),
      success: () => console.log('success'),
      warning: () => console.log('warning'),
      error: () => console.log('error'),
      confirm: () => console.log('confirm'),
      retry: () => console.log('retry'),
      remove: () => {},
      clear: () => {},
      getAll: () => [],
      getUnread: () => []
    }
  }
}

const notificationAPI = createSafeNotificationAPI()

// 创建可调用的通知函数（兼容 Element Plus 风格）
const createNotificationFunction = () => {
  return (options: any) => {
    if (typeof options === 'string') {
      // 如果传入的是字符串，作为消息处理
      return notificationAPI.info('提示', options)
    } else if (options && typeof options === 'object') {
      // 如果传入的是对象，根据类型调用相应的方法
      const type = options.type || 'info'
      const title = options.title || (type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示')
      const message = options.message || options.content || ''
      
      switch (type) {
        case 'success':
          return notificationAPI.success(title, message, options)
        case 'warning':
          return notificationAPI.warning(title, message, options)
        case 'error':
          return notificationAPI.error(title, message, options)
        default:
          return notificationAPI.info(title, message, options)
      }
    }
    return notificationAPI.info('提示', '未知参数')
  }
}

const notificationFunction = createNotificationFunction()

// 全局注册
const registerGlobalAPI = () => {
  // 注册到全局
  if (typeof window !== 'undefined') {
    try {
      // 同时注册对象和方法，兼容不同使用方式
      (window as any).$notify = notificationFunction
      (window as any).$notification = notificationAPI
      console.log('通知API已注册到全局')
    } catch (error) {
      console.warn('注册全局通知API失败:', error)
    }
  }
}

onMounted(() => {
  registerGlobalAPI()
})

onUnmounted(() => {
  // 清理全局注册
  if (typeof window !== 'undefined') {
    delete (window as any).$notify
    delete (window as any).$notification
  }
})

// 暴露API
defineExpose(notificationAPI)
</script>

<style scoped>
.notification-center {
  @apply fixed z-40 pointer-events-none;
  @apply flex flex-col;
  @apply p-4;
}

.notification-center.position-top-left {
  @apply top-0 left-0;
}

.notification-center.position-top-right {
  @apply top-0 right-0;
}

.notification-center.position-bottom-left {
  @apply bottom-0 left-0;
}

.notification-center.position-bottom-right {
  @apply bottom-0 right-0;
}

.notification-center.position-top-center {
  @apply top-0 left-1/2 transform -translate-x-1/2;
}

.notification-center.position-bottom-center {
  @apply bottom-0 left-1/2 transform -translate-x-1/2;
}

.notification-center.theme-light {
  @apply text-gray-900;
}

.notification-center.theme-dark {
  @apply text-gray-100;
}

.notification-container {
  @apply flex flex-col gap-2;
  @apply pointer-events-auto;
}

.notification-container.stack-mode {
  @apply max-w-sm;
}

/* 通知统计 */
.notification-stats {
  @apply relative mt-4;
  @apply pointer-events-auto;
}

.stats-button {
  @apply flex items-center gap-2 px-3 py-2;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-lg;
  @apply hover:bg-gray-50 dark:hover:bg-gray-700;
  @apply transition-colors duration-200;
  @apply relative;
}

.stats-button.has-unread {
  @apply border-blue-300 dark:border-blue-600;
}

.stats-icon {
  @apply w-5 h-5 text-gray-500 dark:text-gray-400;
}

.stats-count {
  @apply text-sm font-medium text-gray-900 dark:text-gray-100;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply rounded-full px-2 py-0.5 min-w-[1.5rem] text-center;
}

.stats-button.has-unread .stats-count {
  @apply bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200;
}

.stats-arrow {
  @apply w-4 h-4 text-gray-400 transition-transform duration-200;
}

.stats-arrow.rotate {
  @apply transform rotate-180;
}

.stats-panel {
  @apply absolute top-full mt-2 right-0;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-xl;
  @apply min-w-64 z-50;
  @apply overflow-hidden;
}

.stats-content {
  @apply p-4;
}

.stats-title {
  @apply text-sm font-medium text-gray-900 dark:text-gray-100;
  @apply mb-3;
}

.stats-list {
  @apply space-y-2 mb-3;
}

.stats-item {
  @apply flex justify-between items-center;
}

.stats-label {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.stats-value {
  @apply text-sm font-medium text-gray-900 dark:text-gray-100;
}

.stats-value.text-info {
  @apply text-blue-600 dark:text-blue-400;
}

.stats-actions {
  @apply flex gap-2;
}

.action-button {
  @apply flex-1 px-3 py-2;
  @apply text-xs font-medium;
  @apply border border-gray-200 dark:border-gray-600;
  @apply rounded-md;
  @apply transition-colors duration-200;
  @apply hover:bg-gray-50 dark:hover:bg-gray-700;
}

.action-button.danger {
  @apply text-red-600 dark:text-red-400;
  @apply border-red-200 dark:border-red-700;
  @apply hover:bg-red-50 dark:hover:bg-red-900/20;
}

/* 过渡动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

.stats-panel-enter-active,
.stats-panel-leave-active {
  transition: all 0.2s ease;
}

.stats-panel-enter-from,
.stats-panel-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-center {
    @apply p-2;
  }
  
  .notification-container.stack-mode {
    @apply max-w-none w-full;
  }
  
  .stats-panel {
    @apply left-0 right-0;
    @apply w-full;
  }
}

@media (max-width: 480px) {
  .notification-center {
    @apply w-full;
  }
  
  .stats-button {
    @apply w-full justify-center;
  }
}
</style>