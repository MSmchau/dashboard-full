<template>
  <Teleport to="body">
    <transition name="loading-overlay">
      <div
        v-if="visible"
        class="global-loading-indicator"
        :class="[position, theme, { 'with-progress': showProgress }]"
        role="status"
        :aria-live="announceUpdates ? 'polite' : 'off'"
        :aria-label="ariaLabel"
      >
        <!-- 背景遮罩 -->
        <div class="loading-backdrop" />
        
        <!-- 加载内容 -->
        <div class="loading-content">
          <!-- 加载动画 -->
          <div class="loading-animation">
            <!-- 默认动画 -->
            <div v-if="type === 'spinner'" class="spinner" :style="spinnerStyle">
              <div class="spinner-ring" v-for="i in 12" :key="i" />
            </div>
            
            <!-- 点动画 -->
            <div v-else-if="type === 'dots'" class="dots">
              <div class="dot" v-for="i in 3" :key="i" />
            </div>
            
            <!-- 脉冲动画 -->
            <div v-else-if="type === 'pulse'" class="pulse">
              <div class="pulse-dot" />
            </div>
            
            <!-- 波形动画 -->
            <div v-else-if="type === 'wave'" class="wave">
              <div class="wave-bar" v-for="i in 5" :key="i" />
            </div>
            
            <!-- 进度条动画 -->
            <div v-else-if="type === 'progress'" class="progress">
              <div class="progress-bar" :style="{ width: progress + '%' }" />
            </div>
            
            <!-- 自定义图标 -->
            <div v-else-if="type === 'icon'" class="custom-icon">
              <component :is="icon" :class="iconClass" />
            </div>
          </div>
          
          <!-- 加载文本 -->
          <div v-if="message" class="loading-message">
            <p class="message-text">{{ message }}</p>
            <p v-if="subMessage" class="sub-message">{{ subMessage }}</p>
          </div>
          
          <!-- 进度信息 -->
          <div v-if="showProgress && progress !== null" class="progress-info">
            <div class="progress-details">
              <span class="progress-percentage">{{ Math.round(progress) }}%</span>
              <span v-if="estimatedTime" class="estimated-time">预计剩余 {{ estimatedTime }}</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-wrapper">
                <div class="progress-bar-fill" :style="{ width: progress + '%' }" />
                <div class="progress-bar-glow" :style="{ width: progress + '%' }" />
              </div>
            </div>
          </div>
          
          <!-- 可取消操作 -->
          <div v-if="cancellable" class="loading-actions">
            <button
              @click="handleCancel"
              class="cancel-button"
              type="button"
              :disabled="cancelDisabled"
            >
              <span class="cancel-icon">❌</span>
              取消
            </button>
          </div>
          
          <!-- 详细信息 -->
          <div v-if="showDetails && details" class="loading-details">
            <button
              @click="toggleDetails"
              class="details-toggle"
              type="button"
            >
              <span
                class="toggle-icon"
                :class="{ 'rotate': showDetailsContent }"
              >
                {{ showDetailsContent ? '🔼' : '🔽' }}
              </span>
              {{ showDetailsContent ? '隐藏' : '显示' }}详细信息
            </button>
            <transition name="details">
              <div v-if="showDetailsContent" class="details-content">
                <pre class="details-text">{{ details }}</pre>
              </div>
            </transition>
          </div>
        </div>
        
        <!-- 进度提示 -->
        <div v-if="tip" class="loading-tip">
          <div class="tip-content">
            <span class="tip-icon">ℹ️</span>
            <span class="tip-text">{{ tip }}</span>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
// 使用Emoji替代Heroicons图标

// Props
interface Props {
  visible?: boolean
  message?: string
  subMessage?: string
  progress?: number | null
  type?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'progress' | 'icon'
  position?: 'center' | 'top' | 'bottom' | 'custom'
  theme?: 'light' | 'dark' | 'auto'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  icon?: any
  iconClass?: string
  showProgress?: boolean
  estimatedTime?: string
  cancellable?: boolean
  cancelDisabled?: boolean
  showDetails?: boolean
  details?: string
  tip?: string
  announceUpdates?: boolean
  fullscreen?: boolean
  overlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  message: '',
  subMessage: '',
  progress: null,
  type: 'spinner',
  position: 'center',
  theme: 'auto',
  size: 'md',
  showProgress: false,
  cancellable: false,
  cancelDisabled: false,
  showDetails: false,
  details: '',
  tip: '',
  announceUpdates: false,
  fullscreen: true,
  overlay: true
})

// Emits
interface Emits {
  (e: 'cancel'): void
  (e: 'complete'): void
  (e: 'progress', value: number): void
  (e: 'toggle-details', visible: boolean): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const showDetailsContent = ref(false)
const estimatedTimeRemaining = ref('')
const animationFrame = ref<number | null>(null)

// 计算属性
const ariaLabel = computed(() => {
  if (props.message) {
    return `正在加载: ${props.message}`
  }
  return '正在加载'
})

const spinnerStyle = computed(() => ({
  '--spinner-size': getSpinnerSize(),
  '--spinner-color': getThemeColor()
}))

const themeClass = computed(() => {
  if (props.theme === 'auto') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  return props.theme
})

// 方法
const getSpinnerSize = () => {
  const sizes = {
    sm: '24px',
    md: '40px',
    lg: '56px',
    xl: '72px'
  }
  return sizes[props.size]
}

const getThemeColor = () => {
  const colors = {
    light: '#3b82f6',
    dark: '#60a5fa'
  }
  return colors[themeClass.value]
}

const handleCancel = () => {
  if (!props.cancelDisabled) {
    emit('cancel')
  }
}

const toggleDetails = () => {
  showDetailsContent.value = !showDetailsContent.value
  emit('toggle-details', showDetailsContent.value)
}

const updateEstimatedTime = () => {
  if (props.progress !== null && props.progress > 0) {
    const elapsedTime = Date.now() - startTime
    const estimatedTotalTime = elapsedTime / (props.progress / 100)
    const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime)
    
    if (remainingTime > 0) {
      const seconds = Math.ceil(remainingTime / 1000)
      if (seconds < 60) {
        estimatedTimeRemaining.value = `${seconds}秒`
      } else {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        estimatedTimeRemaining.value = `${minutes}分${remainingSeconds}秒`
      }
    }
  }
}

const startTime = ref(Date.now())

// 监听进度变化
watch(() => props.progress, (newProgress) => {
  if (newProgress !== null && newProgress >= 100) {
    emit('complete')
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value)
    }
  } else if (newProgress !== null) {
    // 更新预计剩余时间
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value)
    }
    
    const updateTime = () => {
      updateEstimatedTime()
      animationFrame.value = requestAnimationFrame(updateTime)
    }
    animationFrame.value = requestAnimationFrame(updateTime)
  }
})

// 生命周期
onMounted(() => {
  if (props.visible && props.progress !== null) {
    startTime.value = Date.now()
  }
})

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})
</script>

<style scoped>
.global-loading-indicator {
  @apply fixed inset-0 z-50 flex items-center justify-center;
  @apply bg-black/20 backdrop-blur-sm;
}

.global-loading-indicator.position-top {
  @apply items-start pt-20;
}

.global-loading-indicator.position-bottom {
  @apply items-end pb-20;
}

.global-loading-indicator.theme-light {
  @apply bg-white/80;
}

.global-loading-indicator.theme-dark {
  @apply bg-black/80;
}

/* 加载内容 */
.loading-content {
  @apply relative flex flex-col items-center gap-6;
  @apply bg-white dark:bg-gray-800;
  @apply rounded-2xl shadow-2xl;
  @apply p-8 max-w-md w-full mx-4;
  @apply border border-gray-200 dark:border-gray-700;
  @apply backdrop-blur-lg;
}

.loading-content.with-progress {
  @apply max-w-lg;
}

/* 动画容器 */
.loading-animation {
  @apply flex items-center justify-center;
}

/* Spinner 动画 */
.spinner {
  @apply relative w-10 h-10;
}

.spinner-ring {
  @apply absolute inset-0 rounded-full;
  @apply border-2 border-transparent;
  border-top-color: var(--spinner-color, #3b82f6);
  animation: spin 1.2s linear infinite;
}

.spinner-ring:nth-child(1) { animation-delay: 0s; }
.spinner-ring:nth-child(2) { animation-delay: -0.1s; }
.spinner-ring:nth-child(3) { animation-delay: -0.2s; }
.spinner-ring:nth-child(4) { animation-delay: -0.3s; }
.spinner-ring:nth-child(5) { animation-delay: -0.4s; }
.spinner-ring:nth-child(6) { animation-delay: -0.5s; }
.spinner-ring:nth-child(7) { animation-delay: -0.6s; }
.spinner-ring:nth-child(8) { animation-delay: -0.7s; }
.spinner-ring:nth-child(9) { animation-delay: -0.8s; }
.spinner-ring:nth-child(10) { animation-delay: -0.9s; }
.spinner-ring:nth-child(11) { animation-delay: -1.0s; }
.spinner-ring:nth-child(12) { animation-delay: -1.1s; }

@keyframes spin {
  0% { transform: rotate(0deg); opacity: 1; }
  50% { opacity: 0.3; }
  100% { transform: rotate(360deg); opacity: 1; }
}

/* Dots 动画 */
.dots {
  @apply flex space-x-2;
}

.dot {
  @apply w-3 h-3 bg-blue-500 rounded-full;
  animation: bounce 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Pulse 动画 */
.pulse {
  @apply flex items-center justify-center;
}

.pulse-dot {
  @apply w-8 h-8 bg-blue-500 rounded-full;
  animation: pulse-scale 1.5s ease-in-out infinite;
}

@keyframes pulse-scale {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Wave 动画 */
.wave {
  @apply flex space-x-1;
}

.wave-bar {
  @apply w-1 bg-blue-500 rounded;
  animation: wave 1.2s ease-in-out infinite;
}

.wave-bar:nth-child(1) { animation-delay: 0s; }
.wave-bar:nth-child(2) { animation-delay: 0.1s; }
.wave-bar:nth-child(3) { animation-delay: 0.2s; }
.wave-bar:nth-child(4) { animation-delay: 0.3s; }
.wave-bar:nth-child(5) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* Progress 动画 */
.progress {
  @apply w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;
}

.progress-bar {
  @apply h-full bg-blue-500 rounded-full transition-all duration-300 ease-out;
}

/* 自定义图标 */
.custom-icon {
  @apply text-blue-500;
}

.custom-icon svg {
  @apply w-12 h-12;
}

/* 文本信息 */
.loading-message {
  @apply text-center;
}

.message-text {
  @apply text-lg font-medium text-gray-900 dark:text-gray-100;
  @apply mb-1;
}

.sub-message {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

/* 进度信息 */
.progress-info {
  @apply w-full space-y-3;
}

.progress-details {
  @apply flex justify-between items-center text-sm;
}

.progress-percentage {
  @apply font-medium text-gray-900 dark:text-gray-100;
}

.estimated-time {
  @apply text-gray-500 dark:text-gray-400;
}

.progress-bar-container {
  @apply w-full;
}

.progress-bar-wrapper {
  @apply relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;
}

.progress-bar-fill {
  @apply h-full bg-blue-500 rounded-full transition-all duration-300 ease-out;
  @apply relative overflow-hidden;
}

.progress-bar-glow {
  @apply absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 操作按钮 */
.loading-actions {
  @apply w-full flex justify-center;
}

.cancel-button {
  @apply inline-flex items-center gap-2 px-4 py-2;
  @apply text-sm font-medium text-red-600 dark:text-red-400;
  @apply bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30;
  @apply border border-red-200 dark:border-red-800;
  @apply rounded-lg transition-colors duration-200;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.cancel-icon {
  @apply w-4 h-4;
}

/* 详细信息 */
.loading-details {
  @apply w-full;
}

.details-toggle {
  @apply inline-flex items-center gap-2 text-sm;
  @apply text-blue-600 dark:text-blue-400;
  @apply hover:text-blue-800 dark:hover:text-blue-300;
  @apply transition-colors duration-200;
}

.toggle-icon {
  @apply w-4 h-4 transition-transform duration-200;
}

.toggle-icon.rotate {
  @apply transform rotate-180;
}

.details-content {
  @apply mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg;
  @apply border border-gray-200 dark:border-gray-700;
}

.details-text {
  @apply text-xs text-gray-600 dark:text-gray-400;
  @apply whitespace-pre-wrap overflow-x-auto;
  @apply font-mono leading-relaxed;
}

/* 进度提示 */
.loading-tip {
  @apply absolute top-4 right-4;
}

.tip-content {
  @apply flex items-center gap-2 px-3 py-2;
  @apply bg-blue-50 dark:bg-blue-900/20;
  @apply border border-blue-200 dark:border-blue-800;
  @apply rounded-lg text-sm text-blue-700 dark:text-blue-300;
}

.tip-icon {
  @apply w-4 h-4 flex-shrink-0;
}

/* 过渡动画 */
.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: all 0.3s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
  backdrop-filter: blur(0);
}

.details-enter-active,
.details-leave-active {
  transition: all 0.2s ease;
}

.details-enter-from,
.details-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .loading-content {
    @apply mx-4 p-6;
    @apply max-w-none;
  }
  
  .message-text {
    @apply text-base;
  }
  
  .global-loading-indicator.position-top {
    @apply pt-16;
  }
  
  .global-loading-indicator.position-bottom {
    @apply pb-16;
  }
}

@media (max-width: 480px) {
  .loading-content {
    @apply mx-2 p-4;
  }
  
  .spinner {
    @apply w-8 h-8;
  }
  
  .progress-details {
    @apply flex-col items-start gap-1;
  }
}
</style>