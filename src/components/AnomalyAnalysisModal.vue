<template>
  <el-dialog
    v-model="visible"
    title="设备异常分析"
    width="80%"
    :before-close="handleClose"
    destroy-on-close
  >
    <!-- 分析控制区 -->
    <div class="analysis-controls">
      <el-button 
        type="primary" 
        :loading="isTraining"
        @click="trainModel"
      >
        {{ isTraining ? '训练中...' : '训练模型' }}
      </el-button>
      <el-button 
        :loading="isDetecting"
        @click="detectAnomalies"
      >
        {{ isDetecting ? '检测中...' : '开始检测' }}
      </el-button>
      <el-button @click="generateTestData">生成测试数据</el-button>
      <el-button @click="clearResults">清空结果</el-button>
    </div>

    <!-- 模型状态信息 -->
    <div class="model-status">
      <el-alert
        :title="modelStatusText"
        :type="modelStatusType"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 数据展示区 -->
    <div class="data-section">
      <div class="data-panel">
        <h4>测试数据</h4>
        <div class="data-table">
          <el-table
            :data="testData"
            height="200"
            border
            size="small"
          >
            <el-table-column prop="index" label="序号" width="60" />
            <el-table-column prop="cpu" label="CPU使用率" width="100" />
            <el-table-column prop="memory" label="内存使用率" width="100" />
            <el-table-column prop="disk" label="磁盘使用率" width="100" />
            <el-table-column prop="network" label="网络流量" width="100" />
            <el-table-column prop="temperature" label="温度" width="80" />
            <el-table-column prop="load" label="负载" width="80" />
            <el-table-column prop="isAnomaly" label="异常标记" width="80">
              <template #default="{ row }">
                <el-tag 
                  v-if="row.isAnomaly !== undefined"
                  :type="row.isAnomaly ? 'danger' : 'success'"
                  size="small"
                >
                  {{ row.isAnomaly ? '异常' : '正常' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 检测结果 -->
      <div class="results-panel" v-if="detectionResults">
        <h4>检测结果</h4>
        <div class="results-stats">
          <el-row :gutter="16">
            <el-col :span="6">
              <el-statistic title="总样本数" :value="detectionResults.anomalies.length" />
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="异常样本数" 
                :value="detectionResults.anomalies.filter(a => a).length"
              />
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="异常比例" 
                :value="((detectionResults.anomalies.filter(a => a).length / detectionResults.anomalies.length) * 100).toFixed(2)"
                suffix="%"
              />
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="平均异常分数" 
                :value="(detectionResults.scores.reduce((a, b) => a + b, 0) / detectionResults.scores.length).toFixed(2)"
              />
            </el-col>
          </el-row>
        </div>

        <!-- 异常分数分布图 -->
        <div class="chart-container">
          <v-chart :option="scoreChartOption" autoresize />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">
          确认
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import anomalyDetectionService from '@/services/anomaly-detection-service'

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

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

// 响应式数据
const visible = ref(false)
const isTraining = ref(false)
const isDetecting = ref(false)
const testData = ref<any[]>([])
const detectionResults = ref<any>(null)

// 模型状态
const modelStatus = computed(() => anomalyDetectionService.getModelStatus())

const modelStatusText = computed(() => {
  if (!modelStatus.value.isInitialized) {
    return '模型未初始化，请先训练模型'
  }
  if (modelStatus.value.isTraining) {
    return '模型正在训练中...'
  }
  return '模型已就绪，可以进行异常检测'
})

const modelStatusType = computed(() => {
  if (!modelStatus.value.isInitialized) {
    return 'warning'
  }
  if (modelStatus.value.isTraining) {
    return 'info'
  }
  return 'success'
})

// 异常分数分布图表配置
const scoreChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  legend: {
    data: ['异常分数']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: detectionResults.value ? 
      detectionResults.value.anomalies.map((_: any, index: number) => `样本${index + 1}`) : []
  },
  yAxis: {
    type: 'value',
    name: '异常分数'
  },
  series: [{
    name: '异常分数',
    type: 'bar',
    data: detectionResults.value ? detectionResults.value.scores : [],
    itemStyle: {
      color: (params: any) => {
        return detectionResults.value.anomalies[params.dataIndex] ? '#ff4d4f' : '#1890ff'
      }
    }
  }]
}))

// 方法
const handleClose = () => {
  visible.value = false
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  emit('confirm')
  handleClose()
}

// 训练模型
const trainModel = async () => {
  isTraining.value = true
  
  try {
    const trainingData = anomalyDetectionService.generateTrainingData(1000)
    await anomalyDetectionService.trainModel(trainingData)
  } catch (error) {
    console.error('模型训练失败:', error)
  } finally {
    isTraining.value = false
  }
}

// 检测异常
const detectAnomalies = async () => {
  if (!modelStatus.value.isInitialized) {
    console.warn('请先训练模型')
    return
  }
  
  isDetecting.value = true
  
  try {
    const rawData = testData.value.map(item => [
      parseFloat(item.cpu),
      parseFloat(item.memory),
      parseFloat(item.disk),
      parseFloat(item.network),
      parseFloat(item.temperature),
      parseFloat(item.load)
    ])
    
    const results = await anomalyDetectionService.detectAnomalies(rawData)
    detectionResults.value = results
    
    // 更新测试数据的异常标记
    testData.value.forEach((item, index) => {
      item.isAnomaly = results.anomalies[index]
      item.anomalyScore = results.scores[index].toFixed(2)
    })
    
  } catch (error) {
    console.error('异常检测失败:', error)
  } finally {
    isDetecting.value = false
  }
}

// 生成测试数据
const generateTestData = () => {
  const rawData = anomalyDetectionService.generateTestData(20, 3)
  
  testData.value = rawData.map((data, index) => ({
    index: index + 1,
    cpu: data[0].toFixed(1) + '%',
    memory: data[1].toFixed(1) + '%',
    disk: data[2].toFixed(1) + '%',
    network: data[3].toFixed(1),
    temperature: data[4].toFixed(1) + '°C',
    load: data[5].toFixed(1)
  }))
  
  detectionResults.value = null
}

// 清空结果
const clearResults = () => {
  testData.value = []
  detectionResults.value = null
}

// 监听props变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

// 初始化
onMounted(() => {
  // 初始化TensorFlow.js模型
  anomalyDetectionService.initModel().catch(console.error)
})
</script>

<style scoped>
.analysis-controls {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.model-status {
  margin-bottom: 16px;
}

.data-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: 400px;
}

.data-panel, .results-panel {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 16px;
  overflow-y: auto;
}

.data-panel h4, .results-panel h4 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: bold;
}

.data-table {
  height: 200px;
}

.results-stats {
  margin-bottom: 16px;
}

.chart-container {
  height: 200px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1200px) {
  .data-section {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>