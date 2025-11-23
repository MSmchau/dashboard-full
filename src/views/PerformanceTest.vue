<template>
  <div class="performance-test">
    <div class="header">
      <h1>性能监控功能测试</h1>
      <p class="description">测试各种性能监控功能，包括页面加载、组件渲染、API调用等</p>
    </div>

    <!-- 测试控制面板 -->
    <div class="test-controls">
      <el-card>
        <template #header>
          <span>性能测试控制面板</span>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="6">
            <el-button 
              type="primary" 
              @click="testPageLoad" 
              :loading="loading.pageLoad"
              block
            >
              <el-icon><Timer /></el-icon>
              测试页面加载
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="success" 
              @click="testComponentRender" 
              :loading="loading.componentRender"
              block
            >
              <el-icon><Monitor /></el-icon>
              测试组件渲染
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="warning" 
              @click="testAPIRequests" 
              :loading="loading.apiRequests"
              block
            >
              <el-icon><Connection /></el-icon>
              测试API请求
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="danger" 
              @click="testMemoryUsage" 
              :loading="loading.memoryUsage"
              block
            >
              <el-icon><Cpu /></el-icon>
              测试内存使用
            </el-button>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="6">
            <el-button 
              type="info" 
              @click="testUserInteraction" 
              :loading="loading.userInteraction"
              block
            >
              <el-icon><Mouse /></el-icon>
              测试用户交互
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="info" 
              @click="testFPS" 
              :loading="loading.fps"
              block
            >
              <el-icon><VideoCamera /></el-icon>
              测试FPS
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="info" 
              @click="runAllTests" 
              :loading="loading.allTests"
              block
            >
              <el-icon><Setting /></el-icon>
              运行所有测试
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="warning" 
              @click="clearResults" 
              block
            >
              <el-icon><Delete /></el-icon>
              清空结果
            </el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 测试进度显示 -->
    <div class="test-progress" v-if="isTesting">
      <el-card>
        <template #header>
          <span>测试进度</span>
        </template>
        <div class="progress-content">
          <el-progress 
            :percentage="testProgress" 
            :status="testProgress === 100 ? 'success' : ''"
            :stroke-width="8"
          />
          <div class="progress-info" v-if="currentTest">
            <el-icon><Loading /></el-icon>
            <span>当前测试: {{ currentTest }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 测试结果展示 -->
    <div class="test-results">
      <el-card>
        <template #header>
          <span>测试结果</span>
          <div class="result-controls">
            <el-tag type="success">成功: {{ results.filter(r => r.success).length }}</el-tag>
            <el-tag type="danger">失败: {{ results.filter(r => !r.success).length }}</el-tag>
            <el-tag type="info">总计: {{ results.length }}</el-tag>
          </div>
        </template>
        
        <el-table :data="results" style="width: 100%" height="400" v-if="results.length > 0" max-height="400" :row-key="row => row.id || row.timestamp" :virtual-scroll="results.length > 50" v-loading="loading.table">
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="testType" label="测试类型" width="150">
            <template #default="scope">
              <el-tag :type="scope.row.success ? 'success' : 'danger'">
                {{ getTestTypeName(scope.row.testType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="耗时" width="120">
            <template #default="scope">
              {{ scope.row.duration ? `${scope.row.duration}ms` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="scope">
              {{ scope.row.description }}
            </template>
          </el-table-column>
          <el-table-column prop="details" label="详细信息" min-width="300">
            <template #default="scope">
              <el-tooltip v-if="scope.row.details" :content="scope.row.details">
                <el-button size="small" type="info">查看详情</el-button>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="empty-table">
          <el-empty description="暂无测试结果" />
        </div>
      </el-card>
    </div>

    <!-- 性能数据实时监控 -->
    <div class="live-monitoring">
      <el-card>
        <template #header>
          <span>实时性能数据</span>
          <div class="monitoring-controls">
            <el-switch v-model="autoRefresh" active-text="自动刷新" />
            <el-button size="small" @click="refreshMetrics">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="6" v-for="stat in keyMetrics" :key="stat.metric">
            <el-card class="metric-card" :class="{ 'unhealthy': !stat.isHealthy }">
              <div class="metric-content">
                <div class="metric-icon">
                  <el-icon :color="stat.isHealthy ? '#67C23A' : '#F56C6C'">
                    <component :is="getMetricIcon(stat.metric)" />
                  </el-icon>
                </div>
                <div class="metric-info">
                  <div class="metric-name">{{ getMetricName(stat.metric) }}</div>
                  <div class="metric-value">{{ formatValue(stat.lastValue, stat.metric) }}</div>
                  <div class="metric-trend" :class="stat.trend">
                    {{ getTrendText(stat.trend) }}
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 动态组件测试区域 -->
    <div class="dynamic-components">
      <el-card>
        <template #header>
          <span>动态组件渲染测试</span>
          <div class="component-controls">
            <el-button @click="addComponent">
              <el-icon><Plus /></el-icon>
              添加组件
            </el-button>
            <el-button @click="removeComponent" :disabled="dynamicComponents.length === 0">
              <el-icon><Minus /></el-icon>
              移除组件
            </el-button>
            <el-button @click="clearComponents">
              <el-icon><Delete /></el-icon>
              清空组件
            </el-button>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col 
            :span="6" 
            v-for="(component, index) in dynamicComponents" 
            :key="component.id"
          >
            <el-card class="component-card">
              <template #header>
                <span>组件 {{ index + 1 }}</span>
              </template>
              <div class="component-content">
                <p>ID: {{ component.id }}</p>
                <p>创建时间: {{ formatTime(component.createdAt) }}</p>
                <p>渲染次数: {{ component.renderCount }}</p>
                <el-button 
                  size="small" 
                  @click="rerenderComponent(component.id)"
                >
                  重新渲染
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 内存压力测试 -->
    <div class="memory-stress-test">
      <el-card>
        <template #header>
          <span>内存压力测试</span>
        </template>
        
        <el-form :model="stressTestForm" label-width="120px">
          <el-form-item label="测试类型">
            <el-select v-model="stressTestForm.type" placeholder="选择测试类型">
              <el-option label="创建大数组" value="array" />
              <el-option label="创建大对象" value="object" />
              <el-option label="DOM元素创建" value="dom" />
            </el-select>
          </el-form-item>
          <el-form-item label="数据大小">
            <el-slider
              v-model="stressTestForm.size"
              :min="1000"
              :max="100000"
              :step="1000"
              show-stops
            />
            <span style="margin-left: 10px;">{{ stressTestForm.size.toLocaleString() }} 个元素</span>
          </el-form-item>
          <el-form-item>
            <el-button 
              type="warning" 
              @click="runStressTest"
              :loading="loading.stressTest"
            >
              运行压力测试
            </el-button>
            <el-button @click="clearStressTest">
              清理测试数据
            </el-button>
          </el-form-item>
        </el-form>
        
        <div v-if="stressTestResult" class="stress-test-result">
          <el-alert
            :title="stressTestResult.success ? '压力测试完成' : '压力测试失败'"
            :type="stressTestResult.success ? 'success' : 'error'"
            :description="stressTestResult.message"
            show-icon
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { 
  Timer, Monitor, Connection, Cpu, Mouse, VideoCamera, Setting, Delete, 
  Refresh, Plus, Minus
} from '@element-plus/icons-vue'
import { performanceMonitoringService, PerformanceMetric, type PerformanceStats } from '@/services/performance-monitoring-service'

// 测试类型枚举
enum TestType {
  PAGE_LOAD = 'page_load',
  COMPONENT_RENDER = 'component_render',
  API_REQUESTS = 'api_requests',
  MEMORY_USAGE = 'memory_usage',
  USER_INTERACTION = 'user_interaction',
  FPS = 'fps',
  ALL_TESTS = 'all_tests'
}

// 测试结果接口
interface TestResult {
  testType: TestType
  timestamp: number
  duration?: number
  success: boolean
  description: string
  details?: string
}

// 动态组件接口
interface DynamicComponent {
  id: string
  createdAt: number
  renderCount: number
}

// 响应式数据
const loading = ref({
  pageLoad: false,
  componentRender: false,
  apiRequests: false,
  memoryUsage: false,
  userInteraction: false,
  fps: false,
  allTests: false,
  stressTest: false
})

const results = ref<TestResult[]>([])
const autoRefresh = ref(false)
const dynamicComponents = ref<DynamicComponent[]>([])
const performanceStats = ref<PerformanceStats[]>([])

// 测试状态和进度
const isTesting = ref(false)
const testProgress = ref(0)
const currentTest = ref<string | null>(null)

// 定时器引用
let interval: NodeJS.Timeout | null = null

// 压力测试表单
const stressTestForm = ref({
  type: 'array' as 'array' | 'object' | 'dom',
  size: 10000
})

const stressTestResult = ref<{
  success: boolean
  message: string
  duration?: number
} | null>(null)

// 计算属性
const keyMetrics = computed(() => {
  return performanceStats.value.filter(stat => 
    [PerformanceMetric.PAGE_LOAD_TIME, PerformanceMetric.FPS, PerformanceMetric.MEMORY_USAGE, PerformanceMetric.API_RESPONSE_TIME].includes(stat.metric)
  )
})

// 测试方法
const testPageLoad = async () => {
  loading.value.pageLoad = true
  isTesting.value = true
  currentTest.value = '页面加载测试'
  testProgress.value = 0
  const startTime = performance.now()
  
  try {
    // 模拟页面加载
    testProgress.value = 50
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const duration = performance.now() - startTime
    testProgress.value = 100
    
    addResult({
      testType: TestType.PAGE_LOAD,
      timestamp: Date.now(),
      duration,
      success: true,
      description: `页面加载测试完成，耗时 ${duration.toFixed(2)}ms`,
      details: `开始时间: ${startTime.toFixed(2)}ms, 结束时间: ${performance.now().toFixed(2)}ms`
    })
  } catch (error) {
    addResult({
      testType: TestType.PAGE_LOAD,
      timestamp: Date.now(),
      success: false,
      description: '页面加载测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
  } finally {
    loading.value.pageLoad = false
    isTesting.value = false
    currentTest.value = null
    testProgress.value = 0
  }
}

const testComponentRender = async () => {
  loading.value.componentRender = true
  isTesting.value = true
  currentTest.value = '组件渲染测试'
  testProgress.value = 0
  const startTime = performance.now()
  
  try {
    // 测试组件渲染
    for (let i = 0; i < 10; i++) {
      addComponent()
      testProgress.value = (i + 1) * 10
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    const duration = performance.now() - startTime
    testProgress.value = 100
    
    addResult({
      testType: TestType.COMPONENT_RENDER,
      timestamp: Date.now(),
      duration,
      success: true,
      description: `组件渲染测试完成，创建了10个组件，耗时 ${duration.toFixed(2)}ms`,
      details: `平均每个组件渲染时间: ${(duration / 10).toFixed(2)}ms`
    })
  } catch (error) {
    addResult({
      testType: TestType.COMPONENT_RENDER,
      timestamp: Date.now(),
      success: false,
      description: '组件渲染测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
  } finally {
    loading.value.componentRender = false
    isTesting.value = false
    currentTest.value = null
    testProgress.value = 0
  }
}

const testAPIRequests = async () => {
  loading.value.apiRequests = true
  isTesting.value = true
  currentTest.value = 'API请求测试'
  testProgress.value = 0
  const startTime = performance.now()
  
  try {
    // 模拟API请求
    const requests = Array(5).fill(0).map((_, i) => 
      fetch(`https://jsonplaceholder.typicode.com/posts/${i + 1}`)
    )
    
    const responses = await Promise.all(requests)
    const data = await Promise.all(responses.map(r => r.json()))
    
    const duration = performance.now() - startTime
    testProgress.value = 100
    
    addResult({
      testType: TestType.API_REQUESTS,
      timestamp: Date.now(),
      duration,
      success: true,
      description: `API请求测试完成，发送了5个请求，耗时 ${duration.toFixed(2)}ms`,
      details: `平均响应时间: ${(duration / 5).toFixed(2)}ms, 成功获取 ${data.length} 条数据`
    })
  } catch (error) {
    addResult({
      testType: TestType.API_REQUESTS,
      timestamp: Date.now(),
      success: false,
      description: 'API请求测试失败',
      details: error instanceof Error ? error.message : '网络请求错误'
    })
  } finally {
    loading.value.apiRequests = false
    isTesting.value = false
    currentTest.value = null
    testProgress.value = 0
  }
}

const testMemoryUsage = async () => {
  loading.value.memoryUsage = true
  const startTime = performance.now()
  
  try {
    // 创建大量数据测试内存使用
    const largeArray = new Array(100000).fill(null).map((_, i) => ({
      id: i,
      data: 'x'.repeat(100) // 每个元素100字节
    }))
    
    const duration = performance.now() - startTime
    
    // 记录内存使用
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory
      addResult({
        testType: TestType.MEMORY_USAGE,
        timestamp: Date.now(),
        duration,
        success: true,
        description: `内存使用测试完成，创建了100,000个对象，耗时 ${duration.toFixed(2)}ms`,
        details: `内存使用: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, 总内存: ${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
      })
    } else {
      addResult({
        testType: TestType.MEMORY_USAGE,
        timestamp: Date.now(),
        duration,
        success: true,
        description: `内存使用测试完成，创建了100,000个对象，耗时 ${duration.toFixed(2)}ms`,
        details: '内存信息不可用（仅Chrome支持performance.memory）'
      })
    }
    
    // 清理数据
    largeArray.length = 0
  } catch (error) {
    addResult({
      testType: TestType.MEMORY_USAGE,
      timestamp: Date.now(),
      success: false,
      description: '内存使用测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
  } finally {
    loading.value.memoryUsage = false
  }
}

const testUserInteraction = async () => {
  loading.value.userInteraction = true
  const startTime = performance.now()
  
  try {
    // 模拟用户交互
    const interactions = ['click', 'hover', 'scroll', 'input', 'drag']
    
    for (const interaction of interactions) {
      performanceMonitoringService.recordUserInteractionTime(interaction, Math.random() * 100 + 50)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    const duration = performance.now() - startTime
    
    addResult({
      testType: TestType.USER_INTERACTION,
      timestamp: Date.now(),
      duration,
      success: true,
      description: `用户交互测试完成，模拟了5种交互，耗时 ${duration.toFixed(2)}ms`,
      details: `交互类型: ${interactions.join(', ')}`
    })
  } catch (error) {
    addResult({
      testType: TestType.USER_INTERACTION,
      timestamp: Date.now(),
      success: false,
      description: '用户交互测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
  } finally {
    loading.value.userInteraction = false
  }
}

const testFPS = async () => {
  loading.value.fps = true
  const startTime = performance.now()
  
  try {
    // 测试FPS
    let frameCount = 0
    const testDuration = 3000 // 3秒
    
    const measureFPS = () => {
      frameCount++
      if (performance.now() - startTime < testDuration) {
        requestAnimationFrame(measureFPS)
      } else {
        const duration = performance.now() - startTime
        const fps = (frameCount * 1000) / duration
        
        addResult({
          testType: TestType.FPS,
          timestamp: Date.now(),
          duration,
          success: true,
          description: `FPS测试完成，平均帧率 ${fps.toFixed(1)}FPS`,
          details: `测试时长: ${duration.toFixed(2)}ms, 总帧数: ${frameCount}`
        })
        
        loading.value.fps = false
      }
    }
    
    requestAnimationFrame(measureFPS)
  } catch (error) {
    addResult({
      testType: TestType.FPS,
      timestamp: Date.now(),
      success: false,
      description: 'FPS测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
    loading.value.fps = false
  }
}

const runAllTests = async () => {
  loading.value.allTests = true
  
  try {
    const tests = [
      testPageLoad,
      testComponentRender,
      testAPIRequests,
      testMemoryUsage,
      testUserInteraction,
      testFPS
    ]
    
    for (const test of tests) {
      await test()
      await new Promise(resolve => setTimeout(resolve, 500)) // 测试间隔
    }
    
    addResult({
      testType: TestType.ALL_TESTS,
      timestamp: Date.now(),
      success: true,
      description: '所有测试完成',
      details: `共执行了 ${tests.length} 项测试`
    })
  } catch (error) {
    addResult({
      testType: TestType.ALL_TESTS,
      timestamp: Date.now(),
      success: false,
      description: '所有测试执行失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
  } finally {
    loading.value.allTests = false
  }
}

// 动态组件方法
const addComponent = () => {
  const component: DynamicComponent = {
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    renderCount: 0
  }
  
  dynamicComponents.value.push(component)
  
  // 记录组件渲染时间
  performanceMonitoringService.recordComponentRenderTime('DynamicComponent', Math.random() * 10 + 5)
}

const removeComponent = () => {
  if (dynamicComponents.value.length > 0) {
    dynamicComponents.value.pop()
  }
}

const clearComponents = () => {
  dynamicComponents.value = []
}

const rerenderComponent = (id: string) => {
  const component = dynamicComponents.value.find(comp => comp.id === id)
  if (component) {
    component.renderCount++
    
    // 记录重新渲染时间
    performanceMonitoringService.recordComponentRenderTime('DynamicComponent-Rerender', Math.random() * 5 + 2)
  }
}

// 压力测试方法
const runStressTest = async () => {
  loading.value.stressTest = true
  const startTime = performance.now()
  
  try {
    let testData: any = null
    
    switch (stressTestForm.value.type) {
      case 'array':
        testData = new Array(stressTestForm.value.size).fill(null).map((_, i) => ({
          id: i,
          value: Math.random(),
          timestamp: Date.now()
        }))
        break
        
      case 'object':
        testData = {}
        for (let i = 0; i < stressTestForm.value.size; i++) {
          testData[`key_${i}`] = {
            value: Math.random(),
            timestamp: Date.now()
          }
        }
        break
        
      case 'dom':
        const container = document.createElement('div')
        container.style.display = 'none'
        for (let i = 0; i < stressTestForm.value.size; i++) {
          const element = document.createElement('div')
          element.textContent = `Element ${i}`
          element.className = 'stress-test-element'
          container.appendChild(element)
        }
        document.body.appendChild(container)
        testData = container
        break
    }
    
    const duration = performance.now() - startTime
    
    stressTestResult.value = {
      success: true,
      message: `压力测试完成，创建了 ${stressTestForm.value.size.toLocaleString()} 个${getStressTestTypeName(stressTestForm.value.type)}，耗时 ${duration.toFixed(2)}ms`,
      duration
    }
    
    // 记录性能数据
    performanceMonitoringService.recordPerformanceData({
      metric: PerformanceMetric.MEMORY_USAGE,
      value: stressTestForm.value.size,
      timestamp: Date.now(),
      component: `StressTest-${stressTestForm.value.type}`,
      extraInfo: {
        type: stressTestForm.value.type,
        size: stressTestForm.value.size,
        duration
      }
    })
    
  } catch (error) {
    stressTestResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '压力测试失败'
    }
  } finally {
    loading.value.stressTest = false
  }
}

const clearStressTest = () => {
  stressTestResult.value = null
  
  // 清理DOM元素
  const elements = document.querySelectorAll('.stress-test-element')
  elements.forEach(el => el.remove())
}

// 工具方法
const addResult = (result: TestResult) => {
  results.value.push(result)
  
  // 限制结果数量
  if (results.value.length > 100) {
    results.value = results.value.slice(-100)
  }
}

const clearResults = () => {
  results.value = []
}

const refreshMetrics = () => {
  performanceStats.value = performanceMonitoringService.getAllPerformanceStats()
}

const getTestTypeName = (type: TestType) => {
  const names = {
    [TestType.PAGE_LOAD]: '页面加载',
    [TestType.COMPONENT_RENDER]: '组件渲染',
    [TestType.API_REQUESTS]: 'API请求',
    [TestType.MEMORY_USAGE]: '内存使用',
    [TestType.USER_INTERACTION]: '用户交互',
    [TestType.FPS]: 'FPS测试',
    [TestType.ALL_TESTS]: '所有测试'
  }
  return names[type] || type
}

const getStressTestTypeName = (type: string) => {
  const names = {
    array: '数组元素',
    object: '对象属性',
    dom: 'DOM元素'
  }
  return names[type] || type
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getMetricIcon = (metric: PerformanceMetric) => {
  // 简化的图标映射
  return Timer
}

const getMetricName = (metric: PerformanceMetric) => {
  const names = {
    [PerformanceMetric.PAGE_LOAD_TIME]: '页面加载时间',
    [PerformanceMetric.FPS]: '帧率',
    [PerformanceMetric.MEMORY_USAGE]: '内存使用',
    [PerformanceMetric.API_RESPONSE_TIME]: 'API响应时间'
  }
  return names[metric] || metric
}

const formatValue = (value: number, metric: PerformanceMetric) => {
  switch (metric) {
    case PerformanceMetric.PAGE_LOAD_TIME:
    case PerformanceMetric.API_RESPONSE_TIME:
      return `${value.toFixed(2)}ms`
    case PerformanceMetric.MEMORY_USAGE:
      return `${value.toFixed(2)}MB`
    case PerformanceMetric.FPS:
      return `${Math.round(value)}FPS`
    default:
      return value.toFixed(2)
  }
}

const getTrendText = (trend: 'improving' | 'worsening' | 'stable') => {
  return {
    improving: '改善',
    worsening: '恶化',
    stable: '稳定'
  }[trend]
}

// 清理方法
const cleanup = () => {
  console.log('cleanup方法被调用')
  
  // 清理定时器
  if (interval) {
    clearInterval(interval)
  }
  
  // 清理动态组件
  dynamicComponents.value = []
  
  // 清理测试结果
  results.value = []
  
  // 清理性能统计数据
  performanceStats.value = []
  
  // 重置测试状态
  isTesting.value = false
  testProgress.value = 0
  currentTest.value = null
}

// 生命周期
onMounted(() => {
  refreshMetrics()
  
  // 设置自动刷新
  interval = setInterval(() => {
    if (autoRefresh.value) {
      refreshMetrics()
    }
  }, 2000)
})

// 组件销毁时清理资源
onUnmounted(() => {
  cleanup()
})

// 使用defineExpose暴露cleanup方法给测试环境
defineExpose({
  cleanup: cleanup
})
</script>

<style scoped>
.performance-test {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #303133;
}

.description {
  color: #909399;
  margin: 0;
}

.test-controls {
  margin-bottom: 20px;
}

.test-results {
  margin-bottom: 20px;
}

.result-controls {
  display: flex;
  gap: 10px;
}

.live-monitoring {
  margin-bottom: 20px;
}

.monitoring-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.metric-card {
  transition: all 0.3s ease;
}

.metric-card.unhealthy {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.metric-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.metric-icon {
  font-size: 24px;
  margin-right: 15px;
}

.metric-info {
  flex: 1;
}

.metric-name {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-trend {
  font-size: 12px;
}

.metric-trend.improving {
  color: #67c23a;
}

.metric-trend.worsening {
  color: #f56c6c;
}

.metric-trend.stable {
  color: #909399;
}

.dynamic-components {
  margin-bottom: 20px;
}

.component-controls {
  display: flex;
  gap: 10px;
}

.component-card {
  margin-bottom: 20px;
}

.component-content {
  text-align: center;
}

.memory-stress-test {
  margin-bottom: 20px;
}

.stress-test-result {
  margin-top: 20px;
}
</style>