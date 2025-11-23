<template>
  <div style="padding: 20px; background: #e0e0e0; min-height: 100vh;">
    <h1>Device Monitor - Test Page</h1>
    <p>这是测试页面</p>
    <div style="color: red; font-weight: bold;">如果看到这个红色文字，说明Vue应用正常工作！</div>
    <div>{{ message }}</div>
    <button @click="count++">点击次数: {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const message = 'Vue 正在工作!'
const count = ref(0)
console.log('Test component loaded successfully!')
</script>