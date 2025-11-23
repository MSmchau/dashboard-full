<template>
  <div class="health-score-card">
    <!-- 健康度评分头部 -->
    <div class="health-header">
      <div class="score-display">
        <div class="score-circle" :style="{ '--score-color': statusColor }">
          <span class="score-value">{{ healthScore?.overall || 0 }}</span>
          <span class="score-label">健康度</span>
        </div>
      </div>
      <div class="status-info">
        <h3 class="device-name">{{ deviceName }}</h3>
        <div class="status-badge" :class="healthScore?.status">
          <i :class="statusIcon"></i>
          <span>{{ statusText }}</span>
        </div>
        <p class="last-update">最后更新: {{ lastUpdateTime }}</p>
      </div>
    </div>

    <!-- 指标详情 -->
    <div class="metrics-details" v-if="showDetails">
      <div class="metrics-grid">
        <div 
          v-for="metric in metricItems" 
          :key="metric.key"
          class="metric-item"
          :class="{ highlight: metric.score < 70 }"
        >
          <div class="metric-header">
            <span class="metric-name">{{ metric.name }}</span>
            <span class="metric-score">{{ metric.score }}分</span>
          </div>
          <div class="metric-bar">
            <div 
              class="metric-progress" 
              :style="{ width: metric.score + '%' }"
              :class="{ warning: metric.score < 70, danger: metric.score < 50 }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 改进建议 -->
    <div class="recommendations" v-if="showDetails && healthScore?.recommendations.length">
      <h4>改进建议</h4>
      <ul>
        <li v-for="(recommendation, index) in healthScore.recommendations" :key="index">
          {{ recommendation }}
        </li>
      </ul>
    </div>

    <!-- 展开/收起按钮 -->
    <div class="toggle-details">
      <el-button 
        size="small" 
        type="text" 
        @click="toggleDetails"
        class="toggle-btn"
      >
        {{ showDetails ? '收起详情' : '查看详情' }}
        <i :class="showDetails ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { HealthScore } from '@/services/health-scoring-service'

interface Props {
  healthScore: HealthScore | null
  deviceName: string
  lastUpdateTime: string
}

const props = defineProps<Props>()

const showDetails = ref(false)

// 计算属性
const statusColor = computed(() => {
  if (!props.healthScore) return '#ccc'
  
  const colors = {
    healthy: '#52c41a',
    warning: '#faad14',
    danger: '#f5222d'
  }
  return colors[props.healthScore.status]
})

const statusIcon = computed(() => {
  if (!props.healthScore) return 'el-icon-question'
  
  const icons = {
    healthy: 'el-icon-success',
    warning: 'el-icon-warning',
    danger: 'el-icon-error'
  }
  return icons[props.healthScore.status]
})

const statusText = computed(() => {
  if (!props.healthScore) return '未知'
  
  const texts = {
    healthy: '健康',
    warning: '警告',
    danger: '危险'
  }
  return texts[props.healthScore.status]
})

const metricItems = computed(() => {
  if (!props.healthScore) return []
  
  return [
    { key: 'cpu', name: 'CPU', score: props.healthScore.details.cpu },
    { key: 'memory', name: '内存', score: props.healthScore.details.memory },
    { key: 'disk', name: '磁盘', score: props.healthScore.details.disk },
    { key: 'network', name: '网络', score: props.healthScore.details.network },
    { key: 'temperature', name: '温度', score: props.healthScore.details.temperature },
    { key: 'uptime', name: '运行时间', score: props.healthScore.details.uptime }
  ]
})

// 方法
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<style scoped>
.health-score-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8e8e8;
}

.health-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.score-display {
  flex-shrink: 0;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid var(--score-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--score-color);
  line-height: 1;
}

.score-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.status-info {
  flex: 1;
}

.device-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.healthy {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.status-badge.warning {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  color: #faad14;
}

.status-badge.danger {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #f5222d;
}

.last-update {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #999;
}

.metrics-details {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
  margin-bottom: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metric-item {
  padding: 8px;
  border-radius: 4px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.metric-item.highlight {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.metric-score {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.metric-bar {
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
}

.metric-progress {
  height: 100%;
  background: #52c41a;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.metric-progress.warning {
  background: #faad14;
}

.metric-progress.danger {
  background: #f5222d;
}

.recommendations {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.recommendations h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.recommendations ul {
  margin: 0;
  padding-left: 16px;
}

.recommendations li {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 4px;
}

.toggle-details {
  text-align: center;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.toggle-btn {
  color: #1890ff;
  font-size: 12px;
}

.toggle-btn:hover {
  color: #40a9ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .health-header {
    flex-direction: column;
    text-align: center;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>