<template>
  <div class="three-d-scene-container">
    <!-- 3D场景控制面板 -->
    <div class="scene-controls">
      <div class="control-group">
        <el-button-group>
          <el-button size="small" @click="resetCamera" :disabled="loading">
            <el-icon><View /></el-icon>
            重置视角
          </el-button>
          <el-button size="small" @click="toggleAutoRotation" :disabled="loading">
            <el-icon><Refresh /></el-icon>
            {{ autoRotation ? '停止旋转' : '自动旋转' }}
          </el-button>
        </el-button-group>
      </div>
      
      <div class="control-group">
        <el-select v-model="selectedDevice" placeholder="选择设备" size="small" @change="focusOnDevice" :disabled="loading">
          <el-option
            v-for="device in devices"
            :key="device.id"
            :label="device.name"
            :value="device.id"
          />
        </el-select>
      </div>
      
      <div class="control-group">
        <el-switch v-model="showGrid" size="small" @change="toggleGrid" :disabled="loading">
          <template #active-text>显示网格</template>
          <template #inactive-text>隐藏网格</template>
        </el-switch>
      </div>
      
      <div class="control-group">
        <el-slider
          v-model="animationSpeed"
          :min="0"
          :max="2"
          :step="0.1"
          size="small"
          @change="updateAnimationSpeed"
          :disabled="loading"
        />
        <span class="slider-label">动画速度</span>
      </div>
    </div>

    <!-- 3D场景渲染区域 -->
    <div ref="sceneContainer" class="scene-renderer">
      <div v-if="loading" class="loading-overlay">
        <el-icon class="loading-icon" :size="40"><Loading /></el-icon>
        <div class="loading-text">正在加载3D场景...</div>
        <div class="loading-progress">
          <el-progress :percentage="loadingProgress" :show-text="false" />
          <div class="progress-text">{{ loadingProgress }}%</div>
        </div>
      </div>
      
      <div v-if="error" class="error-overlay">
        <el-icon class="error-icon" :size="40"><WarningFilled /></el-icon>
        <div class="error-text">{{ error }}</div>
        <el-button type="primary" @click="retryLoad">重试</el-button>
      </div>
      
      <!-- 设备信息弹窗 -->
      <div v-if="selectedDeviceInfo" class="device-info-popup" :style="deviceInfoStyle">
        <div class="popup-header">
          <span class="device-name">{{ selectedDeviceInfo.name }}</span>
          <el-button size="small" type="danger" @click="closeDeviceInfo">×</el-button>
        </div>
        <div class="popup-content">
          <div class="info-row">
            <span class="label">状态:</span>
            <span class="value" :class="`status-${selectedDeviceInfo.status}`">
              {{ getStatusText(selectedDeviceInfo.status) }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">CPU:</span>
            <span class="value">{{ selectedDeviceInfo.cpu }}%</span>
          </div>
          <div class="info-row">
            <span class="label">内存:</span>
            <span class="value">{{ selectedDeviceInfo.memory }}%</span>
          </div>
          <div class="info-row">
            <span class="label">温度:</span>
            <span class="value">{{ selectedDeviceInfo.temperature }}°C</span>
          </div>
          <div class="info-row">
            <span class="label">运行时长:</span>
            <span class="value">{{ selectedDeviceInfo.uptime }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 场景统计信息 -->
    <div class="scene-stats">
      <div class="stat-item">
        <span class="stat-label">设备总数:</span>
        <span class="stat-value">{{ devices.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">在线设备:</span>
        <span class="stat-value">{{ onlineDevicesCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">FPS:</span>
        <span class="stat-value">{{ fps }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">渲染时间:</span>
        <span class="stat-value">{{ renderTime }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { View, Refresh, Loading, WarningFilled } from '@element-plus/icons-vue'

// 组件状态
const sceneContainer = ref<HTMLElement>()
const loading = ref(true)
const loadingProgress = ref(0)
const error = ref<string | null>(null)
const autoRotation = ref(false)
const showGrid = ref(false)
const animationSpeed = ref(1.0)
const selectedDevice = ref<string | null>(null)
const selectedDeviceInfo = ref<any>(null)
const deviceInfoStyle = ref({})
const fps = ref(60)
const renderTime = ref(16)

// Three.js相关变量
let scene: any = null
let camera: any = null
let renderer: any = null
let controls: any = null
let raycaster: any = null
let mouse: any = null
let deviceMeshes: Map<string, any> = new Map()
let gridHelper: any = null
let animationId: number | null = null
let lastFrameTime = performance.now()
let frameCount = 0

// 设备数据类型定义
interface SceneDevice {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning' | 'error'
  cpu: number
  memory: number
  temperature: number
  uptime: string
  metrics: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkThroughput: number
    temperature: number
    humidity: number
    pressure: number
  }
  position: {
    x: number
    y: number
    z: number
  }
}

// 模拟设备数据
const devices = ref<SceneDevice[]>([
  { 
    id: 'device1', 
    name: '服务器A', 
    status: 'online', 
    cpu: 68, 
    memory: 72, 
    temperature: 45, 
    uptime: '365天',
    metrics: { cpuUsage: 68, memoryUsage: 72, diskUsage: 45, networkThroughput: 1000, temperature: 45, humidity: 40, pressure: 1013 },
    position: { x: -3, y: 0, z: 0 } 
  },
  { 
    id: 'device2', 
    name: '服务器B', 
    status: 'online', 
    cpu: 75, 
    memory: 68, 
    temperature: 48, 
    uptime: '365天',
    metrics: { cpuUsage: 75, memoryUsage: 68, diskUsage: 52, networkThroughput: 1200, temperature: 48, humidity: 42, pressure: 1012 },
    position: { x: 3, y: 0, z: 0 } 
  },
  { 
    id: 'device3', 
    name: '服务器C', 
    status: 'offline', 
    cpu: 0, 
    memory: 0, 
    temperature: 25, 
    uptime: '0天',
    metrics: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, networkThroughput: 0, temperature: 25, humidity: 30, pressure: 1015 },
    position: { x: 0, y: 0, z: -3 } 
  },
  { 
    id: 'device4', 
    name: '交换机A', 
    status: 'warning', 
    cpu: 85, 
    memory: 90, 
    temperature: 55, 
    uptime: '365天',
    metrics: { cpuUsage: 85, memoryUsage: 90, diskUsage: 78, networkThroughput: 800, temperature: 55, humidity: 45, pressure: 1010 },
    position: { x: 0, y: 0, z: 3 } 
  },
  { 
    id: 'device5', 
    name: '存储A', 
    status: 'online', 
    cpu: 45, 
    memory: 65, 
    temperature: 40, 
    uptime: '365天',
    metrics: { cpuUsage: 45, memoryUsage: 65, diskUsage: 60, networkThroughput: 600, temperature: 40, humidity: 35, pressure: 1014 },
    position: { x: -2, y: 0, z: 2 } 
  },
  { 
    id: 'device6', 
    name: '防火墙A', 
    status: 'online', 
    cpu: 35, 
    memory: 40, 
    temperature: 38, 
    uptime: '365天',
    metrics: { cpuUsage: 35, memoryUsage: 40, diskUsage: 30, networkThroughput: 500, temperature: 38, humidity: 38, pressure: 1013 },
    position: { x: 2, y: 0, z: -2 } 
  }
])

const onlineDevicesCount = computed(() => {
  return devices.value.filter(device => device.status === 'online').length
})

// 工具方法
const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'online': '在线',
    'offline': '离线',
    'warning': '告警',
    'error': '故障'
  }
  return statusMap[status] || status
}

const getDeviceColor = (status: string) => {
  const colorMap: { [key: string]: number } = {
    'online': 0x52c41a,
    'offline': 0x8c8c8c,
    'warning': 0xfaad14,
    'error': 0xff4d4f
  }
  return colorMap[status] || 0x1890ff
}

// 初始化3D场景
const initScene = async () => {
  try {
    console.log('开始初始化3D场景...')
    loading.value = true
    error.value = null
    loadingProgress.value = 0

    // 加载Three.js模块
    const THREE = await import('three')
    console.log('Three.js模块加载成功')
    
    loadingProgress.value = 20

    // 创建场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f1419)
    scene.fog = new THREE.Fog(0x0f1419, 10, 50)
    console.log('3D场景创建成功')

    loadingProgress.value = 30

    // 创建相机 - 使用固定宽高比 (16:9)
    camera = new THREE.PerspectiveCamera(
      75, 
      16 / 9, 
      0.1, 
      1000
    )
    camera.position.set(8, 6, 8)
    console.log('相机创建成功')

    loadingProgress.value = 40

    // 创建渲染器 - 使用固定尺寸
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    })
    renderer.setSize(800, 600) // 固定尺寸
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    sceneContainer.value!.appendChild(renderer.domElement)
    console.log('渲染器创建成功')

    loadingProgress.value = 50

    // 添加光源
    addLighting(THREE)

    loadingProgress.value = 60

    // 创建网格地面
    const groundGeometry = new THREE.PlaneGeometry(20, 20)
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    loadingProgress.value = 70

    // 添加设备模型
    await createDeviceModels(THREE)

    loadingProgress.value = 80

    // 添加控制
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.maxPolarAngle = Math.PI / 2
    controls.minDistance = 5
    controls.maxDistance = 20

    loadingProgress.value = 90

    // 添加鼠标交互
    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()
    
    // 添加事件监听
    renderer.domElement.addEventListener('click', onDeviceClick)
    
    // 移除响应式处理 - 注释掉窗口大小变化监听器
    // window.addEventListener('resize', handleResize)

    loadingProgress.value = 100

    // 启动动画循环
    startAnimationLoop()

    console.log('3D场景初始化完成!')
    loading.value = false
  } catch (err) {
    console.error('3D场景初始化失败:', err)
    error.value = '3D场景加载失败，请检查网络连接'
    loading.value = false
  }
}

const addLighting = (THREE: any) => {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
  scene.add(ambientLight)

  // 主光源
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 50
  scene.add(directionalLight)

  // 点光源
  const pointLight = new THREE.PointLight(0x1890ff, 0.5, 100)
  pointLight.position.set(0, 5, 0)
  scene.add(pointLight)
}

const createDeviceModels = async (THREE: any) => {
  const devicePromises = devices.value.map(async (device, index) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 创建更真实的设备模型
    const deviceGroup = new THREE.Group()
    
    // 主体设备
    const mainGeometry = new THREE.BoxGeometry(1.2, 2.2, 1.2)
    const mainMaterial = new THREE.MeshStandardMaterial({ 
      color: getDeviceColor(device.status),
      roughness: 0.4,
      metalness: 0.6,
      emissive: getDeviceColor(device.status),
      emissiveIntensity: 0.1
    })
    const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial)
    mainMesh.castShadow = true
    mainMesh.receiveShadow = true
    mainMesh.userData = { device, type: 'main' }
    deviceGroup.add(mainMesh)
    
    // 添加设备细节 - 顶部指示灯
    const indicatorGeometry = new THREE.SphereGeometry(0.1, 16, 16)
    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: getDeviceColor(device.status),
      emissive: getDeviceColor(device.status),
      emissiveIntensity: 0.5
    })
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial)
    indicator.position.set(0, 1.3, 0.6)
    indicator.userData = { device, type: 'indicator' }
    deviceGroup.add(indicator)
    
    // 添加侧面面板
    const panelGeometry = new THREE.PlaneGeometry(1, 1.5)
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2
    })
    const panel = new THREE.Mesh(panelGeometry, panelMaterial)
    panel.position.set(0.6, 0, 0)
    panel.rotation.y = -Math.PI / 2
    panel.userData = { device, type: 'panel' }
    deviceGroup.add(panel)
    
    // 添加数据线缆
    const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2)
    const cableMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.6,
      metalness: 0.4
    })
    const cable = new THREE.Mesh(cableGeometry, cableMaterial)
    cable.position.set(-0.8, 0, 0)
    cable.rotation.z = Math.PI / 2
    cable.userData = { device, type: 'cable' }
    deviceGroup.add(cable)
    
    deviceGroup.position.set(device.position.x, 1.1, device.position.z)
    deviceGroup.userData = { device }
    
    scene.add(deviceGroup)
    deviceMeshes.set(device.id, deviceGroup)
    
    // 添加增强的设备标签 - 包含实时数据
    const enhancedLabel = await createEnhancedLabel(device, THREE)
    enhancedLabel.position.set(device.position.x, 3.5, device.position.z)
    scene.add(enhancedLabel)
    
    // 添加设备状态光晕效果
    const glowGeometry = new THREE.SphereGeometry(2, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: getDeviceColor(device.status),
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.set(device.position.x, 1.1, device.position.z)
    glow.userData = { device, type: 'glow' }
    scene.add(glow)
  })
  
  await Promise.all(devicePromises)
}

const createEnhancedLabel = async (device: SceneDevice, THREE: any) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 320
    canvas.height = 120
    
    // 背景
    context.fillStyle = 'rgba(0, 0, 0, 0.9)'
    context.fillRect(0, 0, 320, 120)
    
    // 边框
    context.strokeStyle = getDeviceColor(device.status)
    context.lineWidth = 2
    context.strokeRect(1, 1, 318, 118)
    
    // 设备名称
    context.fillStyle = '#ffffff'
    context.font = 'bold 16px Arial'
    context.textAlign = 'center'
    context.fillText(device.name, 160, 25)
    
    // 状态信息
    context.font = '12px Arial'
    context.fillStyle = getDeviceColor(device.status)
    context.fillText(`状态: ${getStatusText(device.status)}`, 160, 45)
    
    // 实时数据（如果有）
    if (device.metrics) {
      context.fillStyle = '#ffffff'
      context.font = '11px Arial'
      let yPos = 65
      Object.keys(device.metrics).slice(0, 3).forEach(key => {
        context.fillText(`${key}: ${device.metrics[key]}`, 20, yPos)
        yPos += 15
      })
    }
    
    // 时间戳
    context.fillStyle = 'rgba(255, 255, 255, 0.6)'
    context.font = '10px Arial'
    context.textAlign = 'right'
    const now = new Date()
    context.fillText(now.toLocaleTimeString(), 300, 110)
    
    const texture = new THREE.CanvasTexture(canvas)
    const geometry = new THREE.PlaneGeometry(3.2, 1.2)
    const material = new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true
    })
    
    const label = new THREE.Mesh(geometry, material)
    resolve(label)
  })
}

const startAnimationLoop = () => {
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    
    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime
    
    // 计算FPS
    frameCount++
    if (currentTime >= lastFrameTime + 1000) {
      fps.value = Math.round((frameCount * 1000) / (currentTime - lastFrameTime))
      frameCount = 0
      lastFrameTime = currentTime
    }
    
    renderTime.value = deltaTime.toFixed(1)
    
    // 更新控制
    if (controls) {
      controls.update()
    }
    
    // 自动旋转
    if (autoRotation.value && camera) {
      const time = currentTime * 0.0001 * animationSpeed.value
      camera.position.x = Math.cos(time) * 8
      camera.position.z = Math.sin(time) * 8
      camera.lookAt(0, 0, 0)
    }
    
    // 设备状态动画
    updateDeviceAnimations()
    
    // 渲染
    renderer.render(scene, camera)
  }
  
  animate()
}

const updateDeviceAnimations = () => {
  deviceMeshes.forEach((mesh, deviceId) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (!device) return
    
    // 根据状态设置动画
    switch (device.status) {
      case 'online':
        mesh.rotation.y += 0.01 * animationSpeed.value
        break
      case 'warning':
        mesh.rotation.y += 0.02 * animationSpeed.value
        mesh.scale.setScalar(1 + Math.sin(performance.now() * 0.005) * 0.1)
        break
      case 'error':
        mesh.rotation.y += 0.03 * animationSpeed.value
        mesh.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.2)
        break
    }
  })
}

// 事件处理
const onDeviceClick = (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(Array.from(deviceMeshes.values()))
  
  if (intersects.length > 0) {
    const device = intersects[0].object.userData.device
    showDeviceInfo(device, event)
  }
}

const showDeviceInfo = (device: SceneDevice, event: MouseEvent) => {
  selectedDeviceInfo.value = device
  
  nextTick(() => {
    const popup = document.querySelector('.device-info-popup') as HTMLElement
    if (popup) {
      const rect = renderer.domElement.getBoundingClientRect()
      const popupRect = popup.getBoundingClientRect()
      
      deviceInfoStyle.value = {
        left: (event.clientX - rect.left - popupRect.width / 2) + 'px',
        top: (event.clientY - rect.top - popupRect.height - 10) + 'px'
      }
    }
  })
}

const closeDeviceInfo = () => {
  selectedDeviceInfo.value = null
}

// 移除响应式处理函数 - 原handleResize函数已移除
/* const handleResize = () => {
  if (camera && renderer && sceneContainer.value) {
    const width = sceneContainer.value.clientWidth
    const height = sceneContainer.value.clientHeight
    
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
} */

// 控制方法
const resetCamera = () => {
  if (camera && controls) {
    camera.position.set(8, 6, 8)
    camera.lookAt(0, 0, 0)
    controls.reset()
  }
}

const toggleAutoRotation = () => {
  autoRotation.value = !autoRotation.value
}

const toggleGrid = () => {
  if (showGrid.value && !gridHelper) {
    gridHelper = new (window as any).THREE.GridHelper(20, 20, 0x444444, 0x222222)
    scene.add(gridHelper)
  } else if (!showGrid.value && gridHelper) {
    scene.remove(gridHelper)
    gridHelper = null
  }
}

const updateAnimationSpeed = (speed: number) => {
  animationSpeed.value = speed
}

const focusOnDevice = (deviceId: string) => {
  const mesh = deviceMeshes.get(deviceId)
  if (mesh && camera && controls) {
    const targetPosition = {
      x: mesh.position.x + 3,
      y: mesh.position.y + 2,
      z: mesh.position.z + 3
    }
    
    camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z)
    controls.target.copy(mesh.position)
    controls.update()
  }
}

const retryLoad = () => {
  if (renderer && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
  deviceMeshes.clear()
  initScene()
}

// 生命周期
onMounted(() => {
  // 延迟初始化以确保DOM元素已完全渲染
  setTimeout(() => {
    nextTick(() => {
      if (sceneContainer.value) {
        initScene()
      }
    })
  }, 100)
})

onUnmounted(() => {
  // 清理资源
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (renderer && renderer.domElement) {
    renderer.domElement.removeEventListener('click', onDeviceClick)
  }
  
  // 移除响应式处理监听器 - 原handleResize监听器已注释
  // window.removeEventListener('resize', handleResize)
  
  if (renderer) {
    renderer.dispose()
  }
})

// 监听设备状态变化
watch(devices, () => {
  deviceMeshes.forEach((mesh, deviceId) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device && mesh.userData && mesh.userData.device) {
      updateDeviceAppearance(mesh, device)
    }
  })
}, { deep: true })

// 辅助函数 - 已在前面定义

const updateDeviceAppearance = (mesh: any, device: any) => {
  // 更新主设备颜色
  const mainMesh = mesh.children.find((child: any) => child.userData?.type === 'main')
  if (mainMesh && mainMesh.material) {
    mainMesh.material.color.setHex(getDeviceColor(device.status))
    mainMesh.material.emissive.setHex(getDeviceColor(device.status))
  }
  
  // 更新指示灯
  const indicator = mesh.children.find((child: any) => child.userData?.type === 'indicator')
  if (indicator && indicator.material) {
    indicator.material.color.setHex(getDeviceColor(device.status))
    indicator.material.emissive.setHex(getDeviceColor(device.status))
  }
  
  // 更新光晕效果
  const glow = mesh.children.find((child: any) => child.userData?.type === 'glow')
  if (glow && glow.material) {
    glow.material.color.setHex(getDeviceColor(device.status))
  }
}

// 实时数据更新函数
const updateRealTimeData = () => {
  devices.value.forEach(device => {
    // 模拟实时数据更新
    if (device.metrics) {
      Object.keys(device.metrics).forEach(key => {
        if (typeof device.metrics[key] === 'number') {
          // 添加随机波动
          const currentValue = device.metrics[key]
          const variation = (Math.random() - 0.5) * currentValue * 0.1
          device.metrics[key] = Math.max(0, currentValue + variation)
        }
      })
    }
  })
}

// 设置定时更新
let dataUpdateInterval: NodeJS.Timeout
onMounted(() => {
  dataUpdateInterval = setInterval(updateRealTimeData, 2000) // 每2秒更新一次
})

onUnmounted(() => {
  if (dataUpdateInterval) {
    clearInterval(dataUpdateInterval)
  }
})
</script>

<style scoped>
.three-d-scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0f1419;
  border-radius: 8px;
  overflow: hidden;
}

.scene-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 100;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-label {
  font-size: 12px;
  color: #ffffff;
  white-space: nowrap;
}

.scene-renderer {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 20, 25, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.loading-icon,
.error-icon {
  margin-bottom: 16px;
  color: #1890ff;
}

.error-icon {
  color: #ff4d4f;
}

.loading-text,
.error-text {
  color: #ffffff;
  margin-bottom: 24px;
  font-size: 16px;
}

.loading-progress {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-text {
  color: #ffffff;
  font-size: 12px;
}

.device-info-popup {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #1890ff;
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
  z-index: 150;
  pointer-events: auto;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.device-name {
  font-weight: bold;
  color: #ffffff;
}

.popup-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.info-row .value {
  color: #ffffff;
  font-weight: 500;
  font-size: 13px;
}

.info-row .value.status-online {
  color: #52c41a;
}

.info-row .value.status-offline {
  color: #8c8c8c;
}

.info-row .value.status-warning {
  color: #faad14;
}

.info-row .value.status-error {
  color: #ff4d4f;
}

.scene-stats {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 24px;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  padding: 12px;
  z-index: 100;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
}


</style>
