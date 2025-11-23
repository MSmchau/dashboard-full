<template>
  <div class="component-preview">
    <!-- 图表组件预览 -->
    <div v-if="component.type === 'chart'" class="chart-preview">
      <div class="chart-placeholder">
        <div class="chart-icon">
          <el-icon><Histogram /></el-icon>
        </div>
        <div class="chart-name">{{ component.name }}</div>
      </div>
    </div>

    <!-- 指标卡片预览 -->
    <div v-else-if="component.type === 'metric'" class="metric-preview">
      <div class="metric-content">
        <div class="metric-value">
          <span class="value">98.5%</span>
          <span class="unit">成功率</span>
        </div>
        <div class="metric-label">{{ component.name }}</div>
        <div class="metric-trend">
          <el-icon color="#52c41a"><TrendCharts /></el-icon>
          <span class="trend-text">+2.3%</span>
        </div>
      </div>
    </div>

    <!-- 文本组件预览 -->
    <div v-else-if="component.type === 'text'" class="text-preview">
      <div class="text-content">
        <div class="text-title">{{ component.name }}</div>
        <div class="text-desc">这里是文本内容预览区域</div>
      </div>
    </div>

    <!-- 3D组件预览 -->
    <div v-else-if="component.type === '3d'" class="three-d-preview">
      <div class="three-d-placeholder">
        <div class="three-d-icon">
          <el-icon><VideoCamera /></el-icon>
        </div>
        <div class="three-d-name">{{ component.name }}</div>
      </div>
    </div>

    <!-- 地图组件预览 -->
    <div v-else-if="component.type === 'map'" class="map-preview">
      <div class="map-placeholder">
        <div class="map-icon">
          <el-icon><MapLocation /></el-icon>
        </div>
        <div class="map-name">{{ component.name }}</div>
      </div>
    </div>

    <!-- 默认预览 -->
    <div v-else class="default-preview">
      <div class="default-content">
        <div class="default-icon">
          <el-icon><QuestionFilled /></el-icon>
        </div>
        <div class="default-name">{{ component.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Histogram,
  TrendCharts,
  VideoCamera,
  MapLocation, 
  QuestionFilled 
} from '@element-plus/icons-vue'

interface Component {
  id: number
  name: string
  type: 'chart' | 'metric' | 'text' | '3d' | 'map'
  category: string
}

interface Props {
  component: Component
}

defineProps<Props>()
</script>

<style scoped>
.component-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图表预览样式 */
.chart-preview {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1890ff33, #36cfc933);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
}

.chart-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 8px;
}

.chart-name {
  font-size: 12px;
  color: var(--text-color);
}

/* 指标卡片预览样式 */
.metric-preview {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #52c41a33, #73d13d33);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-content {
  text-align: center;
  padding: 16px;
}

.metric-value {
  margin-bottom: 8px;
}

.value {
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unit {
  font-size: 14px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.metric-label {
  font-size: 14px;
  color: var(--text-color);
  margin-bottom: 8px;
}

.metric-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #52c41a;
}

.trend-text {
  margin-left: 4px;
}

/* 文本预览样式 */
.text-preview {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #faad1433, #ffc53d33);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-content {
  text-align: center;
  padding: 16px;
}

.text-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 8px;
}

.text-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 3D组件预览样式 */
.three-d-preview {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #722ed133, #9254de33);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.three-d-placeholder {
  text-align: center;
}

.three-d-icon {
  font-size: 32px;
  color: #722ed1;
  margin-bottom: 8px;
}

.three-d-name {
  font-size: 12px;
  color: var(--text-color);
}

/* 地图组件预览样式 */
.map-preview {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fa541c33, #ff7a4533);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder {
  text-align: center;
}

.map-icon {
  font-size: 32px;
  color: #fa541c;
  margin-bottom: 8px;
}

.map-name {
  font-size: 12px;
  color: var(--text-color);
}

/* 默认预览样式 */
.default-preview {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #8c8c8c33, #bfbfbf33);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-content {
  text-align: center;
}

.default-icon {
  font-size: 32px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.default-name {
  font-size: 12px;
  color: var(--text-color);
}
</style>