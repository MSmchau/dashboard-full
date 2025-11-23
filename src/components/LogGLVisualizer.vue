<template>
  <div class="loggl-visualizer">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="filter-section">
        <el-input
          v-model="searchKeyword"
          :placeholder="isRegexSearch ? '输入正则表达式...' : '搜索日志内容（支持多关键词）'"
          clearable
          size="small"
          style="width: 250px; margin-right: 10px;"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-tooltip content="切换正则表达式搜索" placement="top">
          <el-button
            :type="isRegexSearch ? 'primary' : 'default'"
            @click="isRegexSearch = !isRegexSearch"
            size="small"
            style="margin-right: 10px;"
          >
            <el-icon><Connection /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-select
          v-model="selectedLevels"
          multiple
          placeholder="日志级别"
          size="small"
          style="width: 150px; margin-right: 10px;"
        >
          <el-option label="全部" value="all" />
          <el-option label="信息" value="info" />
          <el-option label="警告" value="warning" />
          <el-option label="错误" value="error" />
          <el-option label="严重" value="critical" />
        </el-select>
        
        <el-date-picker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          size="small"
          style="width: 280px; margin-right: 10px;"
        />
        
        <el-button size="small" @click="clearFilters">重置</el-button>
        
        <!-- 正则表达式错误提示 -->
        <el-alert
          v-if="regexError"
          :title="regexError"
          type="error"
          :closable="false"
          show-icon
          size="small"
          style="width: auto; margin-right: 10px;"
        />
      </div>
      
      <div class="action-section">
          <!-- 实时流控制 -->
          <el-button 
            size="small" 
            :type="isStreaming ? 'danger' : 'success'"
            @click="toggleStreaming"
          >
            <el-icon>{{ isStreaming ? 'VideoPause' : 'VideoPlay' }}</el-icon>
            {{ isStreaming ? '暂停' : '开始' }}
          </el-button>
          
          <el-select 
            v-model="streamSpeed" 
            size="small" 
            style="width: 120px"
            @change="changeStreamSpeed"
          >
            <el-option label="快速 (500ms)" :value="500" />
            <el-option label="标准 (1000ms)" :value="1000" />
            <el-option label="慢速 (2000ms)" :value="2000" />
            <el-option label="极慢 (5000ms)" :value="5000" />
          </el-select>
          
          <el-button size="small" @click="toggleAutoScroll" :type="autoScroll ? 'primary' : ''">
            {{ autoScroll ? '暂停滚动' : '自动滚动' }}
          </el-button>
          <el-button size="small" @click="exportLogs">导出</el-button>
          <el-button size="small" @click="clearAllLogs">清空</el-button>
          <el-button size="small" @click="cleanupOldData">清理旧数据</el-button>
          <el-button size="small" @click="exportMemoryStats">内存统计</el-button>
        </div>
    </div>
    
    <!-- 统计信息 -->
    <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-label">总日志数:</span>
        <span class="stat-value">{{ totalLogs }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">信息:</span>
        <span class="stat-value info">{{ levelCounts.info }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">警告:</span>
        <span class="stat-value warning">{{ levelCounts.warning }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">错误:</span>
        <span class="stat-value error">{{ levelCounts.error }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">严重:</span>
        <span class="stat-value critical">{{ levelCounts.critical }}</span>
      </div>
    </div>
    
    <!-- 日志可视化区域 -->
    <div class="visualization-area">
      <!-- 时间轴视图 -->
      <div class="timeline-view">
        <div class="timeline-header">
          <h4>日志时间分布</h4>
        </div>
        <div ref="timelineChart" class="timeline-chart"></div>
      </div>
      
      <!-- 日志列表 -->
      <div class="log-list-view">
        <div class="log-list-header">
          <h4>日志详情</h4>
          <span class="log-count">显示 {{ filteredLogs.length }} 条日志</span>
        </div>
        <div 
          ref="logListContainer" 
          class="log-list-container"
          @scroll="handleScroll"
        >
          <div class="log-list" :style="{ height: filteredLogs.length * itemHeight + 'px' }">
            <div class="log-list-inner" :style="{ transform: `translateY(${visibleOffset}px)` }">
              <div 
                v-for="log in visibleLogs" 
                :key="log.id" 
                class="log-item"
                :class="`log-level-${log.level}`"
                :style="{ height: itemHeight + 'px' }"
              >
                <div class="log-time">{{ formatTime(log.timestamp) }}</div>
                <div class="log-level-badge" :class="log.level">
                  {{ getLevelText(log.level) }}
                </div>
                <div class="log-message" v-html="highlightKeywords(log.message)"></div>
                <div class="log-source">{{ log.source || '未知来源' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 加载更多指示器 -->
    <div v-if="hasMoreLogs" class="load-more">
      <el-button @click="loadMoreLogs" :loading="loadingMore">
        加载更多日志
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Search, Connection, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 防抖函数
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 日志数据类型定义
interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  source?: string
  tags?: string[]
}

// 响应式数据
const logs = ref<LogEntry[]>([])
const searchKeyword = ref('')
const selectedLevels = ref<string[]>(['all'])
const timeRange = ref<[Date, Date] | null>(null)
const autoScroll = ref(true)
const loadingMore = ref(false)
const hasMoreLogs = ref(false)

// 虚拟滚动相关
const logListContainer = ref<HTMLElement>()
const visibleStartIndex = ref(0)
const visibleCount = ref(50)
const itemHeight = 40 // 预估每个日志项的高度
const bufferSize = 10 // 缓冲区大小，用于平滑滚动

// ECharts实例
let timelineChart: echarts.ECharts | null = null

// 缓存机制
 let lastFilterCache: { 
   levels: string[], 
   keyword: string, 
   useRegex: boolean,
   dataLength: number 
 } | null = null
 let cachedFilteredLogs: LogEntry[] = []
 
 // 计算属性
 const filteredLogs = computed(() => {
   const currentFilter = {
     levels: [...selectedLevels.value].sort(),
     keyword: searchKeyword.value.trim().toLowerCase(),
     useRegex: useRegex.value,
     dataLength: logData.value.length
   }
  
  // 检查缓存是否有效
  if (lastFilterCache && 
      JSON.stringify(lastFilterCache) === JSON.stringify(currentFilter)) {
    return cachedFilteredLogs
  }
  
  let result = logs.value
  
  // 按级别过滤
  if (selectedLevels.value.length > 0 && !selectedLevels.value.includes('all')) {
    result = result.filter(log => selectedLevels.value.includes(log.level))
  }
  
  // 按时间范围过滤
  if (timeRange.value) {
    const [start, end] = timeRange.value
    result = result.filter(log => log.timestamp >= start.getTime() && log.timestamp <= end.getTime())
  }
  
  // 按关键词过滤（支持多关键词和正则表达式）
  if (searchKeyword.value) {
    if (isRegexSearch.value) {
      result = filterByRegex(result)
    } else {
      result = filterByKeywords(result)
    }
  }
  
  // 更新缓存
  lastFilterCache = currentFilter
  cachedFilteredLogs = result
  
  return result
})

const visibleLogs = computed(() => {
  const start = Math.max(0, visibleStartIndex.value - bufferSize)
  const end = Math.min(filteredLogs.value.length, visibleStartIndex.value + visibleCount.value + bufferSize)
  return filteredLogs.value.slice(start, end)
})

// 计算可见区域的高度偏移
const visibleOffset = computed(() => {
  return Math.max(0, visibleStartIndex.value - bufferSize) * itemHeight
})

const totalLogs = computed(() => logs.value.length)

const levelCounts = computed(() => {
  const counts = { info: 0, warning: 0, error: 0, critical: 0 }
  logs.value.forEach(log => {
    counts[log.level]++
  })
  return counts
})

// 方法
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
    critical: '严重'
  }
  return levelMap[level] || level
}

const highlightKeywords = (message: string) => {
  if (!searchKeyword.value) return message
  
  const keyword = searchKeyword.value
  // 转义正则特殊字符
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  return message.replace(regex, '<mark class="keyword-highlight">$1</mark>')
}

// 增强过滤功能：支持多关键词搜索
const filterByKeywords = (logs: LogEntry[]) => {
  if (!searchKeyword.value) return logs
  
  const keywords = searchKeyword.value.split(/\s+/).filter(k => k.trim())
  if (keywords.length === 0) return logs
  
  return logs.filter(log => {
    const searchText = `${log.message} ${log.source}`.toLowerCase()
    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()))
  })
}

// 高级过滤：支持正则表达式搜索
const isRegexSearch = ref(false)
const regexError = ref('')

const filterByRegex = (logs: LogEntry[]) => {
  if (!searchKeyword.value || !isRegexSearch.value) return logs
  
  try {
    const regex = new RegExp(searchKeyword.value, 'gi')
    regexError.value = ''
    return logs.filter(log => regex.test(log.message) || regex.test(log.source))
  } catch (error) {
    regexError.value = '正则表达式格式错误'
    return logs
  }
}

const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (logListContainer.value) {
      logListContainer.value.scrollTop = logListContainer.value.scrollHeight
    }
  })
}

// 滚动防抖处理
let scrollTimeout: number | null = null

const handleScroll = () => {
  if (!logListContainer.value) return
  
  // 防抖处理，避免频繁触发
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  
  scrollTimeout = setTimeout(() => {
    const { scrollTop, scrollHeight, clientHeight } = logListContainer.value!
    
    // 精确计算可见区域索引
    const scrollPosition = scrollTop + clientHeight / 2
    const totalHeight = scrollHeight
    const scrollRatio = scrollPosition / totalHeight
    
    const totalItems = filteredLogs.value.length
    const newStartIndex = Math.floor(scrollRatio * totalItems) - Math.floor(visibleCount.value / 2)
    
    // 限制索引范围
    visibleStartIndex.value = Math.max(0, Math.min(newStartIndex, totalItems - visibleCount.value))
    
    // 检查是否需要加载更多（接近底部时）
    const distanceToBottom = scrollHeight - scrollTop - clientHeight
    if (distanceToBottom < 200 && hasMoreLogs.value && !loadingMore.value) {
      loadMoreLogs()
    }
  }, 16) // 约60fps的更新频率
}

const loadMoreLogs = async () => {
  if (loadingMore.value) return
  
  loadingMore.value = true
  
  // 模拟加载更多数据
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const newLogs: LogEntry[] = generateMockLogs(50)
  logs.value = [...logs.value, ...newLogs]
  
  loadingMore.value = false
  hasMoreLogs.value = logs.value.length < 1000 // 假设最多1000条日志
}

const clearFilters = () => {
  searchKeyword.value = ''
  selectedLevels.value = ['all']
  timeRange.value = null
}

const exportLogs = async () => {
  if (!filteredLogs.value.length) {
    ElMessage.warning('没有可导出的日志数据');
    return;
  }

  try {
    // 使用导出工具函数
    const { exportToExcel, exportToCSV } = await import('@/utils/export-utils');
    
    // 导出为Excel格式
    await exportToExcel(
      filteredLogs.value, 
      '系统日志数据', 
      ['时间戳', '日志级别', '日志内容']
    );
    
    ElMessage.success('日志导出成功');
  } catch (error) {
    console.error('导出日志失败:', error);
    ElMessage.error('日志导出失败');
  }
}

const clearAllLogs = () => {
  logs.value = []
  visibleStartIndex.value = 0
}

// 清理旧数据
 const cleanupOldData = () => {
   if (logData.value.length > MAX_LOG_COUNT * 0.5) {
     // 保留最近50%的数据
     const keepCount = Math.floor(MAX_LOG_COUNT * 0.5)
     logData.value = logData.value.slice(-keepCount)
     console.log(`已清理旧数据，保留最近${keepCount}条日志`)
   }
 }

 // 导出内存统计信息
 const exportMemoryStats = async () => {
   try {
     const stats = memoryMonitor.getStats()
     const statsData = {
       uptime: stats.uptime,
       maxLogCount: stats.maxLogCount,
       currentLogCount: stats.currentLogCount,
       cacheHitRate: stats.cacheHitRate,
       cleanupTime: new Date().toLocaleString()
     };

     // 使用导出工具函数
     const { exportToExcel } = await import('@/utils/export-utils');
     
     // 导出为Excel格式
     await exportToExcel(
       [statsData], 
       '内存统计信息', 
       ['运行时间(秒)', '最大日志数', '当前日志数', '缓存命中率(%)', '统计时间']
     );
     
     ElMessage.success('内存统计导出成功');
   } catch (error) {
     console.error('导出内存统计失败:', error);
     ElMessage.error('内存统计导出失败');
   }
 }

// 图表数据聚合和懒加载
const chartDataCache = new Map()
const CHART_DATA_POINTS_LIMIT = 100 // 限制图表数据点数量

// 智能时间聚合函数
const aggregateChartData = (logs: LogEntry[]) => {
  const cacheKey = JSON.stringify({
    count: logs.length,
    levels: [...new Set(logs.map(log => log.level))].sort()
  })
  
  // 检查缓存
  if (chartDataCache.has(cacheKey)) {
    return chartDataCache.get(cacheKey)
  }
  
  // 根据数据量决定聚合粒度
  const dataPoints = Math.min(logs.length, CHART_DATA_POINTS_LIMIT)
  const aggregationInterval = Math.max(1, Math.floor(logs.length / dataPoints))
  
  const aggregatedData: any[] = []
  const levelCounts: { [key: string]: number } = {}
  
  // 按时间窗口聚合数据
  logs.forEach((log, index) => {
    const time = new Date(log.timestamp)
    const windowIndex = Math.floor(index / aggregationInterval)
    
    if (!aggregatedData[windowIndex]) {
      aggregatedData[windowIndex] = {
        time: time.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        INFO: 0,
        WARNING: 0,
        ERROR: 0,
        CRITICAL: 0
      }
    }
    
    aggregatedData[windowIndex][log.level]++
    levelCounts[log.level] = (levelCounts[log.level] || 0) + 1
  })
  
  const result = {
    data: aggregatedData.filter(Boolean),
    levelCounts
  }
  
  // 缓存结果
  chartDataCache.set(cacheKey, result)
  
  // 限制缓存大小
  if (chartDataCache.size > 10) {
    const firstKey = chartDataCache.keys().next().value
    chartDataCache.delete(firstKey)
  }
  
  return result
}

// 窗口大小调整防抖函数
const debouncedResize = debounce(() => {
  timelineChart?.resize()
}, 250)

// 初始化时间轴图表（优化版）
const initTimelineChart = () => {
  if (!logListContainer.value) return
  
  const chartDom = document.createElement('div')
  chartDom.style.width = '100%'
  chartDom.style.height = '200px'
  
  const timelineView = document.querySelector('.timeline-chart')
  if (timelineView) {
    timelineView.appendChild(chartDom)
    timelineChart = echarts.init(chartDom)
    
    const updateChart = () => {
      if (!timelineChart) return
      
      // 使用智能聚合
      const { data: timeData, levelCounts } = aggregateChartData(filteredLogs.value)
      
      // 只显示有数据的级别
      const availableLevels = Object.keys(levelCounts).filter(level => levelCounts[level] > 0)
      
      const option = {
        animation: timeData.length < 50, // 数据量少时启用动画
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: availableLevels
        },
        xAxis: {
          type: 'category',
          data: timeData.map(item => item.time),
          axisLabel: {
            interval: Math.max(1, Math.floor(timeData.length / 10)) // 动态调整标签间隔
          }
        },
        yAxis: {
          type: 'value'
        },
        series: availableLevels.map(level => ({
          name: level,
          type: 'line',
          data: timeData.map(item => item[level] || 0),
          smooth: timeData.length < 30, // 数据点少时启用平滑
          lineStyle: { 
            color: {
              'info': '#1890ff',
              'warning': '#faad14',
              'error': '#ff4d4f',
              'critical': '#cf1322'
            }[level] || '#666'
          },
          itemStyle: { 
            color: {
              'info': '#1890ff',
              'warning': '#faad14',
              'error': '#ff4d4f',
              'critical': '#cf1322'
            }[level] || '#666'
          }
        }))
      }
      
      timelineChart.setOption(option, { notMerge: true })
    }
    
    // 使用防抖监听数据变化
    const debouncedUpdate = debounce(updateChart, 300)
    watch(filteredLogs, debouncedUpdate, { deep: true })
    
    // 初始更新
    updateChart()
    
    // 响应式调整（带防抖）
    window.addEventListener('resize', debouncedResize)
  }
}

const updateTimelineChart = () => {
  if (!timelineChart) return
  
  // 按时间分组统计
  const timeGroups: Record<string, { info: number, warning: number, error: number, critical: number }> = {}
  
  filteredLogs.value.forEach(log => {
    const timeKey = new Date(log.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = { info: 0, warning: 0, error: 0, critical: 0 }
    }
    
    timeGroups[timeKey][log.level]++
  })
  
  const timeKeys = Object.keys(timeGroups).sort()
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['信息', '警告', '错误', '严重']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeKeys
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '信息',
        type: 'bar',
        stack: 'total',
        data: timeKeys.map(key => timeGroups[key].info),
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '警告',
        type: 'bar',
        stack: 'total',
        data: timeKeys.map(key => timeGroups[key].warning),
        itemStyle: { color: '#faad14' }
      },
      {
        name: '错误',
        type: 'bar',
        stack: 'total',
        data: timeKeys.map(key => timeGroups[key].error),
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: '严重',
        type: 'bar',
        stack: 'total',
        data: timeKeys.map(key => timeGroups[key].critical),
        itemStyle: { color: '#cf1322' }
      }
    ]
  }
  
  timelineChart.setOption(option)
}

// 节流函数
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 实时日志流队列
const logQueue: LogEntry[] = []
let isProcessingQueue = false

// 处理日志队列
const processLogQueue = () => {
  if (isProcessingQueue || logQueue.length === 0) return
  
  isProcessingQueue = true
  
  // 批量处理队列中的日志（最多100条）
  const batchSize = Math.min(100, logQueue.length)
  const batch = logQueue.splice(0, batchSize)
  
  // 批量添加到日志数据
   logData.value = [...logData.value, ...batch]
   
   // 限制日志数量
   if (logData.value.length > MAX_LOG_COUNT) {
     logData.value = logData.value.slice(-MAX_LOG_COUNT)
   }
  
  isProcessingQueue = false
  
  // 如果队列中还有数据，继续处理
  if (logQueue.length > 0) {
    setTimeout(processLogQueue, 50)
  }
}

// 节流版的日志添加函数
const throttledAddLog = throttle((log: LogEntry) => {
  logQueue.push(log)
  processLogQueue()
}, 100) // 每100ms最多处理一次

// 模拟实时日志流（优化版）
 const startRealTimeLogStream = () => {
   if (realTimeInterval.value) {
     clearInterval(realTimeInterval.value)
   }
   
   realTimeInterval.value = setInterval(() => {
     const newLog: LogEntry = {
       id: Date.now() + Math.random(),
       timestamp: new Date(),
       level: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'][Math.floor(Math.random() * 4)],
       message: `实时日志消息 ${Math.random().toString(36).substr(2, 5)}`,
       source: '实时流'
     }
     
     // 使用节流函数添加日志
     throttledAddLog(newLog)
   }, 500) // 降低生成频率，提高性能
 }

// 模拟日志数据生成
const generateMockLogs = (count: number): LogEntry[] => {
  const levels: Array<'info' | 'warning' | 'error' | 'critical'> = ['info', 'warning', 'error', 'critical']
  const sources = ['设备A-001', '设备A-002', '设备B-001', '系统服务', '网络模块']
  const messages = [
    '设备启动完成',
    'CPU温度过高',
    '内存使用率超过阈值',
    '数据同步完成',
    '网络连接中断',
    '磁盘空间不足',
    '服务重启成功',
    '检测到异常流量',
    '备份任务完成',
    '系统资源紧张'
  ]
  
  const now = Date.now()
  const logs: LogEntry[] = []
  
  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]
    
    // 生成时间戳（最近24小时内）
    const timestamp = now - Math.random() * 24 * 60 * 60 * 1000
    
    logs.push({
      id: `log_${now}_${i}`,
      timestamp,
      level,
      message: `${message} (${Math.random().toString(36).substring(2, 8)})`,
      source
    })
  }
  
  return logs.sort((a, b) => a.timestamp - b.timestamp)
}

// 监听日志变化，更新图表
watch([filteredLogs, logData], () => {
  updateTimelineChart()
  
  if (autoScroll.value) {
    scrollToBottom()
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  // 初始化模拟数据
  logs.value = generateMockLogs(100)
  
  // 初始化图表
  nextTick(() => {
    initTimelineChart()
  })
  
  // 启动实时日志流
  startStreaming()
  
  // 内存使用监控
   const memoryMonitor = {
     startTime: Date.now(),
     maxLogCount: 0,
     
     update() {
       this.maxLogCount = Math.max(this.maxLogCount, logData.value.length)
       
       // 如果日志数量超过阈值，触发清理
       if (logData.value.length > MAX_LOG_COUNT * 0.8) {
         console.warn('日志数量接近上限，建议清理旧数据')
       }
     },
     
     getStats() {
       const uptime = Date.now() - this.startTime
       return {
         uptime: Math.round(uptime / 1000),
         maxLogCount: this.maxLogCount,
         currentLogCount: logData.value.length,
         cacheHitRate: chartDataCache.size > 0 ? Math.round((chartDataCache.size / this.maxLogCount) * 100) : 0
       }
     }
   }

  // 定期内存检查
  const memoryCheckInterval = setInterval(() => {
    memoryMonitor.update()
    
    // 每5分钟输出一次内存统计
    if (Date.now() - memoryMonitor.startTime > 5 * 60 * 1000) {
      const stats = memoryMonitor.getStats()
      console.log('内存使用统计:', stats)
      memoryMonitor.startTime = Date.now() // 重置计时器
    }
  }, 30000) // 每30秒检查一次

  onUnmounted(() => {
    // 清理内存监控
    clearInterval(memoryCheckInterval)
    
    // 清理实时流
    if (realTimeInterval.value) {
      clearInterval(realTimeInterval.value)
      realTimeInterval.value = null
    }
    
    // 清理ECharts实例
    if (timelineChart) {
      timelineChart.dispose()
      timelineChart = null
    }
    
    // 清理滚动事件监听器
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
      scrollTimeout = null
    }
    
    // 清理日志队列
    logQueue.length = 0
    isProcessingQueue = false
    
    // 清理缓存
    lastFilterCache = null
    cachedFilteredLogs = []
    chartDataCache.clear()
    
    // 清理窗口事件监听器
    window.removeEventListener('resize', debouncedResize)
    
    console.log('组件已完全清理，内存已释放')
  })
})
</script>

<style scoped>
.loggl-visualizer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
}

.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-section {
  display: flex;
  gap: 8px;
}

.stats-panel {
  display: flex;
  gap: 20px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-weight: bold;
  font-size: 14px;
}

.stat-value.info { color: #1890ff; }
.stat-value.warning { color: #faad14; }
.stat-value.error { color: #ff4d4f; }
.stat-value.critical { color: #cf1322; }

.visualization-area {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.timeline-view, .log-list-view {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.timeline-header, .log-list-header {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline-header h4, .log-list-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
}

.log-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.timeline-chart {
  flex: 1;
  min-height: 200px;
}

.log-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  position: relative;
}

.log-list {
  position: relative;
}

.log-list-inner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
  transition: transform 0.1s ease-out;
}

.log-item {
  display: grid;
  grid-template-columns: 80px 60px 1fr 100px;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
  transition: background-color 0.2s;
}

.log-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.log-item.log-level-info {
  background: rgba(24, 144, 255, 0.1);
  border-left: 3px solid #1890ff;
}

.log-item.log-level-warning {
  background: rgba(250, 173, 20, 0.1);
  border-left: 3px solid #faad14;
}

.log-item.log-level-error {
  background: rgba(255, 77, 79, 0.1);
  border-left: 3px solid #ff4d4f;
}

.log-item.log-level-critical {
  background: rgba(207, 19, 34, 0.1);
  border-left: 3px solid #cf1322;
}

.log-time {
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.log-level-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  text-align: center;
}

.log-level-badge.info {
  background: rgba(24, 144, 255, 0.2);
  color: #1890ff;
}

.log-level-badge.warning {
  background: rgba(250, 173, 20, 0.2);
  color: #faad14;
}

.log-level-badge.error {
  background: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
}

.log-level-badge.critical {
  background: rgba(207, 19, 34, 0.2);
  color: #cf1322;
}

.log-message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message :deep(.keyword-highlight) {
  background: linear-gradient(135deg, #ffec3d, #ffd700);
  color: #000;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: bold;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  animation: highlight-pulse 2s infinite;
}

@keyframes highlight-pulse {
  0%, 100% { 
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 2px 6px rgba(255, 236, 61, 0.5);
    transform: scale(1.02);
  }
}

/* 多关键词高亮样式 */
.log-message :deep(.keyword-highlight:nth-child(2n)) {
  background: linear-gradient(135deg, #91d5ff, #69c0ff);
}

.log-message :deep(.keyword-highlight:nth-child(3n)) {
  background: linear-gradient(135deg, #b7eb8f, #95de64);
}

.log-source {
  color: var(--text-secondary);
  font-size: 11px;
  text-align: right;
}

.load-more {
  padding: 16px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 1200px) {
  .visualization-area {
    grid-template-columns: 1fr;
    grid-template-rows: 200px 1fr;
  }
  
  .log-item {
    grid-template-columns: 70px 50px 1fr 80px;
  }
}
</style>