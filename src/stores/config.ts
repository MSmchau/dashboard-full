import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 配置数据类型定义
interface DashboardConfig {
  id: string
  name: string
  description?: string
  layout: {
    type: 'grid' | 'free'
    columns: number
    rows: number
    gap: number
  }
  components: Array<{
    id: string
    type: string
    position: { x: number; y: number; width: number; height: number }
    config: any
    dataSource: any
  }>
  style: {
    theme: 'light' | 'dark' | 'custom'
    backgroundColor: string
    primaryColor: string
    fontFamily: string
    fontSize: number
  }
  dataSources: Array<{
    id: string
    name: string
    type: 'api' | 'websocket' | 'mqtt' | 'static'
    config: any
  }>
  createdAt: number
  updatedAt: number
  isPublished: boolean
}

interface ComponentTemplate {
  id: string
  name: string
  type: string
  category: string
  icon: string
  description?: string
  defaultConfig: any
  preview: string
}

interface ConfigState {
  currentConfig: DashboardConfig | null
  configHistory: DashboardConfig[]
  templates: ComponentTemplate[]
  autoSave: boolean
  saveInterval: number
  lastSaveTime: number | null
  isSaving: boolean
}

export const useConfigStore = defineStore('config', () => {
  // 状态
  const state = ref<ConfigState>({
    currentConfig: null,
    configHistory: [],
    templates: [],
    autoSave: true,
    saveInterval: 30000, // 30秒自动保存
    lastSaveTime: null,
    isSaving: false
  })

  // 计算属性
  const currentConfig = computed(() => state.value.currentConfig)
  const configHistory = computed(() => state.value.configHistory)
  const templates = computed(() => state.value.templates)
  const hasUnsavedChanges = computed(() => {
    if (!state.value.currentConfig || state.value.configHistory.length === 0) {
      return false
    }
    const lastSaved = state.value.configHistory[0]
    return JSON.stringify(state.value.currentConfig) !== JSON.stringify(lastSaved)
  })

  const componentTemplatesByCategory = computed(() => {
    const categories: Record<string, ComponentTemplate[]> = {}
    state.value.templates.forEach(template => {
      if (!categories[template.category]) {
        categories[template.category] = []
      }
      categories[template.category].push(template)
    })
    return categories
  })

  const chartTemplates = computed(() => 
    state.value.templates.filter(t => t.type === 'chart')
  )

  const metricTemplates = computed(() => 
    state.value.templates.filter(t => t.type === 'metric')
  )

  const textTemplates = computed(() => 
    state.value.templates.filter(t => t.type === 'text')
  )

  // 异步操作
  const createNewConfig = async (name: string, description?: string) => {
    const newConfig: DashboardConfig = {
      id: `config_${Date.now()}`,
      name,
      description,
      layout: {
        type: 'grid',
        columns: 12,
        rows: 8,
        gap: 16
      },
      components: [],
      style: {
        theme: 'dark',
        backgroundColor: '#0f172a',
        primaryColor: '#3b82f6',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14
      },
      dataSources: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublished: false
    }

    state.value.currentConfig = newConfig
    state.value.configHistory.unshift({ ...newConfig })
    
    return newConfig
  }

  const loadConfig = async (configId: string) => {
    try {
      // 模拟从API加载配置
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 这里应该是实际的API调用
      // const config = await api.getConfig(configId)
      
      // 模拟数据
      const mockConfig: DashboardConfig = {
        id: configId,
        name: '示例大屏配置',
        description: '这是一个示例大屏配置',
        layout: {
          type: 'grid',
          columns: 12,
          rows: 8,
          gap: 16
        },
        components: [
          {
            id: 'comp_1',
            type: 'metric',
            position: { x: 0, y: 0, width: 3, height: 2 },
            config: {
              title: '设备总数',
              value: 156,
              unit: '台',
              trend: 'up'
            },
            dataSource: {
              type: 'api',
              url: '/api/metrics/total-devices'
            }
          },
          {
            id: 'comp_2',
            type: 'chart',
            position: { x: 3, y: 0, width: 6, height: 4 },
            config: {
              type: 'line',
              title: '性能趋势',
              xAxis: { type: 'category' },
              yAxis: { type: 'value' }
            },
            dataSource: {
              type: 'api',
              url: '/api/charts/performance-trend'
            }
          }
        ],
        style: {
          theme: 'dark',
          backgroundColor: '#0f172a',
          primaryColor: '#3b82f6',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14
        },
        dataSources: [
          {
            id: 'ds_1',
            name: '设备数据API',
            type: 'api',
            config: {
              url: '/api/devices',
              method: 'GET',
              headers: {}
            }
          }
        ],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
        isPublished: true
      }

      state.value.currentConfig = mockConfig
      state.value.configHistory.unshift({ ...mockConfig })
      
      return mockConfig
    } catch (error) {
      console.error('加载配置失败:', error)
      throw error
    }
  }

  const saveConfig = async () => {
    if (!state.value.currentConfig) return
    
    state.value.isSaving = true
    
    try {
      // 模拟API保存
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const configToSave = {
        ...state.value.currentConfig,
        updatedAt: Date.now()
      }
      
      // 添加到历史记录
      state.value.configHistory.unshift({ ...configToSave })
      
      // 限制历史记录数量
      if (state.value.configHistory.length > 50) {
        state.value.configHistory = state.value.configHistory.slice(0, 50)
      }
      
      state.value.lastSaveTime = Date.now()
      
      console.log('配置保存成功:', configToSave.id)
    } catch (error) {
      console.error('保存配置失败:', error)
      throw error
    } finally {
      state.value.isSaving = false
    }
  }

  const autoSave = async () => {
    if (state.value.autoSave && hasUnsavedChanges.value) {
      await saveConfig()
    }
  }

  const addComponent = (component: Omit<DashboardConfig['components'][0], 'id'>) => {
    if (!state.value.currentConfig) return
    
    const newComponent = {
      ...component,
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    state.value.currentConfig.components.push(newComponent)
    state.value.currentConfig.updatedAt = Date.now()
  }

  const updateComponent = (componentId: string, updates: Partial<DashboardConfig['components'][0]>) => {
    if (!state.value.currentConfig) return
    
    const componentIndex = state.value.currentConfig.components.findIndex(
      comp => comp.id === componentId
    )
    
    if (componentIndex !== -1) {
      state.value.currentConfig.components[componentIndex] = {
        ...state.value.currentConfig.components[componentIndex],
        ...updates
      }
      state.value.currentConfig.updatedAt = Date.now()
    }
  }

  const removeComponent = (componentId: string) => {
    if (!state.value.currentConfig) return
    
    state.value.currentConfig.components = 
      state.value.currentConfig.components.filter(comp => comp.id !== componentId)
    state.value.currentConfig.updatedAt = Date.now()
  }

  const updateLayout = (layout: Partial<DashboardConfig['layout']>) => {
    if (!state.value.currentConfig) return
    
    state.value.currentConfig.layout = {
      ...state.value.currentConfig.layout,
      ...layout
    }
    state.value.currentConfig.updatedAt = Date.now()
  }

  const updateStyle = (style: Partial<DashboardConfig['style']>) => {
    if (!state.value.currentConfig) return
    
    state.value.currentConfig.style = {
      ...state.value.currentConfig.style,
      ...style
    }
    state.value.currentConfig.updatedAt = Date.now()
  }

  const addDataSource = (dataSource: Omit<DashboardConfig['dataSources'][0], 'id'>) => {
    if (!state.value.currentConfig) return
    
    const newDataSource = {
      ...dataSource,
      id: `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    state.value.currentConfig.dataSources.push(newDataSource)
    state.value.currentConfig.updatedAt = Date.now()
  }

  const publishConfig = async () => {
    if (!state.value.currentConfig) return
    
    try {
      await saveConfig()
      state.value.currentConfig.isPublished = true
      state.value.currentConfig.updatedAt = Date.now()
    } catch (error) {
      console.error('发布配置失败:', error)
      throw error
    }
  }

  const undo = () => {
    if (state.value.configHistory.length > 1) {
      // 移除当前状态
      state.value.configHistory.shift()
      // 恢复到上一个状态
      state.value.currentConfig = { ...state.value.configHistory[0] }
    }
  }

  const loadTemplates = async () => {
    try {
      // 模拟加载模板
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockTemplates: ComponentTemplate[] = [
        {
          id: 'template_1',
          name: '基础柱状图',
          type: 'chart',
          category: 'charts',
          icon: 'Histogram',
          description: '基础的柱状图组件',
          defaultConfig: {
            type: 'bar',
            title: '柱状图',
            xAxis: { type: 'category' },
            yAxis: { type: 'value' }
          },
          preview: 'bar-chart'
        },
        {
          id: 'template_2',
          name: '折线图',
          type: 'chart',
          category: 'charts',
          icon: 'LineChart',
          description: '趋势折线图组件',
          defaultConfig: {
            type: 'line',
            title: '折线图',
            xAxis: { type: 'category' },
            yAxis: { type: 'value' }
          },
          preview: 'line-chart'
        },
        {
          id: 'template_3',
          name: '指标卡片',
          type: 'metric',
          category: 'metrics',
          icon: 'DataBoard',
          description: '显示关键指标的卡片',
          defaultConfig: {
            title: '指标',
            value: 0,
            unit: '',
            trend: 'none'
          },
          preview: 'metric-card'
        }
      ]
      
      state.value.templates = mockTemplates
    } catch (error) {
      console.error('加载模板失败:', error)
    }
  }

  const setAutoSave = (enabled: boolean) => {
    state.value.autoSave = enabled
  }

  const setSaveInterval = (interval: number) => {
    state.value.saveInterval = interval
  }

  // 初始化
  const initialize = async () => {
    await loadTemplates()
    
    // 设置自动保存
    if (state.value.autoSave) {
      setInterval(autoSave, state.value.saveInterval)
    }
  }

  return {
    // 状态
    state: state.value,
    
    // 计算属性
    currentConfig,
    configHistory,
    templates,
    hasUnsavedChanges,
    componentTemplatesByCategory,
    chartTemplates,
    metricTemplates,
    textTemplates,
    
    // 方法
    createNewConfig,
    loadConfig,
    saveConfig,
    autoSave,
    addComponent,
    updateComponent,
    removeComponent,
    updateLayout,
    updateStyle,
    addDataSource,
    publishConfig,
    undo,
    loadTemplates,
    setAutoSave,
    setSaveInterval,
    initialize
  }
})