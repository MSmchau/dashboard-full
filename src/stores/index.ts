import { createPinia } from 'pinia'

// 创建并配置Pinia实例
export const pinia = createPinia()

// 导出所有store
export * from './dashboard'
export * from './device'
export * from './config'
export * from './user'

// 默认导出
export default pinia