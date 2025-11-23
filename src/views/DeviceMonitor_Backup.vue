<template>
  <div class="device-monitor-container">
    <!-- 页面加载状态 -->
    <div v-if="isPageLoading" class="page-loading-overlay">
      <div class="loading-content">
        <LoadingSpinner size="large" />
        <p class="loading-text">正在加载设备监控界面...</p>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div v-else class="monitor-content">
      <!-- 页面错误状态 -->
      <div v-if="pageError" class="page-error-overlay">
        <ErrorState 
          :title="pageError.title" 
          :message="pageError.message"
          :show-retry="true"
          @retry="initializePage"
        />
      </div>

      <!-- 正常内容 -->
      <div v-else class="monitor-grid">
        <!-- 左侧设备列表面板 -->
        <div class="device-list-panel" :class="{ 'collapsed': selectedDevice }">
          <div class="panel-header">
            <h3 class="panel-title">
              <el-icon class="title-icon"><Monitor /></el-icon>
              设备列表
            </h3>
            <div class="search-box">
              <el-input
                v-model="searchQuery"
                placeholder="搜索设备..."
                :prefix-icon="Search"
                size="small"
                clearable
                @input="handleSearch"
              />
            </div>
          </div>
          
          <div class="device-tree-container">
            <el-tree
              ref="deviceTreeRef"
              :data="deviceTreeData"
              :props="treeProps"
              :filter-node-method="filterDeviceTree"
              :default-expanded-keys="['factory', 'workshop-1', 'workshop-2']"
              node-key="id"
              highlight-current
              @node-click="handleDeviceSelect"
              class="device-tree"
            >
              <template #default="{ data }">
                <div class="tree-node" :class="`status-${data.status}`">
                  <span class="node-icon" :class="getDeviceIcon(data.type)"></span>
                  <span class="node-label">{{ data.label }}</span>
                  <span class="node-status" :class="data.status">{{ getStatusText(data.status) }}</span>
                </div>
              </template>
            </el-tree>
          </div>

          <!-- 设备状态统计 -->
          <div class="device-stats">
            <div class="stat-item">
              <span class="stat-label">在线设备</span>
              <span class="stat-value online">{{ onlineDevicesCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">异常设备</span>
              <span class="stat-value warning">{{ abnormalDevicesCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">离线设备</span>
              <span class="stat-value offline">{{ offlineDevicesCount }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧详情面板 -->
        <div class="device-detail-panel" v-if="selectedDevice">
          <div class="detail-header">
            <h3 class="detail-title">{{ selectedDevice.label }}</h3>
            <div class="detail-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="exportDeviceData"
                :loading="isExporting"
              >
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="showAnomalyAnalysis"
                :disabled="!selectedDevice.hasAnomaly"
              >
                <el-icon><Warning /></el-icon>
                异常分析
              </el-button>
            </div>
          </div>

          <!-- 设备基本信息 -->
          <div class="device-basic-info">
            <div class="info-row">
              <span class="info-label">设备ID:</span>
              <span class="info-value">{{ selectedDevice.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">设备类型:</span>
              <span class="info-value">{{ getDeviceTypeText(selectedDevice.type) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">安装位置:</span>
              <span class="info-value">{{ selectedDevice.location }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">运行时间:</span>
              <span class="info-value">{{ selectedDevice.uptime }}</span>
            </div>
          </div>

          <!-- 3D数字孪生区域 -->
          <div class="three-container-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><Box /></el-icon>
                3D数字孪生
              </h4>
              <div class="view-controls">
                <el-button-group size="small">
                  <el-button @click="reset3DView" :disabled="!threeSceneReady">
                    <el-icon><Refresh /></el-icon>
                    重置视角
                  </el-button>
                  <el-button @click="toggleWireframe" :disabled="!threeSceneReady">
                    <el-icon><View /></el-icon>
                    线框模式
                  </el-button>
                  <el-button @click="capture3DScreenshot" :disabled="!threeSceneReady">
                    <el-icon><Camera /></el-icon>
                    截图
                  </el-button>
                </el-button-group>
              </div>
            </div>
            
            <div class="three-container" ref="threeContainer">
              <!-- Three.js内容将在这里渲染 -->
              <div v-if="!threeSceneReady" class="three-loading">
                <LoadingSpinner size="medium" />
                <p>正在加载3D场景...</p>
              </div>
              <div v-else-if="threeError" class="three-error">
                <ErrorState 
                  :title="'3D场景加载失败'"
                  :message="threeError"
                  :show-retry="true"
                  @retry="initializeThreeScene"
                />
              </div>
            </div>
          </div>

          <!-- 实时指标区域 -->
          <div class="realtime-metrics-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><TrendCharts /></el-icon>
                实时指标
              </h4>
              <div class="time-range-selector">
                <el-select v-model="timeRange" size="small" @change="handleTimeRangeChange">
                  <el-option label="最近5分钟" value="5m" />
                  <el-option label="最近15分钟" value="15m" />
                  <el-option label="最近1小时" value="1h" />
                  <el-option label="最近6小时" value="6h" />
                </el-select>
              </div>
            </div>

            <div class="metrics-grid">
              <div 
                v-for="metric in realtimeMetrics" 
                :key="metric.key" 
                class="metric-card"
                :class="`status-${metric.status}`"
              >
                <div class="metric-header">
                  <span class="metric-name">{{ metric.name }}</span>
                  <span class="metric-status" :class="metric.status">{{ metric.statusText }}</span>
                </div>
                <div class="metric-value">
                  {{ metric.value }}{{ metric.unit }}
                </div>
                <div class="metric-trend">
                  <el-progress 
                    :percentage="metric.trend" 
                    :status="metric.status === 'normal' ? 'success' : metric.status === 'warning' ? 'warning' : 'exception'"
                    :show-text="false"
                    :stroke-width="6"
                  />
                </div>
                <div class="metric-update-time">
                  更新: {{ metric.updateTime }}
                </div>
              </div>
            </div>
          </div>

          <!-- 健康度评分区域 -->
          <div class="health-score-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><Opportunity /></el-icon>
                健康度评分
              </h4>
            </div>
            
            <HealthScoreCard 
              :score="healthScore" 
              :details="healthScoreDetails"
              :loading="isCalculatingScore"
            />
          </div>

          <!-- 历史趋势区域 -->
          <div class="historical-trends-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><DataLine /></el-icon>
                历史趋势
              </h4>
              <div class="chart-controls">
                <el-button-group size="small">
                  <el-button 
                    v-for="type in chartTypes" 
                    :key="type.value"
                    :type="selectedChartType === type.value ? 'primary' : ''"
                    @click="selectedChartType = type.value"
                  >
                    {{ type.label }}
                  </el-button>
                </el-button-group>
              </div>
            </div>

            <div class="chart-container" ref="chartContainer">
              <div v-if="chartLoading" class="chart-loading">
                <LoadingSpinner size="medium" />
                <p>正在加载历史数据...</p>
              </div>
              <div v-else-if="chartError" class="chart-error">
                <ErrorState 
                  :title="'历史数据加载失败'"
                  :message="chartError"
                  :show-retry="true"
                  @retry="loadHistoricalData"
                />
              </div>
              <!-- 图表将在这里渲染 -->
            </div>
          </div>

          <!-- 设备日志区域 -->
          <div class="device-logs-section">
            <div class="section-header">
              <h4 class="section-title">
                <el-icon><Document /></el-icon>
                设备日志
              </h4>
              <div class="log-controls">
                <el-button-group size="small">
                  <el-button 
                    :type="logViewMode === 'basic' ? 'primary' : ''"
                    @click="logViewMode = 'basic'"
                  >
                    基础视图
                  </el-button>
                  <el-button 
                    :type="logViewMode === 'advanced' ? 'primary' : ''"
                    @click="logViewMode = 'advanced'"
                  >
                    高级视图
                  </el-button>
                </el-button-group>
              </div>
            </div>

            <div class="logs-container" v-if="selectedDevice">
              <!-- 基础日志视图 -->
              <div v-if="logViewMode === 'basic'" class="basic-logs-view">
                <div class="log-header">
                  <el-select v-model="logLevel" size="small" style="width: 120px">
                    <el-option label="全部级别" value="all" />
                    <el-option label="错误" value="error" />
                    <el-option label="警告" value="warning" />
                    <el-option label="信息" value="info" />
                    <el-option label="调试" value="debug" />
                  </el-select>
                  <el-button 
                    size="small" 
                    @click="refreshLogs"
                    :loading="isRefreshingLogs"
                  >
                    <el-icon><Refresh /></el-icon>
                    刷新
                  </el-button>
                </div>
                <div class="log-list-container">
                  <div 
                    v-for="log in filteredLogs" 
                    :key="log.id"
                    class="log-item"
                    :class="`level-${log.level}`"
                  >
                    <span class="log-time">{{ log.timestamp }}</span>
                    <span class="log-level">{{ log.level.toUpperCase() }}</span>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                </div>
              </div>

              <!-- 高级日志视图 (LogGL) -->
              <div v-else-if="logViewMode === 'advanced'" class="advanced-logs-view">
                <LogGLVisualizer 
                  :device-id="selectedDevice.id"
                  :logs="deviceLogs"
                  :loading="isLoadingLogs"
                  :error="logError"
                  @error="handleLogError"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 无选中设备状态 -->
        <div v-else class="no-device-selected">
          <div class="empty-state">
            <el-icon class="empty-icon"><Monitor /></el-icon>
            <h3 class="empty-title">请选择要监控的设备</h3>
            <p class="empty-description">
              从左侧设备列表中选择一个设备来查看详细的监控信息和实时数据
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 异常分析弹窗 -->
    <AnomalyAnalysisModal
      v-model="anomalyModalVisible"
      :device="selectedDevice"
      :analysis-data="anomalyAnalysisData"
      :loading="isAnalyzingAnomaly"
      @analyzed="handleAnomalyAnalyzed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 
  Monitor, 
  Search, 
  Download, 
  Warning, 
  Box, 
  Refresh, 
  View, 
  Camera,
  TrendCharts,
  Opportunity,
  DataLine,
  Document
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 组件导入
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'
import HealthScoreCard from '@/components/HealthScoreCard.vue'
import LogGLVisualizer from '@/components/LogGLVisualizer.vue'
import AnomalyAnalysisModal from '@/components/AnomalyAnalysisModal.vue'

// 工具函数导入
import { loadThree } from '@/utils/three-loader'
import { exportToCSV } from '@/utils/export-utils'
import { debounce } from '@/utils/debounce'

// 接口定义
interface Device {
  id: string
  label: string
  type: string
  status: 'online' | 'offline' | 'warning' | 'error'
  location: string
  uptime: string
  hasAnomaly?: boolean
  children?: Device[]
}

interface RealtimeMetric {
  key: string
  name: string
  value: string | number
  unit: string
  status: 'normal' | 'warning' | 'error'
  statusText: string
  trend: number
  updateTime: string
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info' | 'debug'
  message: string
}

// 响应式数据
const isPageLoading = ref(true)
const pageError = ref<{ title: string; message: string } | null>(null)
const selectedDevice = ref<Device | null>(null)
const deviceTreeRef = ref()
const searchQuery = ref('')
const timeRange = ref('1h')

// Three.js 相关
const threeContainer = ref<HTMLElement>()
const threeSceneReady = ref(false)
const threeError = ref<string | null>(null)

// 图表相关
const chartContainer = ref<HTMLElement>()
const selectedChartType = ref('temperature')
const chartTypes = [
  { label: '温度', value: 'temperature' },
  { label: '压力', value: 'pressure' },
  { label: '振动', value: 'vibration' },
  { label: '电流', value: 'current' }
]
const chartLoading = ref(false)
const chartError = ref<string | null>(null)

// 日志相关
const logViewMode = ref<'basic' | 'advanced'>('basic')
const logLevel = ref('all')
const isRefreshingLogs = ref(false)
const isLoadingLogs = ref(false)
const logError = ref<string | null>(null)

// 其他状态
const isExporting = ref(false)
const isCalculatingScore = ref(false)
const anomalyModalVisible = ref(false)
const isAnalyzingAnomaly = ref(false)
let threeScene: any = null
let threeCamera: any = null
let threeRenderer: any = null

// 树形控件属性
const treeProps = {
  children: 'children',
  label: 'label',
  isLeaf: (data: Device) => !data.children || data.children.length === 0
}

// 设备树数据
const deviceTreeData = ref<Device[]>([
  {
    id: 'factory',
    label: '智能制造工厂',
    type: 'factory',
    status: 'online',
    location: '工厂主园区',
    uptime: '连续运行 2年3个月',
    children: [
      {
        id: 'workshop-1',
        label: '生产车间A',
        type: 'workshop',
        status: 'online',
        location: '1号楼2层',
        uptime: '连续运行 8个月',
        children: [
          {
            id: 'cnc-001',
            label: 'CNC数控机床-001',
            type: 'cnc',
            status: 'online',
            location: '工位A-01',
            uptime: '连续运行 72小时',
            hasAnomaly: false
          },
          {
            id: 'cnc-002',
            label: 'CNC数控机床-002',
            type: 'cnc',
            status: 'warning',
            location: '工位A-02',
            uptime: '连续运行 48小时',
            hasAnomaly: true
          }
        ]
      },
      {
        id: 'workshop-2',
        label: '生产车间B',
        type: 'workshop',
        status: 'online',
        location: '2号楼1层',
        uptime: '连续运行 1年2个月',
        children: [
          {
            id: 'robot-001',
            label: '工业机器人-001',
            type: 'robot',
            status: 'online',
            location: '工位B-01',
            uptime: '连续运行 24小时',
            hasAnomaly: false
          },
          {
            id: 'conveyor-001',
            label: '传送带系统-001',
            type: 'conveyor',
            status: 'error',
            location: '流水线B-01',
            uptime: '维修中',
            hasAnomaly: true
          }
        ]
      }
    ]
  }
])

// 实时指标数据
const realtimeMetrics = ref<RealtimeMetric[]>([
  {
    key: 'temperature',
    name: '设备温度',
    value: '75.2',
    unit: '°C',
    status: 'normal',
    statusText: '正常',
    trend: 65,
    updateTime: '刚刚'
  },
  {
    key: 'pressure',
    name: '系统压力',
    value: '2.8',
    unit: 'bar',
    status: 'warning',
    statusText: '偏高',
    trend: 80,
    updateTime: '刚刚'
  },
  {
    key: 'vibration',
    name: '振动幅度',
    value: '0.15',
    unit: 'mm/s',
    status: 'normal',
    statusText: '正常',
    trend: 45,
    updateTime: '刚刚'
  },
  {
    key: 'current',
    name: '工作电流',
    value: '12.5',
    unit: 'A',
    status: 'normal',
    statusText: '正常',
    trend: 55,
    updateTime: '刚刚'
  }
])

// 健康度评分
const healthScore = ref(85)
const healthScoreDetails = ref({
  performance: 88,
  reliability: 92,
  efficiency: 85,
  maintenance: 80,
  trends: 'improving'
})

// 设备日志
const deviceLogs = ref<LogEntry[]>([
  {
    id: '1',
    timestamp: '2024-01-15 14:30:25',
    level: 'info',
    message: '设备启动完成，各项指标正常'
  },
  {
    id: '2',
    timestamp: '2024-01-15 14:25:10',
    level: 'warning',
    message: '检测到温度轻微波动，已自动调节'
  },
  {
    id: '3',
    timestamp: '2024-01-15 14:20:45',
    level: 'error',
    message: '压力传感器数据异常，正在重新校准'
  }
])

// 计算属性
const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return deviceLogs.value
  }
  return deviceLogs.value.filter(log => log.level === logLevel.value)
})

const onlineDevicesCount = computed(() => {
  return countDevicesByStatus('online')
})

const abnormalDevicesCount = computed(() => {
  return countDevicesByStatus('warning') + countDevicesByStatus('error')
})

const offlineDevicesCount = computed(() => {
  return countDevicesByStatus('offline')
})

// 方法定义
function countDevicesByStatus(status: string): number {
  let count = 0
  const countInTree = (devices: Device[]) => {
    devices.forEach(device => {
      if (device.status === status) {
        count++
      }
      if (device.children) {
        countInTree(device.children)
      }
    })
  }
  countInTree(deviceTreeData.value)
  return count
}

function getDeviceIcon(type: string): string {
  const iconMap: Record<string, string> = {
    factory: '🏭',
    workshop: '🏢',
    cnc: '⚙️',
    robot: '🤖',
    conveyor: '🔗',
    default: '📦'
  }
  return iconMap[type] || iconMap.default
}

function getDeviceTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    factory: '智能制造工厂',
    workshop: '生产车间',
    cnc: 'CNC数控机床',
    robot: '工业机器人',
    conveyor: '传送带系统',
    default: '未知设备'
  }
  return typeMap[type] || typeMap.default
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    warning: '警告',
    error: '故障'
  }
  return statusMap[status] || status
}

function filterDeviceTree(value: string, data: Device): boolean {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}

const handleSearch = debounce((value: string) => {
  deviceTreeRef.value?.filter(value)
}, 300)

function handleDeviceSelect(data: Device) {
  if (!data.children || data.children.length === 0) {
    selectedDevice.value = data
    nextTick(() => {
      initializeDeviceContent()
    })
  }
}

async function initializeDeviceContent() {
  if (!selectedDevice.value) return

  try {
    // 初始化3D场景
    await initializeThreeScene()
    
    // 加载历史数据
    await loadHistoricalData()
    
    // 加载设备日志
    await loadDeviceLogs()
    
    // 计算健康度评分
    await calculateHealthScore()
    
    ElMessage.success('设备数据加载完成')
  } catch (error) {
    console.error('设备内容初始化失败:', error)
    ElMessage.error('设备数据加载失败')
  }
}

async function initializeThreeScene() {
  if (!threeContainer.value || threeSceneReady.value) return

  try {
    threeError.value = null
    const THREE = await loadThree()
    
    // 创建场景
    threeScene = new THREE.Scene()
    threeScene.background = new THREE.Color(0xf0f0f0)
    
    // 创建相机
    threeCamera = new THREE.PerspectiveCamera(
      75,
      threeContainer.value.clientWidth / threeContainer.value.clientHeight,
      0.1,
      1000
    )
    threeCamera.position.set(5, 5, 5)
    
    // 创建渲染器
    threeRenderer = new THREE.WebGLRenderer({ antialias: true })
    threeRenderer.setSize(
      threeContainer.value.clientWidth,
      threeContainer.value.clientHeight
    )
    threeRenderer.shadowMap.enabled = true
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    threeScene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    threeScene.add(directionalLight)
    
    // 创建示例几何体
    const geometry = new THREE.BoxGeometry(2, 2, 2)
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(geometry, material)
    cube.castShadow = true
    cube.receiveShadow = true
    threeScene.add(cube)
    
    // 启动渲染循环
    animate()
    
    // 挂载到DOM
    threeContainer.value.appendChild(threeRenderer.domElement)
    
    // 响应窗口大小变化
    window.addEventListener('resize', handleWindowResize)
    
    threeSceneReady.value = true
    ElMessage.success('3D场景初始化成功')
    
  } catch (error) {
    console.error('Three.js初始化失败:', error)
    threeError.value = '3D场景加载失败，请检查浏览器兼容性'
    ElMessage.error('3D场景加载失败')
  }
}

function animate() {
  if (!threeRenderer || !threeScene || !threeCamera) return
  
  requestAnimationFrame(animate)
  
  // 简单的旋转动画
  if (threeScene.children[3]) {
    threeScene.children[3].rotation.x += 0.01
    threeScene.children[3].rotation.y += 0.01
  }
  
  threeRenderer.render(threeScene, threeCamera)
}

function handleWindowResize() {
  if (!threeCamera || !threeRenderer || !threeContainer.value) return
  
  const width = threeContainer.value.clientWidth
  const height = threeContainer.value.clientHeight
  
  threeCamera.aspect = width / height
  threeCamera.updateProjectionMatrix()
  threeRenderer.setSize(width, height)
}

function reset3DView() {
  if (!threeCamera) return
  threeCamera.position.set(5, 5, 5)
  threeCamera.lookAt(0, 0, 0)
}

function toggleWireframe() {
  // 线框模式切换逻辑
  if (threeScene && threeScene.children[3]) {
    const mesh = threeScene.children[3]
    if (mesh.material instanceof THREE.MeshLambertMaterial) {
      mesh.material.wireframe = !mesh.material.wireframe
    }
  }
}

function capture3DScreenshot() {
  if (!threeRenderer) return
  
  const canvas = threeRenderer.domElement
  const link = document.createElement('a')
  link.download = `device-${selectedDevice.value?.id}-3d.png`
  link.href = canvas.toDataURL()
  link.click()
}

async function loadHistoricalData() {
  chartLoading.value = true
  chartError.value = null
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 这里应该调用实际的API
    ElMessage.success('历史数据加载完成')
    
  } catch (error) {
    console.error('历史数据加载失败:', error)
    chartError.value = '历史数据加载失败，请稍后重试'
  } finally {
    chartLoading.value = false
  }
}

async function loadDeviceLogs() {
  isLoadingLogs.value = true
  logError.value = null
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('设备日志加载完成')
    
  } catch (error) {
    console.error('设备日志加载失败:', error)
    logError.value = '设备日志加载失败，请稍后重试'
  } finally {
    isLoadingLogs.value = false
  }
}

async function calculateHealthScore() {
  isCalculatingScore.value = true
  
  try {
    // 模拟健康度计算
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 随机生成健康度评分
    const score = Math.floor(Math.random() * 20) + 80
    healthScore.value = score
    
    ElMessage.success('健康度评分计算完成')
    
  } catch (error) {
    console.error('健康度评分计算失败:', error)
  } finally {
    isCalculatingScore.value = false
  }
}

function handleTimeRangeChange() {
  loadHistoricalData()
}

function refreshLogs() {
  isRefreshingLogs.value = true
  loadDeviceLogs().finally(() => {
    isRefreshingLogs.value = false
  })
}

async function exportDeviceData() {
  isExporting.value = true
  
  try {
    const data = {
      device: selectedDevice.value,
      metrics: realtimeMetrics.value,
      healthScore: healthScore.value,
      logs: filteredLogs.value
    }
    
    await exportToCSV([data], `device-${selectedDevice.value?.id}-data.csv`)
    ElMessage.success('数据导出成功')
    
  } catch (error) {
    console.error('数据导出失败:', error)
    ElMessage.error('数据导出失败')
  } finally {
    isExporting.value = false
  }
}

function showAnomalyAnalysis() {
  if (!selectedDevice.value) return
  
  anomalyModalVisible.value = true
  loadAnomalyAnalysis()
}

async function loadAnomalyAnalysis() {
  isAnalyzingAnomaly.value = true
  
  try {
    // 模拟异常分析
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('异常分析完成')
    
  } catch (error) {
    console.error('异常分析失败:', error)
    ElMessage.error('异常分析失败')
  } finally {
    isAnalyzingAnomaly.value = false
  }
}

function handleAnomalyAnalyzed(data: any) {
  console.log('异常分析结果:', data)
}

function handleLogError(error: string) {
  logError.value = error
}

// 页面初始化
async function initializePage() {
  try {
    pageError.value = null
    isPageLoading.value = true
    
    // 模拟页面初始化
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('设备监控页面加载完成')
    
  } catch (error) {
    console.error('页面初始化失败:', error)
    pageError.value = {
      title: '页面初始化失败',
      message: '请刷新页面重试，或联系技术支持'
    }
  } finally {
    isPageLoading.value = false
  }
}

// 生命周期钩子
onMounted(async () => {
  await initializePage()
})

onUnmounted(() => {
  // 清理Three.js资源
  if (threeRenderer) {
    threeRenderer.dispose()
  }
  
  // 移除事件监听
  window.removeEventListener('resize', handleWindowResize)
})

// 监听器
watch(selectedDevice, (newDevice, oldDevice) => {
  if (newDevice && newDevice !== oldDevice) {
    initializeDeviceContent()
  }
})

// 添加computed导入
import { computed } from 'vue'

// 异常分析数据（模拟）
const anomalyAnalysisData = ref({
  score: 75,
  issues: [
    { type: 'temperature', severity: 'medium', description: '温度波动异常' },
    { type: 'pressure', severity: 'low', description: '压力轻微偏高' }
  ],
  recommendations: [
    '建议检查冷却系统',
    '调整压力参数设置'
  ]
})

</script>

<style scoped>
.device-monitor-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  position: relative;
}

.page-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
}

.page-error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.monitor-content {
  height: 100%;
  display: flex;
}

.monitor-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 1fr;
  width: 100%;
  height: 100%;
  gap: 16px;
  padding: 16px;
}

.device-list-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.device-list-panel.collapsed {
  width: 80px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #3498db;
}

.search-box {
  width: 100%;
}

.device-tree-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
}

.device-tree {
  background: transparent;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.tree-node:hover {
  background: rgba(52, 152, 219, 0.1);
}

.node-icon {
  font-size: 16px;
}

.node-label {
  flex: 1;
  font-weight: 500;
}

.node-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.node-status.online {
  background: #d4edda;
  color: #155724;
}

.node-status.warning {
  background: #fff3cd;
  color: #856404;
}

.node-status.error {
  background: #f8d7da;
  color: #721c24;
}

.node-status.offline {
  background: #e2e3e5;
  color: #383d41;
}

.device-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
}

.stat-value {
  font-weight: 600;
  font-size: 16px;
}

.stat-value.online { color: #28a745; }
.stat-value.warning { color: #ffc107; }
.stat-value.offline { color: #6c757d; }

.device-detail-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.detail-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.detail-actions {
  display: flex;
  gap: 12px;
}

.device-basic-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-row {
  display: flex;
  gap: 8px;
}

.info-label {
  font-weight: 500;
  color: #495057;
  min-width: 80px;
}

.info-value {
  color: #212529;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-controls,
.chart-controls,
.log-controls {
  display: flex;
  gap: 8px;
}

.three-container-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.three-container {
  width: 100%;
  height: 300px;
  background: #ffffff;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.three-loading,
.three-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

.realtime-metrics-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #28a745;
  transition: transform 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-card.status-warning {
  border-left-color: #ffc107;
}

.metric-card.status-error {
  border-left-color: #dc3545;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-weight: 500;
  color: #495057;
}

.metric-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.metric-status.normal {
  background: #d4edda;
  color: #155724;
}

.metric-status.warning {
  background: #fff3cd;
  color: #856404;
}

.metric-status.error {
  background: #f8d7da;
  color: #721c24;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 8px;
}

.metric-trend {
  margin-bottom: 8px;
}

.metric-update-time {
  font-size: 12px;
  color: #6c757d;
}

.health-score-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.historical-trends-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.chart-container {
  width: 100%;
  height: 300px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.chart-loading,
.chart-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

.device-logs-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.logs-container {
  background: white;
  border-radius: 8px;
  border: 2px solid #e9ecef;
  overflow: hidden;
}

.basic-logs-view {
  height: 300px;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.log-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f3f4;
  font-size: 14px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #6c757d;
  min-width: 140px;
  font-family: 'Courier New', monospace;
}

.log-level {
  min-width: 60px;
  font-weight: 600;
  text-transform: uppercase;
}

.log-level.level-error { color: #dc3545; }
.log-level.level-warning { color: #ffc107; }
.log-level.level-info { color: #17a2b8; }
.log-level.level-debug { color: #6c757d; }

.log-message {
  flex: 1;
  color: #212529;
}

.advanced-logs-view {
  height: 300px;
}

.no-device-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.empty-state {
  text-align: center;
  color: #6c757d;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #dee2e6;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #495057;
}

.empty-description {
  margin: 0;
  font-size: 16px;
  max-width: 400px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .monitor-grid {
    grid-template-columns: 280px 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .monitor-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .device-list-panel {
    max-height: 200px;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .detail-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .device-basic-info {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .view-controls,
  .chart-controls,
  .log-controls {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>