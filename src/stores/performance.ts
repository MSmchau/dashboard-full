import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PerformanceTestResult {
  id: string
  testType: 'PAGE_LOAD' | 'API_RESPONSE' | 'MEMORY_USAGE' | 'RENDERING' | 'BATCH'
  duration: number
  timestamp: number
  description: string
  details: Record<string, any>
  status?: 'success' | 'error' | 'running'
  errorMessage?: string
}

export interface PerformanceTestConfig {
  iterations: number
  timeout: number
  apiEndpoint: string
  memoryThreshold: number
  renderingThreshold: number
}

export const usePerformanceStore = defineStore('performance', () => {
  // 状态
  const testResults = ref<PerformanceTestResult[]>([])
  const isRunning = ref(false)
  const currentTest = ref<string | null>(null)
  const testConfig = ref<PerformanceTestConfig>({
    iterations: 5,
    timeout: 10000,
    apiEndpoint: '/api/test',
    memoryThreshold: 100,
    renderingThreshold: 16
  })

  // 计算属性
  const latestResults = computed(() => 
    testResults.value.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
  )

  const averageDuration = computed(() => {
    if (testResults.value.length === 0) return 0
    const total = testResults.value.reduce((sum, result) => sum + result.duration, 0)
    return Math.round(total / testResults.value.length)
  })

  const successRate = computed(() => {
    if (testResults.value.length === 0) return 0
    const successCount = testResults.value.filter(result => result.status === 'success').length
    return Math.round((successCount / testResults.value.length) * 100)
  })

  // 动作
  const runPageLoadTest = async (): Promise<PerformanceTestResult> => {
    const testId = `page_load_${Date.now()}`
    currentTest.value = testId
    isRunning.value = true

    try {
      const startTime = performance.now()
      
      // 模拟页面加载测试
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100))
      
      const duration = performance.now() - startTime
      
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'PAGE_LOAD',
        duration,
        timestamp: Date.now(),
        description: '页面加载性能测试',
        details: { startTime, endTime: performance.now() },
        status: 'success'
      }

      testResults.value.push(result)
      return result
    } catch (error) {
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'PAGE_LOAD',
        duration: 0,
        timestamp: Date.now(),
        description: '页面加载性能测试',
        details: { error },
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '未知错误'
      }

      testResults.value.push(result)
      throw error
    } finally {
      isRunning.value = false
      currentTest.value = null
    }
  }

  const runApiResponseTest = async (): Promise<PerformanceTestResult> => {
    const testId = `api_response_${Date.now()}`
    currentTest.value = testId
    isRunning.value = true

    try {
      const startTime = performance.now()
      
      // 模拟API响应测试
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
      
      const duration = performance.now() - startTime
      
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'API_RESPONSE',
        duration,
        timestamp: Date.now(),
        description: 'API响应性能测试',
        details: { 
          url: testConfig.value.apiEndpoint,
          status: 200,
          startTime,
          endTime: performance.now()
        },
        status: 'success'
      }

      testResults.value.push(result)
      return result
    } catch (error) {
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'API_RESPONSE',
        duration: 0,
        timestamp: Date.now(),
        description: 'API响应性能测试',
        details: { error },
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '未知错误'
      }

      testResults.value.push(result)
      throw error
    } finally {
      isRunning.value = false
      currentTest.value = null
    }
  }

  const runMemoryUsageTest = async (): Promise<PerformanceTestResult> => {
    const testId = `memory_usage_${Date.now()}`
    currentTest.value = testId
    isRunning.value = true

    try {
      const startTime = performance.now()
      
      // 模拟内存使用测试
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75))
      
      const duration = performance.now() - startTime
      
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'MEMORY_USAGE',
        duration,
        timestamp: Date.now(),
        description: '内存使用性能测试',
        details: { 
          startTime,
          endTime: performance.now(),
          memoryUsage: Math.random() * 50 + 50 // 模拟内存使用量
        },
        status: 'success'
      }

      testResults.value.push(result)
      return result
    } catch (error) {
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'MEMORY_USAGE',
        duration: 0,
        timestamp: Date.now(),
        description: '内存使用性能测试',
        details: { error },
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '未知错误'
      }

      testResults.value.push(result)
      throw error
    } finally {
      isRunning.value = false
      currentTest.value = null
    }
  }

  const runRenderingTest = async (): Promise<PerformanceTestResult> => {
    const testId = `rendering_${Date.now()}`
    currentTest.value = testId
    isRunning.value = true

    try {
      const startTime = performance.now()
      
      // 模拟渲染性能测试
      await new Promise(resolve => setTimeout(resolve, Math.random() * 80 + 40))
      
      const duration = performance.now() - startTime
      
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'RENDERING',
        duration,
        timestamp: Date.now(),
        description: '渲染性能测试',
        details: { 
          startTime,
          endTime: performance.now(),
          fps: Math.random() * 30 + 30 // 模拟FPS
        },
        status: 'success'
      }

      testResults.value.push(result)
      return result
    } catch (error) {
      const result: PerformanceTestResult = {
        id: testId,
        testType: 'RENDERING',
        duration: 0,
        timestamp: Date.now(),
        description: '渲染性能测试',
        details: { error },
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '未知错误'
      }

      testResults.value.push(result)
      throw error
    } finally {
      isRunning.value = false
      currentTest.value = null
    }
  }

  const runBatchTests = async (): Promise<PerformanceTestResult[]> => {
    const batchId = `batch_${Date.now()}`
    currentTest.value = batchId
    isRunning.value = true

    try {
      const results: PerformanceTestResult[] = []
      
      for (let i = 0; i < testConfig.value.iterations; i++) {
        const pageLoadResult = await runPageLoadTest()
        const apiResult = await runApiResponseTest()
        const memoryResult = await runMemoryUsageTest()
        const renderingResult = await runRenderingTest()
        
        results.push(pageLoadResult, apiResult, memoryResult, renderingResult)
      }

      return results
    } finally {
      isRunning.value = false
      currentTest.value = null
    }
  }

  const clearTestResults = (): void => {
    testResults.value = []
  }

  const exportTestReport = (): string => {
    const report = {
      timestamp: Date.now(),
      totalTests: testResults.value.length,
      averageDuration: averageDuration.value,
      successRate: successRate.value,
      results: testResults.value
    }
    
    return JSON.stringify(report, null, 2)
  }

  const updateTestConfig = (config: Partial<PerformanceTestConfig>): void => {
    testConfig.value = { ...testConfig.value, ...config }
  }

  return {
    // 状态
    testResults,
    isRunning,
    currentTest,
    testConfig,
    
    // 计算属性
    latestResults,
    averageDuration,
    successRate,
    
    // 动作
    runPageLoadTest,
    runApiResponseTest,
    runMemoryUsageTest,
    runRenderingTest,
    runBatchTests,
    clearTestResults,
    exportTestReport,
    updateTestConfig
  }
})