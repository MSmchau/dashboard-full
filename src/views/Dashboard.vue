<template>
  <div class="dashboard-container">
    <!-- AI查询结果弹窗 -->
    <AIQueryResult 
      :show="showAiResult"
      @close="closeAiResult"
      @reuseQuery="handleReuseQuery"
    />
    
    <!-- 顶部导航与筛选区 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="system-title">
          可视化大屏数据展示系统
        </h1>
        <div class="scene-selector">
          <el-select 
            v-model="currentScene" 
            placeholder="选择场景" 
            size="default"
          >
            <el-option label="生产监控" value="production" />
            <el-option label="业务运营" value="business" />
            <el-option label="设备监控" value="device" />
          </el-select>
        </div>
      </div>
      <div class="header-right">
        <div class="time-selector">
          <el-select 
            v-model="timeRange" 
            placeholder="时间范围" 
            size="default"
          >
            <el-option label="实时" value="realtime" />
            <el-option label="今日" value="today" />
            <el-option label="近7天" value="7days" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </div>
        <div class="ai-search">
          <el-input
            v-model="aiQuery"
            placeholder="请输入自然语言查询..."
            size="default"
            @keyup.enter="handleAiSearch"
            clearable
          >
            <template #append>
              <el-button 
                @click="handleAiSearch"
              >
                查询
              </el-button>
            </template>
          </el-input>
        </div>
        <el-button 
          size="default" 
          @click="refreshData"
          type="primary"
        >
          刷新
        </el-button>
        <el-button 
          size="default" 
          @click="exportDashboardData" 
          type="primary"
        >
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 核心指标看板区 -->
    <div class="metrics-section">
      <div class="metrics-grid">
        <div 
          v-for="metric in metrics" 
          :key="metric.id" 
          class="metric-card"
          :class="`status-${metric.status}`"
          @click="handleMetricClick(metric)"
        >
          <!-- 状态指示点 -->
          <div 
            class="metric-status-dot" 
            :class="`status-${metric.status}`"
          ></div>
          
          <div class="metric-header">
            <span class="metric-icon">{{ getMetricIcon(metric.label) }}</span>
            <span class="metric-label">
              {{ metric.label }}
            </span>
            <el-tag 
              :type="metric.status === 'good' ? 'success' : metric.status === 'warning' ? 'warning' : metric.status === 'error' ? 'danger' : 'primary'" 
              size="small"
            >
              {{ metric.unit }}
            </el-tag>
          </div>
          
          <div class="metric-content">
            <div class="metric-value-container">
              <div class="metric-value">
                <count-to
                  :start-val="0"
                  :end-val="metric.value"
                  :duration="2000"
                  :autoplay="true"
                  :decimals="metric.value % 1 !== 0 ? 1 : 0"
                />
                <span class="metric-unit">{{ metric.unit }}</span>
              </div>
            </div>
            
            <div 
              class="metric-trend" 
              :class="metric.trend.startsWith('+') ? 'trend-up' : 'trend-down'"
            >
              <el-icon>
                <ArrowUp v-if="metric.trend.startsWith('+')" />
                <ArrowDown v-else />
              </el-icon>
              {{ Math.abs(parseFloat(metric.trend)) }}%
            </div>
          </div>
          
          <div class="metric-footer">
            <span class="metric-description">
              {{ metric.desc }}
            </span>
            <div 
              class="metric-sparkline" 
              :ref="`sparkline-${metric.id}`"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 实时数据面板 -->
    <RealtimeDashboard />

    <!-- 多维可视化图表区 -->
    <div class="charts-section">
      <div class="charts-grid">
        <!-- 动态排序柱状图 -->
        <div class="chart-wrapper">
          <div class="chart-container">
            <h3 class="chart-title">
              TOP10业务数据
            </h3>
            <div class="chart-content">
              <v-chart 
                ref="barChartRef"
                :option="barChartOption" 
                autoresize
                manual-update
                :manual-init="true"
                class="chart-instance"
              />
            </div>
          </div>
        </div>
        
        <!-- 时序折线图 -->
        <div class="chart-wrapper">
          <div class="chart-container">
            <h3 class="chart-title">
              趋势数据
            </h3>
            <div class="chart-content">
              <v-chart 
                ref="lineChartRef"
                :option="lineChartOption" 
                autoresize
                manual-update
                :manual-init="true"
                class="chart-instance"
              />
            </div>
          </div>
        </div>
        
        <!-- 预测性维护面板 -->
        <div class="chart-wrapper">
          <div class="chart-container">
            <h3 class="chart-title">
              设备健康预测
            </h3>
            <PredictiveMaintenancePanel />
          </div>
        </div>
        
        <!-- 3D数字孪生场景 -->
        <div class="chart-wrapper">
          <div class="chart-container">
            <h3 class="chart-title">
              设备3D数字孪生
            </h3>
            <div class="three-container">
              <ThreeDScene />
            </div>
          </div>
        </div>
        
        <!-- 智能预警通知区 -->
        <div class="chart-wrapper">
          <div class="chart-container alert-panel">
            <div class="alert-header">
              <span class="alert-title">
                异常告警
              </span>
              <el-badge :value="alerts.length" type="danger" />
            </div>
            <div class="alert-list">
              <div 
                v-for="alert in alerts" 
                :key="alert.id"
                class="alert-item"
                :class="`alert-${alert.level}`"
                @click="handleAlertClick(alert)"
              >
                <div class="alert-content">
                  <div class="alert-device">
                    {{ alert.device }}
                  </div>
                  <div class="alert-metric">
                    {{ alert.metric }}
                  </div>
                  <div class="alert-time">
                    {{ alert.time }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard测试内容 -->
    <div class="scroll-test-content">
      <h3>📊 Dashboard 滚动测试内容</h3>
      <div class="test-sections">
        <div v-for="i in 15" :key="i" class="test-section">
          <h4>测试段落 {{ i }}</h4>
          <p>这是用于测试页面滚动的内容。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <div class="test-cards">
            <div v-for="j in 5" :key="j" class="test-card">
              <strong>卡片 {{ i }}-{{ j }}</strong>
              <p>测试数据内容: {{ i }} - {{ j }} | 状态: {{ j % 2 === 0 ? '正常' : '异常' }}</p>
              <span class="test-badge">badge-{{ j }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="extra-content">
        <h3>📈 更多测试数据</h3>
        <div class="data-grid">
          <div v-for="k in 20" :key="k" class="data-item">
            <span>数据项 {{ k }}</span>
            <span>{{ Math.random() * 1000 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import CountUp from 'vue3-countup'
// Three.js相关功能已移至ThreeDScene组件
// LoadingSpinner和ErrorState已集成到ThreeDScene组件中
import AIQueryResult from '@/components/AIQueryResult.vue'
import PredictiveMaintenancePanel from '@/components/PredictiveMaintenancePanel.vue'
import ThreeDScene from '@/components/ThreeDScene.vue'
import RealtimeDashboard from '@/components/RealtimeDashboard.vue'
// import { useResponsiveDesign } from '@/composables/useResponsiveDesign' // 已删除响应式设计依赖
import { ElMessage } from 'element-plus'
import { useRealtimeDashboard, useRealtimePerformance } from '@/composables/useRealtimeData'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'

// 注册ECharts组件
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 响应式数据
const currentScene = ref('production')
const timeRange = ref('realtime')
const aiQuery = ref('')
const showAiResult = ref(false)

// 启用实时数据功能
const realtimeDashboard = useRealtimeDashboard()
const realtimePerformance = useRealtimePerformance()

// Three.js相关状态已在ThreeDScene组件中处理

// 图表引用
const barChartRef = ref()
const lineChartRef = ref()

// 核心指标数据 - 扩展为更完整的业务指标体系
const metrics = ref([
  { id: 1, label: '设备总数', value: 1568, unit: '台', trend: '+2.3%', status: 'normal', desc: '系统接入的总设备数量' },
  { id: 2, label: '在线设备', value: 1423, unit: '台', trend: '+1.8%', status: 'normal', desc: '正常运行中的设备数量' },
  { id: 3, label: '设备OEE', value: 85.6, unit: '%', trend: '+2.1%', status: 'good', desc: '设备综合效率(可用性×性能×质量)' },
  { id: 4, label: '平均MTBF', value: 168, unit: '小时', trend: '+8.5%', status: 'good', desc: '平均故障间隔时间' },
  { id: 5, label: '平均MTTR', value: 2.3, unit: '小时', trend: '-12.7%', status: 'good', desc: '平均修复时间' },
  { id: 6, label: '告警数量', value: 12, unit: '个', trend: '-5.2%', status: 'warning', desc: '当前待处理的告警总数' },
  { id: 7, label: '生产效率', value: 94.2, unit: '%', trend: '+1.5%', status: 'good', desc: '实际产量与计划产量比值' },
  { id: 8, label: '能耗效率', value: 78.9, unit: '%', trend: '-3.2%', status: 'warning', desc: '单位产能能耗效率' },
  { id: 9, label: '质量合格率', value: 99.1, unit: '%', trend: '+0.3%', status: 'good', desc: '产品质量合格率' },
  { id: 10, label: '系统负载', value: 68.5, unit: '%', trend: '+3.1%', status: 'normal', desc: '系统整体负载水平' },
  { id: 11, label: '网络延迟', value: 45, unit: 'ms', trend: '-8.7%', status: 'normal', desc: '网络通信平均延迟' },
  { id: 12, label: '数据处理量', value: 2.8, unit: 'TB/h', trend: '+15.3%', status: 'good', desc: '每小时处理的数据量' }
])

// 告警数据
const alerts = ref([
  { id: 1, device: '服务器A', metric: 'CPU使用率', level: 'high', value: '95%', time: '2分钟前' },
  { id: 2, device: '交换机B', metric: '端口流量', level: 'medium', value: '85%', time: '5分钟前' },
  { id: 3, device: '存储C', metric: '磁盘空间', level: 'low', value: '88%', time: '10分钟前' }
])

// 图表配置
const barChartOption = ref({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['业务A', '业务B', '业务C', '业务D', '业务E', '业务F', '业务G', '业务H', '业务I', '业务J']
  },
  yAxis: { type: 'value' },
  series: [{
    data: [120, 200, 150, 80, 70, 110, 130, 180, 90, 160],
    type: 'bar',
    itemStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#83bff6' },
        { offset: 0.5, color: '#188df0' },
        { offset: 1, color: '#188df0' }
      ])
    }
  }]
})

const lineChartOption = ref({
  tooltip: {
    trigger: 'axis'
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '设备在线数',
      type: 'line',
      smooth: true,
      data: [300, 280, 320, 350, 380, 360, 340],
      itemStyle: { color: '#1890ff' }
    },
    {
      name: '业务处理量',
      type: 'line',
      smooth: true,
      data: [200, 180, 220, 250, 280, 260, 240],
      itemStyle: { color: '#52c41a' }
    }
  ]
})



// 导入AI服务
import { AIService } from '@/services/ai-service'

// 方法
const getMetricStatusClass = (metric: any) => {
  return `status-${metric.status}`
}

const getMetricIcon = (label: string) => {
  const iconMap: { [key: string]: string } = {
    '设备总数': '🔧',
    '在线设备': '📱',
    '设备OEE': '⚡',
    '平均MTBF': '⏱️',
    '平均MTTR': '🔧',
    '告警数量': '⚠️',
    '生产效率': '📈',
    '能耗效率': '⚡',
    '质量合格率': '✅',
    '系统负载': '💻',
    '网络延迟': '🌐',
    '数据处理量': '📊'
  }
  return iconMap[label] || '📊'
}

const handleAiSearch = async () => {
  if (aiQuery.value.trim()) {
    try {
      const result = await AIService.query(aiQuery.value)
      console.log('AI查询结果:', result)
      
      // 根据查询结果更新界面
      handleAiResult(result)
    } catch (error) {
      console.error('AI查询失败:', error)
      // 可以在这里添加错误提示
    }
  }
}

// 处理AI查询结果
const handleAiResult = (result: any) => {
  switch (result.type) {
    case 'device_data':
      // 更新设备相关数据
      metrics.value = [
        { id: 1, label: '设备总数', value: result.data.totalDevices, trend: '+2.3%', status: 'normal' },
        { id: 2, label: '在线设备', value: result.data.onlineDevices, trend: '+1.8%', status: 'normal' },
        { id: 3, label: '离线设备', value: result.data.offlineDevices, trend: '-0.5%', status: 'warning' },
        { id: 4, label: '平均运行时间', value: result.data.avgUptime, trend: '+0.2%', status: 'normal' }
      ]
      break
      
    case 'alert_data':
      // 更新告警数据
      alerts.value = result.data
      break
      
    case 'trend_data':
      // 更新趋势图表
      lineChartOption.value = {
        ...lineChartOption.value,
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: result.data.labels
        },
        series: result.data.datasets.map((dataset: any, index: number) => ({
          name: dataset.name,
          type: 'line',
          smooth: true,
          data: dataset.data,
          itemStyle: { color: index === 0 ? '#1890ff' : '#52c41a' }
        }))
      }
      break
      
    case 'statistics_data':
      // 更新统计图表
      barChartOption.value = {
        ...barChartOption.value,
        xAxis: {
          type: 'category',
          data: result.data.topBusinesses.map((b: any) => b.name)
        },
        series: [{
          data: result.data.topBusinesses.map((b: any) => b.value),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }]
      }
      break
  }
  
  // 显示查询结果
  showAiResult.value = true
}

// 关闭AI查询结果
const closeAiResult = () => {
  showAiResult.value = false
}

// 重用查询
const handleReuseQuery = (query: string) => {
  aiQuery.value = query
  closeAiResult()
  // 延迟执行查询，确保输入框已更新
  setTimeout(() => {
    handleAiSearch()
  }, 100)
}

const refreshData = () => {
  console.log('刷新数据')
  // 这里会调用数据刷新接口
}

const handleAlertClick = (alert: any) => {
  console.log('点击告警:', alert)
  // 这里会显示告警详情
}

// Three.js场景相关功能已移至ThreeDScene组件处理

// 响应式设计系统已删除，使用固定布局

// 通用工具方法
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 处理指标点击事件
const handleMetricClick = (metric: any) => {
  ElMessage({
    message: `查看 ${metric.label} 详细数据`,
    type: 'info',
    duration: 2000
  })
  
  // 可以在这里添加更多的交互逻辑，比如：
  // - 打开详情弹窗
  // - 跳转到相关页面
  // - 显示该指标的详细图表等
  console.log('点击指标:', metric)
}

// 格式化指标值为更友好的显示格式
const formatMetricValue = (value: number, unit: string) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M${unit}`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K${unit}`
  }
  return `${value}${unit}`
}
// 通用工具方法

// 初始化图表

// 生命周期 - Three.js相关功能已移至ThreeDScene组件处理
onMounted(() => {
  // 组件挂载时的初始化逻辑
  initCharts()
})

// 初始化图表
const initCharts = () => {
  // 确保图表组件已挂载
  nextTick(() => {
    if (barChartRef.value?.chart) {
      barChartRef.value.chart.resize()
    }
    if (lineChartRef.value?.chart) {
      lineChartRef.value.chart.resize()
    }
  })
}

// 监听图表选项变化并重新渲染
watch([barChartOption, lineChartOption], () => {
  nextTick(() => {
    if (barChartRef.value?.chart) {
      barChartRef.value.chart.resize()
    }
    if (lineChartRef.value?.chart) {
      lineChartRef.value.chart.resize()
    }
  })
}, { deep: true })

// 导出仪表板数据
const exportDashboardData = async () => {
  try {
    // 准备导出数据
    const exportData = {
      metrics: metrics.value,
      alerts: alerts.value,
      currentScene: currentScene.value,
      timeRange: timeRange.value,
      timestamp: new Date().toISOString()
    };

    // 使用导出工具函数
    const { exportDeviceData } = await import('@/utils/export-utils');
    
    // 导出为Excel格式
    await exportDeviceData(
      [exportData], 
      { filename: '仪表板数据' }
    );
    
    // 使用Element Plus的消息提示
    const { ElMessage } = await import('element-plus');
    ElMessage.success('仪表板数据导出成功');
  } catch (error) {
    console.error('导出仪表板数据失败:', error);
    const { ElMessage } = await import('element-plus');
    ElMessage.error('仪表板数据导出失败');
  }
}

onUnmounted(() => {
  // 组件卸载时的清理逻辑
})
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  min-height: 100vh;
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: visible;
  padding: 20px;
  margin: 0;
  background: linear-gradient(135deg, #0f1419 0%, #1a1f29 100%);
  position: relative;
  box-sizing: border-box;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.system-title {
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.scene-selector,
.time-selector {
  width: 150px;
}

.ai-search {
  width: 300px;
}

.metrics-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  width: 100%;
}

.metric-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-card.status-good {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.12), rgba(82, 196, 26, 0.06));
  border: 1px solid rgba(82, 196, 26, 0.3);
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.1);
}

.metric-card.status-good:hover {
  box-shadow: 0 4px 16px rgba(82, 196, 26, 0.2);
  transform: translateY(-2px);
}

.metric-card.status-normal {
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.12), rgba(24, 144, 255, 0.06));
  border: 1px solid rgba(24, 144, 255, 0.3);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.metric-card.status-normal:hover {
  box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
  transform: translateY(-2px);
}

.metric-card.status-warning {
  background: linear-gradient(135deg, rgba(250, 173, 20, 0.12), rgba(250, 173, 20, 0.06));
  border: 1px solid rgba(250, 173, 20, 0.3);
  box-shadow: 0 2px 8px rgba(250, 173, 20, 0.1);
}

.metric-card.status-warning:hover {
  box-shadow: 0 4px 16px rgba(250, 173, 20, 0.2);
  transform: translateY(-2px);
}

.metric-card.status-error {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.12), rgba(255, 77, 79, 0.06));
  border: 1px solid rgba(255, 77, 79, 0.3);
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.1);
}

.metric-card.status-error:hover {
  box-shadow: 0 4px 16px rgba(255, 77, 79, 0.2);
  transform: translateY(-2px);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.metric-icon {
  font-size: 16px;
  opacity: 0.8;
}

.metric-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value-container {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 8px;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-value .count-to {
  font-size: 28px;
  font-weight: bold;
  color: var(--text-color);
}

.metric-unit {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
}

.metric-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.metric-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-weight: 500;
}

.metric-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.metric-description {
  font-size: 11px;
  color: var(--text-secondary, #666);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.metric-sparkline {
  width: 60px;
  height: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.metric-status-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  opacity: 0.8;
}

.metric-status-dot.status-good {
  background: #52c41a;
  box-shadow: 0 0 6px rgba(82, 196, 26, 0.6);
}

.metric-status-dot.status-normal {
  background: #1890ff;
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.6);
}

.metric-status-dot.status-warning {
  background: #faad14;
  box-shadow: 0 0 6px rgba(250, 173, 20, 0.6);
}

.metric-status-dot.status-error {
  background: #ff4d4f;
  box-shadow: 0 0 6px rgba(255, 77, 79, 0.6);
}

.trend-up {
  color: #52c41a;
}

.trend-down {
  color: #ff4d4f;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 16px;
  height: auto;
  box-sizing: border-box;
}

.chart-wrapper {
  height: 100%;
  min-height: 300px;
  overflow: hidden;
  width: 100%;
}

/* 固定布局样式 */

/* Chart Container Styles */
.chart-container {
  height: 100%;
  min-height: 280px;
  max-height: calc((100vh - 200px - 32px) / 2);
  background: var(--card-bg);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.chart-content {
  flex: 1;
  width: 100%;
  position: relative;
  min-height: 200px;
}

.chart-instance {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-color);
  flex-shrink: 0;
  text-align: center;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.three-container {
  width: 100%;
  height: 100%;
  min-height: 280px;
  max-height: 400px;
  position: relative;
  background: #0f1419;
  border-radius: 4px;
  overflow: hidden;
}

.alert-panel {
  position: relative;
  width: 100%;
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.05), rgba(255, 77, 79, 0.02));
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  z-index: 10;
  border: 1px solid rgba(255, 77, 79, 0.2);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.1);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.alert-title {
  font-size: 16px;
  font-weight: bold;
}

.alert-list {
  flex: 1;
  overflow: visible;
  min-height: 0;
}

.alert-item {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.alert-item.alert-high {
  background: rgba(255, 77, 79, 0.1);
  border-left: 3px solid #ff4d4f;
}

.alert-item.alert-medium {
  background: rgba(250, 173, 20, 0.1);
  border-left: 3px solid #faad14;
}

.alert-item.alert-low {
  background: rgba(24, 144, 255, 0.1);
  border-left: 3px solid #1890ff;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alert-device {
  font-size: 12px;
  font-weight: bold;
}

.alert-metric {
  font-size: 11px;
  color: var(--text-secondary);
}

.alert-time {
   font-size: 10px;
   color: var(--text-secondary);
 }

 /* 滚动测试内容样式 */
 .scroll-test-content {
   margin-top: 20px;
   padding: 20px;
   background: rgba(0, 0, 0, 0.1);
   border-radius: 8px;
   color: var(--text-color);
 }

 .scroll-test-content h3 {
   margin-bottom: 16px;
   color: #1890ff;
   font-size: 20px;
 }

 .test-sections {
   margin-bottom: 30px;
 }

 .test-section {
   margin-bottom: 30px;
   padding: 16px;
   background: rgba(255, 255, 255, 0.05);
   border-radius: 6px;
   border-left: 4px solid #1890ff;
 }

 .test-section h4 {
   margin-bottom: 12px;
   color: var(--text-color);
   font-size: 18px;
 }

 .test-section p {
   margin-bottom: 16px;
   line-height: 1.6;
   color: var(--text-secondary);
 }

 .test-cards {
   display: grid;
   grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
   gap: 12px;
 }

 .test-card {
   padding: 12px;
   background: rgba(24, 144, 255, 0.1);
   border-radius: 4px;
   border: 1px solid rgba(24, 144, 255, 0.2);
 }

 .test-card strong {
   display: block;
   margin-bottom: 8px;
   color: var(--text-color);
 }

 .test-card p {
   margin-bottom: 8px;
   font-size: 12px;
   color: var(--text-secondary);
 }

 .test-badge {
   display: inline-block;
   padding: 2px 8px;
   background: #1890ff;
   color: white;
   border-radius: 10px;
   font-size: 10px;
 }

 .extra-content {
   margin-top: 30px;
 }

 .extra-content h3 {
   margin-bottom: 16px;
   color: #36cfc9;
   font-size: 18px;
 }

 .data-grid {
   display: grid;
   grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
   gap: 10px;
 }

 .data-item {
   padding: 10px;
   background: rgba(54, 207, 201, 0.1);
   border-radius: 4px;
   display: flex;
   justify-content: space-between;
   align-items: center;
   font-size: 12px;
 }

 .data-item span:first-child {
   color: var(--text-color);
   font-weight: 500;
 }

 .data-item span:last-child {
  color: #36cfc9;
  font-weight: bold;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 16px;
  width: 100%;
}

/* 固定布局样式 */
.dashboard-container {
  width: 100%;
  min-height: 100vh;
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: visible;
  padding: 20px;
  margin: 0;
  background: linear-gradient(135deg, #0f1419 0%, #1a1f29 100%);
  position: relative;
  box-sizing: border-box;
}
</style>