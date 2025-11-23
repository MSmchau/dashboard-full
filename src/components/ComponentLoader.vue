<template>
  <div class="component-loader">
    <div class="loader-spinner">
      <div class="spinner"></div>
    </div>
    <p class="loader-text">加载组件中...</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loadingText = ref('加载组件中...')
</script>

<style scoped>
.component-loader {
  @apply flex flex-col items-center justify-center p-8;
  @apply bg-white dark:bg-gray-900;
  @apply min-h-[200px];
}

.loader-spinner {
  @apply mb-4;
}

.spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full;
  animation: spin 1s linear infinite;
}

.loader-text {
  @apply text-gray-600 dark:text-gray-400 text-sm;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>