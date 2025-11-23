import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'

// 配置 Element Plus 组件库
config.global.plugins = [ElementPlus]

// 模拟 window.performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 3000000
    }
  },
  writable: true
})

// 模拟 ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver

// 模拟 IntersectionObserver
class IntersectionObserver {
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe(_target: Element) {}
  unobserve(_target: Element) {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserver as any

// 模拟 Canvas API (用于 ECharts)
class MockCanvasRenderingContext2D {
  clearRect() {}
  fillRect() {}
  strokeRect() {}
  fillText() {}
  strokeText() {}
  measureText() { return { width: 0 } }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  rect() {}
  fill() {}
  stroke() {}
  clip() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  transform() {}
  setTransform() {}
  createLinearGradient() { return { addColorStop() {} } }
  createRadialGradient() { return { addColorStop() {} } }
  createPattern() { return {} }
}

// 模拟 HTMLCanvasElement
class MockHTMLCanvasElement {
  getContext(contextId: string) {
    if (contextId === '2d') {
      return new MockCanvasRenderingContext2D()
    }
    return null
  }
  get width() { return 800 }
  set width(_val: number) {}
  get height() { return 600 }
  set height(_val: number) {}
  addEventListener() {}
  removeEventListener() {}
  toDataURL() { return 'data:image/png;base64,' }
}

// 全局模拟 Canvas
Object.defineProperty(window, 'HTMLCanvasElement', {
  value: MockHTMLCanvasElement
})

// 模拟 document.createElement 以支持 Canvas
const originalCreateElement = document.createElement
document.createElement = function(tagName: string) {
  if (tagName.toLowerCase() === 'canvas') {
    return new MockHTMLCanvasElement() as any
  }
  return originalCreateElement.call(this, tagName)
}