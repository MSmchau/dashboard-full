<template>
  <div class="error-state">
    <div class="error-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0453 12.9543 44 24 44Z" fill="#fff2f0"/>
        <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0453 12.9543 44 24 44Z" stroke="#ff4d4f" stroke-width="2"/>
        <path d="M24 16V24" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round"/>
        <path d="M24 32H24.01" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <h3 class="error-title">{{ title }}</h3>
    <p class="error-message">{{ message }}</p>
    <el-button type="primary" size="small" @click="onRetry">
      {{ retryText }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  message?: string
  retryText?: string
}

interface Emits {
  (e: 'retry'): void
}

withDefaults(defineProps<Props>(), {
  title: '加载失败',
  message: '抱歉，加载过程中出现了问题',
  retryText: '重试'
})

const emit = defineEmits<Emits>()

const onRetry = () => {
  emit('retry')
}
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  height: 100%;
}

.error-icon {
  margin-bottom: 1rem;
}

.error-title {
  font-size: 16px;
  font-weight: bold;
  color: #ff4d4f;
  margin-bottom: 0.5rem;
}

.error-message {
  font-size: 14px;
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.5;
}
</style>