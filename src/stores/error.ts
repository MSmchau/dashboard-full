import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ErrorInfo {
  id: string
  message: string
  component: string
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  timestamp: number
  resolved: boolean
  details?: Record<string, any>
}

export const useErrorStore = defineStore('error', () => {
  // 状态
  const errors = ref<ErrorInfo[]>([])
  
  // 计算属性
  const unresolvedErrors = computed(() => 
    errors.value.filter(error => !error.resolved)
  )
  
  const errorCountsBySeverity = computed(() => {
    const counts = {
      DEBUG: 0,
      INFO: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0
    }
    
    errors.value.forEach(error => {
      counts[error.severity]++
    })
    
    return counts
  })
  
  const recentErrors = computed(() => 
    errors.value
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
  )
  
  // 动作
  const addError = (error: Omit<ErrorInfo, 'id' | 'timestamp' | 'resolved'>) => {
    const newError: ErrorInfo = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...error
    }
    
    errors.value.push(newError)
    return newError.id
  }
  
  const resolveError = (id: string) => {
    const error = errors.value.find(e => e.id === id)
    if (error) {
      error.resolved = true
    }
  }
  
  const clearResolvedErrors = () => {
    errors.value = errors.value.filter(error => !error.resolved)
  }
  
  const clearAllErrors = () => {
    errors.value = []
  }
  
  const getErrorById = (id: string) => {
    return errors.value.find(error => error.id === id)
  }
  
  const getErrorsByComponent = (component: string) => {
    return errors.value.filter(error => error.component === component)
  }
  
  const getErrorsBySeverity = (severity: ErrorInfo['severity']) => {
    return errors.value.filter(error => error.severity === severity)
  }
  
  return {
    // 状态
    errors,
    
    // 计算属性
    unresolvedErrors,
    errorCountsBySeverity,
    recentErrors,
    
    // 动作
    addError,
    resolveError,
    clearResolvedErrors,
    clearAllErrors,
    getErrorById,
    getErrorsByComponent,
    getErrorsBySeverity
  }
})