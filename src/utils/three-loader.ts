// Three.js 懒加载工具函数
let threePromise: Promise<typeof import('three')> | null = null

// 性能监控数据
let performanceStats = {
  loadCount: 0,
  lastLoadTime: 0,
  averageLoadTime: 0
}

export async function loadThree(): Promise<typeof import('three')> {
  if (threePromise) {
    return threePromise
  }
  
  const startTime = performance.now()
  
  threePromise = import('three')
    .then(module => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // 更新性能统计
      performanceStats.loadCount++
      performanceStats.lastLoadTime = loadTime
      performanceStats.averageLoadTime = 
        (performanceStats.averageLoadTime * (performanceStats.loadCount - 1) + loadTime) / performanceStats.loadCount
      
      console.log(`Three.js加载完成，耗时: ${loadTime.toFixed(2)}ms`)
      return module
    })
    .catch(error => {
      console.error('Three.js加载失败:', error)
      threePromise = null // 重置缓存，允许重试
      throw error
    })
  
  return threePromise
}

// 按需加载Three.js组件
export async function loadThreeComponents() {
  const THREE = await loadThree()
  
  return {
    Scene: THREE.Scene,
    PerspectiveCamera: THREE.PerspectiveCamera,
    WebGLRenderer: THREE.WebGLRenderer,
    Color: THREE.Color,
    AmbientLight: THREE.AmbientLight,
    DirectionalLight: THREE.DirectionalLight,
    BoxGeometry: THREE.BoxGeometry,
    SphereGeometry: THREE.SphereGeometry,
    MeshPhongMaterial: THREE.MeshPhongMaterial,
    MeshBasicMaterial: THREE.MeshBasicMaterial,
    Mesh: THREE.Mesh,
    Vector3: THREE.Vector3
  }
}

// 高级Three.js组件加载（包含更多优化功能）
export async function loadAdvancedThreeComponents() {
  const THREE = await loadThree()
  
  return {
    // 基础组件
    Scene: THREE.Scene,
    PerspectiveCamera: THREE.PerspectiveCamera,
    WebGLRenderer: THREE.WebGLRenderer,
    Color: THREE.Color,
    
    // 灯光组件
    AmbientLight: THREE.AmbientLight,
    DirectionalLight: THREE.DirectionalLight,
    PointLight: THREE.PointLight,
    SpotLight: THREE.SpotLight,
    
    // 几何体组件
    BoxGeometry: THREE.BoxGeometry,
    SphereGeometry: THREE.SphereGeometry,
    CylinderGeometry: THREE.CylinderGeometry,
    PlaneGeometry: THREE.PlaneGeometry,
    
    // 材质组件
    MeshPhongMaterial: THREE.MeshPhongMaterial,
    MeshBasicMaterial: THREE.MeshBasicMaterial,
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    MeshLambertMaterial: THREE.MeshLambertMaterial,
    
    // 其他组件
    Mesh: THREE.Mesh,
    Vector3: THREE.Vector3,
    Group: THREE.Group,
    
    // 性能优化相关
    Object3D: THREE.Object3D,
    BufferGeometry: THREE.BufferGeometry,
    InstancedMesh: THREE.InstancedMesh
  }
}

// 清理Three.js资源
export function disposeThreeResources(renderer?: THREE.WebGLRenderer, scene?: THREE.Scene) {
  if (renderer) {
    renderer.dispose()
  }
  
  if (scene) {
    // 清理场景中的所有对象
    while(scene.children.length > 0) { 
      const object = scene.children[0]
      scene.remove(object)
      
      // 清理几何体和材质 - 需要类型断言
      const mesh = object as THREE.Mesh
      if (mesh.geometry) {
        mesh.geometry.dispose()
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose())
        } else {
          mesh.material.dispose()
        }
      }
    }
  }
  
  // 清理缓存，允许重新加载
  threePromise = null
}

// 获取性能统计
export function getThreePerformanceStats() {
  return {
    ...performanceStats,
    cacheHit: performanceStats.loadCount > 1
  }
}

// 重置性能统计
export function resetThreePerformanceStats() {
  performanceStats = {
    loadCount: 0,
    lastLoadTime: 0,
    averageLoadTime: 0
  }
}

// 性能优化建议
export function getPerformanceSuggestions() {
  const suggestions = []
  
  if (performanceStats.averageLoadTime > 1000) {
    suggestions.push('Three.js加载时间较长，建议使用CDN或预加载策略')
  }
  
  if (performanceStats.loadCount > 5) {
    suggestions.push('Three.js被多次加载，建议检查组件卸载逻辑')
  }
  
  return suggestions
}