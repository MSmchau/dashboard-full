import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import en from 'element-plus/es/locale/lang/en'
import App from './App.vue'
import router from './router'
import { permissionDirective, roleDirective, authDirective } from './directives/permission'
import { authService } from './services/auth'

// Element Plus 国际化设置
const messages = {
  'zh-cn': zhCn,
  'zh-tw': zhTw,
  en
}

// 创建应用实例
const app = createApp(App)

// 配置Element Plus
app.use(ElementPlus, {
  locale: messages['zh-cn'],
  zIndex: 3000,
})

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 配置路由
app.use(router)

// 挂载指令
app.directive('permission', permissionDirective)
app.directive('role', roleDirective)
app.directive('auth', authDirective)

// 创建pinia状态管理
const pinia = createPinia()
app.use(pinia)

// 立即挂载应用（不等待异步初始化）
console.log('立即挂载Vue应用到DOM')
const appElement = document.getElementById('app')

if (appElement) {
  app.mount('#app')
  console.log('Vue应用已挂载到DOM')
} else {
  console.error('找不到#app元素，应用无法挂载')
}

// 异步初始化认证服务（在后台进行，不阻塞应用挂载）
const initializeAuth = async () => {
  try {
    console.log('后台初始化认证服务...')
    await authService.init()
    console.log('认证服务初始化完成')
  } catch (error) {
    console.error('认证服务初始化失败:', error)
  }
}

// 延迟启动认证初始化，确保DOM完全就绪
setTimeout(() => {
  initializeAuth()
}, 100)