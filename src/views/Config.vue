<template>
  <div class="config-container">
    <!-- 左侧组件库 -->
    <div class="component-library">
      <div class="library-header">
        <h3>组件库</h3>
        <el-input
          v-model="componentSearch"
          placeholder="搜索组件..."
          size="small"
          clearable
        >
          <template #prefix>
            <el-icon><search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="component-categories">
        <el-tabs v-model="activeCategory" type="card">
          <el-tab-pane label="图表组件" name="charts">
            <div class="component-list">
              <div 
                v-for="component in chartComponents" 
                :key="component.id"
                class="component-item"
                draggable="true"
                @dragstart="handleDragStart($event, component)"
              >
                <div class="component-icon">
                  <el-icon><component :is="component.icon" /></el-icon>
                </div>
                <span class="component-name">{{ component.name }}</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="指标卡片" name="metrics">
            <div class="component-list">
              <div 
                v-for="component in metricComponents" 
                :key="component.id"
                class="component-item"
                draggable="true"
                @dragstart="handleDragStart($event, component)"
              >
                <div class="component-icon">
                  <el-icon><component :is="component.icon" /></el-icon>
                </div>
                <span class="component-name">{{ component.name }}</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="文本组件" name="text">
            <div class="component-list">
              <div 
                v-for="component in textComponents" 
                :key="component.id"
                class="component-item"
                draggable="true"
                @dragstart="handleDragStart($event, component)"
              >
                <div class="component-icon">
                  <el-icon><component :is="component.icon" /></el-icon>
                </div>
                <span class="component-name">{{ component.name }}</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="布局组件" name="layout">
            <div class="component-list">
              <div 
                v-for="component in layoutComponents" 
                :key="component.id"
                class="component-item"
                draggable="true"
                @dragstart="handleDragStart($event, component)"
              >
                <div class="component-icon">
                  <el-icon><component :is="component.icon" /></el-icon>
                </div>
                <span class="component-name">{{ component.name }}</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="地图组件" name="map">
            <div class="component-list">
              <div 
                v-for="component in mapComponents" 
                :key="component.id"
                class="component-item"
                draggable="true"
                @dragstart="handleDragStart($event, component)"
              >
                <div class="component-icon">
                  <el-icon><component :is="component.icon" /></el-icon>
                </div>
                <span class="component-name">{{ component.name }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 中间画布区 -->
    <div class="canvas-area">
      <div class="canvas-header">
        <h3>大屏画布</h3>
        <div class="canvas-controls">
          <el-button size="small" @click="clearCanvas">清空画布</el-button>
          <el-button size="small" @click="saveCanvasLayout">保存布局</el-button>
          <el-button size="small" @click="loadCanvasLayout">加载布局</el-button>
          <el-button size="small" @click="previewDashboard">预览</el-button>
          <el-button type="primary" size="small" @click="publishDashboard">发布</el-button>
        </div>
      </div>
      <div class="canvas-toolbar">
        <div class="toolbar-group">
          <el-button-group>
            <el-button size="small" @click="setCanvasMode('edit')" :type="canvasMode === 'edit' ? 'primary' : ''">
              <el-icon><EditPen /></el-icon>
              编辑模式
            </el-button>
            <el-button size="small" @click="setCanvasMode('preview')" :type="canvasMode === 'preview' ? 'primary' : ''">
              <el-icon><View /></el-icon>
              预览模式
            </el-button>
          </el-button-group>
        </div>
        <div class="toolbar-group">
          <el-input-number v-model="gridSize" :min="10" :max="100" size="small" @change="updateGridSize" />
          <span class="toolbar-label">网格大小</span>
        </div>
        <div class="toolbar-group">
          <el-switch v-model="showGrid" size="small" @change="toggleGrid" active-text="显示网格" inactive-text="隐藏网格" />
        </div>
      </div>
      <div 
        ref="canvasRef" 
        class="canvas"
        :class="[`canvas-${canvasMode}`, { 'show-grid': showGrid }]"
        @dragover="handleDragOver"
        @drop="handleDrop"
        @click="handleCanvasClick"
      >
        <div v-if="showGrid" class="grid-overlay"></div>
        
        <!-- 使用vuedraggable实现组件的拖拽重排序 -->
        <Draggable
          v-model="canvasComponents"
          group="canvas-components"
          :animation="200"
          :disabled="canvasMode === 'preview'"
          @start="onDragStart"
          @end="onDragEnd"
          item-key="id"
        >
          <template #item="{ element: component, index }">
            <div 
              class="canvas-component"
              :class="[
                `component-${component.type}`,
                { 'selected': selectedComponentId === component.id },
                { 'dragging': draggingComponentId === component.id }
              ]"
              :style="getComponentStyle(component)"
              @click.stop="selectComponent(component)"
              @mousedown="startDrag(component, $event)"
              @dblclick="editComponent(component)"
            >
              <div class="component-content">
                <component-preview :component="component" :mode="canvasMode" />
              </div>
              
              <div v-if="canvasMode === 'edit' && selectedComponentId === component.id" class="component-handles">
                <div class="resize-handle resize-nw" @mousedown.stop="startResize(component, 'nw', $event)"></div>
                <div class="resize-handle resize-n" @mousedown.stop="startResize(component, 'n', $event)"></div>
                <div class="resize-handle resize-ne" @mousedown.stop="startResize(component, 'ne', $event)"></div>
                <div class="resize-handle resize-e" @mousedown.stop="startResize(component, 'e', $event)"></div>
                <div class="resize-handle resize-se" @mousedown.stop="startResize(component, 'se', $event)"></div>
                <div class="resize-handle resize-s" @mousedown.stop="startResize(component, 's', $event)"></div>
                <div class="resize-handle resize-sw" @mousedown.stop="startResize(component, 'sw', $event)"></div>
                <div class="resize-handle resize-w" @mousedown.stop="startResize(component, 'w', $event)"></div>
              </div>
              
              <div v-if="canvasMode === 'edit'" class="component-toolbar">
                <el-tooltip content="删除" placement="top">
                  <el-button size="mini" type="danger" @click.stop="removeComponent(component.id)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="复制" placement="top">
                  <el-button size="mini" @click.stop="duplicateComponent(component)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="配置" placement="top">
                  <el-button size="mini" @click.stop="configureComponent(component)">
                    <el-icon><Setting /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </template>
        </Draggable>
        
        <!-- 画布信息显示 -->
        <div v-if="canvasComponents.length === 0 && canvasMode === 'edit'" class="canvas-empty">
          <div class="empty-icon">
            <el-icon :size="60"><DocumentDelete /></el-icon>
          </div>
          <p>画布为空，请从左侧组件库拖拽组件到此处</p>
        </div>
      </div>
    </div>

    <!-- 右侧配置面板 -->
    <div class="config-panel">
      <div class="panel-header">
        <h3>配置面板</h3>
        <el-button size="small" @click="saveConfig">保存配置</el-button>
      </div>
      <div class="panel-content">
        <el-tabs v-model="activeConfigTab">
          <el-tab-pane label="样式配置" name="style">
            <div class="style-config">
              <el-form label-width="80px">
                <el-form-item label="背景颜色">
                  <el-color-picker v-model="currentComponent.style.backgroundColor" />
                </el-form-item>
                <el-form-item label="字体颜色">
                  <el-color-picker v-model="currentComponent.style.color" />
                </el-form-item>
                <el-form-item label="字体大小">
                  <el-input-number 
                    v-model="currentComponent.style.fontSize" 
                    :min="12" 
                    :max="48" 
                  />
                </el-form-item>
                <el-form-item label="边框颜色">
                  <el-color-picker v-model="currentComponent.style.borderColor" />
                </el-form-item>
                <el-form-item label="边框宽度">
                  <el-input-number 
                    v-model="currentComponent.style.borderWidth" 
                    :min="0" 
                    :max="10" 
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
          <el-tab-pane label="数据源配置" name="data">
            <div class="data-config">
              <el-form label-width="100px">
                <el-form-item label="数据源类型">
                  <el-select v-model="currentComponent.dataSource.type">
                    <el-option label="实时数据湖" value="realtime" />
                    <el-option label="API接口" value="api" />
                    <el-option label="静态数据" value="static" />
                  </el-select>
                </el-form-item>
                <el-form-item label="数据接口">
                  <el-input v-model="currentComponent.dataSource.url" />
                </el-form-item>
                <el-form-item label="更新频率">
                  <el-input-number 
                    v-model="currentComponent.dataSource.interval" 
                    :min="1" 
                    :max="3600" 
                  />
                  <span style="margin-left: 8px;">秒</span>
                </el-form-item>
                <el-form-item label="字段映射">
                  <el-input v-model="currentComponent.dataSource.fieldMapping" />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
          <el-tab-pane label="交互配置" name="interaction">
            <div class="interaction-config">
              <el-form label-width="100px">
                <el-form-item label="点击事件">
                  <el-select v-model="currentComponent.interaction.clickEvent">
                    <el-option label="无" value="none" />
                    <el-option label="下钻分析" value="drilldown" />
                    <el-option label="弹窗详情" value="modal" />
                    <el-option label="页面跳转" value="navigate" />
                  </el-select>
                </el-form-item>
                <el-form-item label="联动图表">
                  <el-select v-model="currentComponent.interaction.linkedCharts" multiple>
                    <el-option 
                      v-for="chart in canvasComponents.filter(c => c.type === 'chart')" 
                      :key="chart.id"
                      :label="chart.name" 
                      :value="chart.id" 
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="动画效果">
                  <el-select v-model="currentComponent.interaction.animation">
                    <el-option label="无" value="none" />
                    <el-option label="淡入" value="fade" />
                    <el-option label="缩放" value="scale" />
                    <el-option label="滑动" value="slide" />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog 
      v-model="showPreview" 
      title="大屏预览" 
      width="90%"
      top="5vh"
    >
      <div class="preview-container">
        <iframe 
          ref="previewIframe" 
          class="preview-iframe"
          :src="previewUrl"
        ></iframe>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { 
  Search, 
  Delete, 
  Setting, 
  EditPen, 
  View, 
  DocumentDelete, 
  CopyDocument,
  Document,
  Histogram,
  TrendCharts,
  PieChart,
  DataAnalysis,
  DataBoard,
  Odometer,
  Grid,
  Box,
  Loading,
  CircleCheck,
  Warning,
  EditPen as EditIcon,
  Clock,
  DocumentCopy,
  Operation,
  CreditCard,
  FolderOpened,
  Location,
  MapLocation,
  Map
} from '@element-plus/icons-vue'
import Draggable from 'vuedraggable'
import ComponentPreview from '@/components/ComponentPreview.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件库数据
const componentSearch = ref('')
const activeCategory = ref('charts')

const chartComponents = ref([
  { id: 1, name: '柱状图', type: 'chart', icon: 'Histogram', category: 'charts', defaultSize: { width: 400, height: 300 } },
  { id: 2, name: '折线图', type: 'chart', icon: 'TrendCharts', category: 'charts', defaultSize: { width: 400, height: 300 } },
  { id: 3, name: '饼图', type: 'chart', icon: 'PieChart', category: 'charts', defaultSize: { width: 350, height: 350 } },
  { id: 4, name: '散点图', type: 'chart', icon: 'DataAnalysis', category: 'charts', defaultSize: { width: 400, height: 300 } },
  { id: 5, name: '雷达图', type: 'chart', icon: 'DataBoard', category: 'charts', defaultSize: { width: 350, height: 350 } },
  { id: 6, name: '仪表盘', type: 'chart', icon: 'Odometer', category: 'charts', defaultSize: { width: 300, height: 300 } },
  { id: 7, name: '热力图', type: 'chart', icon: 'Grid', category: 'charts', defaultSize: { width: 400, height: 400 } },
  { id: 8, name: '3D图表', type: 'chart', icon: 'Box', category: 'charts', defaultSize: { width: 450, height: 350 } }
])

const metricComponents = ref([
  { id: 9, name: '指标卡片', type: 'metric', icon: 'DataBoard', category: 'metrics', defaultSize: { width: 200, height: 120 } },
  { id: 10, name: '进度条', type: 'metric', icon: 'Loading', category: 'metrics', defaultSize: { width: 200, height: 80 } },
  { id: 11, name: '状态指示器', type: 'metric', icon: 'CircleCheck', category: 'metrics', defaultSize: { width: 150, height: 150 } },
  { id: 12, name: '告警面板', type: 'metric', icon: 'Warning', category: 'metrics', defaultSize: { width: 300, height: 200 } }
])

const textComponents = ref([
  { id: 13, name: '标题文本', type: 'text', icon: 'Document', category: 'text', defaultSize: { width: 200, height: 60 } },
  { id: 14, name: '段落文本', type: 'text', icon: 'EditIcon', category: 'text', defaultSize: { width: 300, height: 100 } },
  { id: 15, name: '时间戳', type: 'text', icon: 'Clock', category: 'text', defaultSize: { width: 200, height: 50 } },
  { id: 16, name: '富文本', type: 'text', icon: 'DocumentCopy', category: 'text', defaultSize: { width: 400, height: 200 } }
])

// 新增：布局组件
const layoutComponents = ref([
  { id: 17, name: '网格容器', type: 'layout', icon: 'Grid', category: 'layout', defaultSize: { width: 600, height: 400 } },
  { id: 18, name: '弹性容器', type: 'layout', icon: 'Operation', category: 'layout', defaultSize: { width: 600, height: 400 } },
  { id: 19, name: '卡片容器', type: 'layout', icon: 'CreditCard', category: 'layout', defaultSize: { width: 400, height: 300 } },
  { id: 20, name: '标签页', type: 'layout', icon: 'FolderOpened', category: 'layout', defaultSize: { width: 500, height: 400 } }
])

// 新增：地图组件
const mapComponents = ref([
  { id: 21, name: '3D场景', type: 'map', icon: 'Location', category: 'map', defaultSize: { width: 600, height: 500 } },
  { id: 22, name: '中国地图', type: 'map', icon: 'MapLocation', category: 'map', defaultSize: { width: 500, height: 400 } },
  { id: 23, name: '世界地图', type: 'map', icon: 'Map', category: 'map', defaultSize: { width: 500, height: 400 } }
])

// 画布相关
const canvasRef = ref<HTMLElement>()
const canvasComponents = ref<any[]>([])
const selectedComponentId = ref<number | null>(null)
const draggingComponentId = ref<number | null>(null)
const canvasMode = ref<'edit' | 'preview'>('edit')
const showGrid = ref(true)
const gridSize = ref(20)

const currentComponent = ref<any>({
  style: {},
  dataSource: {},
  interaction: {}
})

// 配置面板
const activeConfigTab = ref('style')

// 预览相关
const showPreview = ref(false)
const previewUrl = ref('')

// 拖拽相关状态
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// 组件库拖拽处理
const handleDragStart = (event: DragEvent, component: any) => {
  event.dataTransfer?.setData('component', JSON.stringify(component))
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const componentData = event.dataTransfer?.getData('component')
  if (componentData) {
    const component = JSON.parse(componentData)
    const canvasRect = canvasRef.value?.getBoundingClientRect()
    if (canvasRect) {
      const x = event.clientX - canvasRect.left
      const y = event.clientY - canvasRect.top
      addComponentToCanvas(component, x, y)
    }
  }
}

// 画布相关事件处理
const handleCanvasClick = (event: Event) => {
  if (event.target === canvasRef.value) {
    selectedComponentId.value = null
  }
}

const selectComponent = (component: any) => {
  selectedComponentId.value = component.id
}

const editComponent = (component: any) => {
  selectComponent(component)
  // 这里可以打开编辑对话框
}

// vuedraggable事件处理
const onDragStart = (event: any) => {
  draggingComponentId.value = event.item.__vueParentComponent.props.element.id
}

const onDragEnd = (event: any) => {
  draggingComponentId.value = null
}

// 组件操作方法
const addComponentToCanvas = (component: any, x: number, y: number) => {
  const newComponent = {
    ...component,
    id: Date.now(),
    position: { 
      x: Math.max(0, Math.min(x, 1200 - (component.defaultSize?.width || 200))), 
      y: Math.max(0, Math.min(y, 800 - (component.defaultSize?.height || 150))) 
    },
    size: { 
      width: component.defaultSize?.width || 200, 
      height: component.defaultSize?.height || 150 
    },
    style: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#ffffff',
      fontSize: 14,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    },
    dataSource: {
      type: 'static',
      url: '',
      interval: 5,
      fieldMapping: ''
    },
    interaction: {
      clickEvent: 'none',
      linkedCharts: [],
      animation: 'none'
    }
  }
  canvasComponents.value.push(newComponent)
  currentComponent.value = newComponent
  selectedComponentId.value = newComponent.id
}

const getComponentStyle = (component: any) => ({
  left: `${component.position.x}px`,
  top: `${component.position.y}px`,
  width: `${component.size.width}px`,
  height: `${component.size.height}px`,
  ...component.style
})

// 组件拖拽和调整大小功能
const startDrag = (component: any, event: MouseEvent) => {
  if (canvasMode.value === 'preview') return
  
  isDragging.value = true
  selectedComponentId.value = component.id
  
  const rect = event.currentTarget.getBoundingClientRect()
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  
  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEndInternal)
}

const startResize = (component: any, direction: string, event: MouseEvent) => {
  if (canvasMode.value === 'preview') return
  
  event.preventDefault()
  event.stopPropagation()
  
  selectedComponentId.value = component.id
  
  const startPos = { x: event.clientX, y: event.clientY }
  const startSize = { width: component.size.width, height: component.size.height }
  const startComponent = { ...component }
  
  const onResize = (e: MouseEvent) => {
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    
    if (direction.includes('e')) {
      component.size.width = Math.max(50, startSize.width + deltaX)
    }
    if (direction.includes('s')) {
      component.size.height = Math.max(50, startSize.height + deltaY)
    }
    if (direction.includes('w')) {
      component.size.width = Math.max(50, startSize.width - deltaX)
      component.position.x = startComponent.position.x + (startSize.width - component.size.width)
    }
    if (direction.includes('n')) {
      component.size.height = Math.max(50, startSize.height - deltaY)
      component.position.y = startComponent.position.y + (startSize.height - component.size.height)
    }
  }
  
  const onResizeEnd = () => {
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', onResizeEnd)
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', onResizeEnd)
}

const removeComponent = (componentId: number) => {
  canvasComponents.value = canvasComponents.value.filter(c => c.id !== componentId)
  if (selectedComponentId.value === componentId) {
    selectedComponentId.value = null
  }
}

const configureComponent = (component: any) => {
  selectComponent(component)
  // 这里可以打开配置对话框
}

// 新增：组件复制功能
const duplicateComponent = (component: any) => {
  const newComponent = {
    ...component,
    id: Date.now(),
    position: {
      x: component.position.x + 20,
      y: component.position.y + 20
    },
    name: component.name + ' (副本)'
  }
  canvasComponents.value.push(newComponent)
  selectComponent(newComponent)
  ElMessage.success('组件已复制')
}

// 画布操作方法
const clearCanvas = () => {
  ElMessageBox.confirm('确定要清空画布吗？', '确认清空', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    canvasComponents.value = []
    selectedComponentId.value = null
    ElMessage.success('画布已清空')
  })
}

// 拖拽事件处理函数
const onDragMove = (event: MouseEvent) => {
  if (!isDragging.value || selectedComponentId.value === null) return
  
  const component = canvasComponents.value.find(c => c.id === selectedComponentId.value)
  if (!component) return
  
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (canvasRect) {
    const x = event.clientX - canvasRect.left - dragOffset.value.x
    const y = event.clientY - canvasRect.top - dragOffset.value.y
    
    component.position.x = Math.max(0, Math.min(x, canvasRect.width - component.size.width))
    component.position.y = Math.max(0, Math.min(y, canvasRect.height - component.size.height))
  }
}

const onDragEndInternal = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEndInternal)
}

// 画布模式控制
const setCanvasMode = (mode: 'edit' | 'preview') => {
  canvasMode.value = mode
  if (mode === 'preview') {
    selectedComponentId.value = null
  }
}

// 网格控制
const updateGridSize = (size: number) => {
  gridSize.value = size
  // 这里可以更新网格的视觉显示
}

const toggleGrid = (show: boolean) => {
  showGrid.value = show
  // 这里可以控制网格的显示/隐藏
}

// 布局保存和加载
const saveCanvasLayout = () => {
  const layoutData = {
    components: canvasComponents.value,
    timestamp: new Date().toISOString(),
    version: '1.0'
  }
  localStorage.setItem('dashboard-layout', JSON.stringify(layoutData))
  ElMessage.success('布局已保存')
}

const loadCanvasLayout = () => {
  const savedData = localStorage.getItem('dashboard-layout')
  if (savedData) {
    try {
      const layoutData = JSON.parse(savedData)
      canvasComponents.value = layoutData.components || []
      ElMessage.success('布局已加载')
    } catch (error) {
      ElMessage.error('布局数据格式错误')
    }
  } else {
    ElMessage.warning('没有找到保存的布局数据')
  }
}

const previewDashboard = () => {
  if (canvasComponents.value.length === 0) {
    ElMessage.warning('画布为空，无法预览')
    return
  }
  
  // 生成预览配置
  const previewConfig = {
    components: canvasComponents.value,
    timestamp: new Date().toISOString()
  }
  
  // 将配置保存到localStorage供预览页面使用
  localStorage.setItem('dashboard-preview-config', JSON.stringify(previewConfig))
  
  // 打开预览窗口
  const previewWindow = window.open('/preview', '_blank', 'width=1200,height=800')
  
  if (!previewWindow) {
    ElMessage.error('无法打开预览窗口，请检查浏览器弹窗设置')
  } else {
    ElMessage.success('预览窗口已打开')
  }
}

const publishDashboard = () => {
  if (canvasComponents.value.length === 0) {
    ElMessage.warning('画布为空，无法发布')
    return
  }
  
  ElMessageBox.confirm('确定要发布当前大屏配置吗？', '确认发布', {
    type: 'warning',
    confirmButtonText: '确定发布',
    cancelButtonText: '取消'
  }).then(() => {
    const publishConfig = {
      components: canvasComponents.value,
      publishedAt: new Date().toISOString(),
      version: '1.0.0',
      status: 'published'
    }
    
    // 这里应该调用实际的发布API
    // 目前使用localStorage模拟
    localStorage.setItem('dashboard-published-config', JSON.stringify(publishConfig))
    
    ElMessage.success('大屏配置已成功发布')
  })
}

const saveConfig = () => {
  const configData = {
    components: canvasComponents.value,
    settings: {
      canvasMode: canvasMode.value,
      showGrid: showGrid.value,
      gridSize: gridSize.value
    },
    lastModified: new Date().toISOString()
  }
  
  localStorage.setItem('dashboard-config', JSON.stringify(configData))
  ElMessage.success('配置已保存')
}

// 组件预览组件已在 @/components/ComponentPreview.vue 中定义
</script>

<style scoped>
.config-container {
  width: 100%;
  height: 100%;
  display: flex;
  background: var(--bg-color);
  color: var(--text-color);
  overflow: hidden;
  box-sizing: border-box;
}

.component-library {
  width: 280px;
  height: 100%;
  background: var(--card-bg);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.library-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.library-header h3 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: bold;
}

.component-categories {
  flex: 1;
  overflow-y: auto;
}

.component-list {
  padding: 16px;
  display: grid;
  gap: 12px;
}

.component-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: grab;
  transition: all 0.3s ease;
}

.component-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.component-icon {
  margin-right: 8px;
  font-size: 16px;
}

.component-name {
  font-size: 14px;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.canvas-header h3 {
  font-size: 18px;
  font-weight: bold;
}

.canvas {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 0;
  position: relative;
  overflow: hidden;
  margin: 20px;
}

.canvas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px 20px;
  background: var(--card-bg);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.canvas-canvas {
  /* 基础样式 */
}

/* 网格叠加层 */
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  z-index: 1;
}

.canvas.show-grid {
  /* 显示网格时的额外样式 */
}

/* 画布模式样式 */
.canvas-edit {
  /* 编辑模式样式 */
}

.canvas-preview {
  /* 预览模式样式 */
}

/* 组件样式增强 */
.canvas-component {
  position: absolute;
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: move;
  user-select: none;
  transition: box-shadow 0.3s ease;
}

.canvas-component.selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.3);
}

.canvas-component.dragging {
  opacity: 0.8;
  transform: scale(1.05);
  z-index: 1000;
}

.canvas-component:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 组件内容 */
.component-content {
  width: 100%;
  height: calc(100% - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-sizing: border-box;
}

/* 组件手柄系统 */
.component-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #1890ff;
  border: 2px solid #fff;
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.resize-handle:hover {
  background: #40a9ff;
  transform: scale(1.2);
}

/* 八个方向的调整手柄 */
.resize-nw { top: -4px; left: -4px; cursor: nw-resize; }
.resize-n { top: -4px; left: 50%; margin-left: -4px; cursor: n-resize; }
.resize-ne { top: -4px; right: -4px; cursor: ne-resize; }
.resize-e { top: 50%; right: -4px; margin-top: -4px; cursor: e-resize; }
.resize-se { bottom: -4px; right: -4px; cursor: se-resize; }
.resize-s { bottom: -4px; left: 50%; margin-left: -4px; cursor: s-resize; }
.resize-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
.resize-w { top: 50%; left: -4px; margin-top: -4px; cursor: w-resize; }

/* 组件工具栏 */
.component-toolbar {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.canvas-component:hover .component-toolbar,
.canvas-component.selected .component-toolbar {
  opacity: 1;
}

.component-toolbar .el-button {
  margin: 0 2px;
  padding: 4px;
}

/* 画布空状态 */
.canvas-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-secondary);
  pointer-events: none;
}

.empty-icon {
  margin-bottom: 16px;
}

.canvas-empty p {
  font-size: 16px;
  margin: 0;
}

/* 不同类型组件的样式 */
.component-chart {
  background: linear-gradient(135deg, #1890ff22, #36cfc922);
}

.component-metric {
  background: linear-gradient(135deg, #722ed122, #b37feb22);
}

.component-text {
  background: linear-gradient(135deg, #52c41a22, #73d13d22);
}

.component-layout {
  background: linear-gradient(135deg, #fa8c1622, #ffc06922);
}

.component-map {
  background: linear-gradient(135deg, #eb2f9622, #ff4d4f22);
}

.config-panel {
  width: 320px;
  height: 100%;
  background: var(--card-bg);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  font-size: 16px;
  font-weight: bold;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.style-config,
.data-config,
.interaction-config {
  padding: 16px 0;
}

.preview-container {
  width: 100%;
  height: 80vh;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

/* 组件预览样式 */
.chart-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff33, #36cfc933);
  border-radius: 4px;
}

.metric-preview {
  text-align: center;
  padding: 20px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.text-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
</style>