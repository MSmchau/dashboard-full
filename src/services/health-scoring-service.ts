import { ref } from 'vue'

// 设备健康度评分接口
export interface HealthScore {
  overall: number // 综合评分 0-100
  status: 'healthy' | 'warning' | 'danger' // 健康状态
  details: {
    cpu: number
    memory: number
    disk: number
    network: number
    temperature: number
    uptime: number
  }
  recommendations: string[] // 改进建议
}

// 设备指标接口
export interface DeviceMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkThroughput: number
  temperature: number
  humidity?: number
  pressure?: number
  lastUpdate: number
}

// 健康度评分服务类
export class HealthScoringService {
  // 指标权重配置
  private readonly weights = {
    cpu: 0.25,      // CPU使用率权重
    memory: 0.20,   // 内存使用率权重
    disk: 0.15,     // 磁盘使用率权重
    network: 0.15,  // 网络吞吐量权重
    temperature: 0.15, // 温度权重
    uptime: 0.10    // 运行时间权重
  }

  // 指标阈值配置
  private readonly thresholds = {
    cpu: { optimal: 30, warning: 70, danger: 85 },
    memory: { optimal: 40, warning: 75, danger: 90 },
    disk: { optimal: 20, warning: 80, danger: 95 },
    network: { optimal: 80, warning: 40, danger: 20 }, // 网络吞吐量越高越好
    temperature: { optimal: 35, warning: 60, danger: 75 },
    uptime: { optimal: 95, warning: 80, danger: 60 } // 运行时间百分比
  }

  /**
   * 计算单个指标的评分
   * @param value 指标值
   * @param threshold 阈值配置
   * @param higherIsBetter 值越高是否越好
   * @returns 0-100的评分
   */
  private calculateMetricScore(
    value: number,
    threshold: { optimal: number; warning: number; danger: number },
    higherIsBetter: boolean = false
  ): number {
    if (higherIsBetter) {
      // 值越高越好（如网络吞吐量、运行时间）
      if (value >= threshold.optimal) return 100
      if (value <= threshold.danger) return 0
      
      const range = threshold.optimal - threshold.danger
      const progress = (value - threshold.danger) / range
      return Math.max(0, Math.min(100, progress * 100))
    } else {
      // 值越低越好（如CPU、内存、磁盘使用率、温度）
      if (value <= threshold.optimal) return 100
      if (value >= threshold.danger) return 0
      
      const range = threshold.danger - threshold.optimal
      const progress = (threshold.danger - value) / range
      return Math.max(0, Math.min(100, progress * 100))
    }
  }

  /**
   * 计算设备健康度评分
   * @param metrics 设备指标数据
   * @returns 健康度评分对象
   */
  calculateHealthScore(metrics: DeviceMetrics): HealthScore {
    // 计算各指标评分
    const cpuScore = this.calculateMetricScore(metrics.cpuUsage, this.thresholds.cpu)
    const memoryScore = this.calculateMetricScore(metrics.memoryUsage, this.thresholds.memory)
    const diskScore = this.calculateMetricScore(metrics.diskUsage, this.thresholds.disk)
    const networkScore = this.calculateMetricScore(metrics.networkThroughput, this.thresholds.network, true)
    const temperatureScore = this.calculateMetricScore(metrics.temperature, this.thresholds.temperature)
    
    // 计算运行时间评分（基于最后更新时间）
    const uptimeHours = (Date.now() - metrics.lastUpdate) / (1000 * 60 * 60)
    const uptimeScore = uptimeHours < 1 ? 100 : Math.max(0, 100 - (uptimeHours - 1) * 5)

    // 计算加权综合评分
    const overallScore = Math.round(
      cpuScore * this.weights.cpu +
      memoryScore * this.weights.memory +
      diskScore * this.weights.disk +
      networkScore * this.weights.network +
      temperatureScore * this.weights.temperature +
      uptimeScore * this.weights.uptime
    )

    // 确定健康状态
    let status: 'healthy' | 'warning' | 'danger'
    if (overallScore >= 80) {
      status = 'healthy'
    } else if (overallScore >= 60) {
      status = 'warning'
    } else {
      status = 'danger'
    }

    // 生成改进建议
    const recommendations = this.generateRecommendations({
      cpu: cpuScore,
      memory: memoryScore,
      disk: diskScore,
      network: networkScore,
      temperature: temperatureScore,
      uptime: uptimeScore
    })

    return {
      overall: overallScore,
      status,
      details: {
        cpu: cpuScore,
        memory: memoryScore,
        disk: diskScore,
        network: networkScore,
        temperature: temperatureScore,
        uptime: uptimeScore
      },
      recommendations
    }
  }

  /**
   * 生成改进建议
   * @param scores 各指标评分
   * @returns 改进建议列表
   */
  private generateRecommendations(scores: Record<string, number>): string[] {
    const recommendations: string[] = []

    if (scores.cpu < 70) {
      recommendations.push('CPU使用率较高，建议优化应用程序或增加计算资源')
    }
    
    if (scores.memory < 70) {
      recommendations.push('内存使用率较高，建议检查内存泄漏或增加内存容量')
    }
    
    if (scores.disk < 70) {
      recommendations.push('磁盘使用率较高，建议清理无用文件或扩容存储空间')
    }
    
    if (scores.network < 70) {
      recommendations.push('网络吞吐量较低，建议检查网络连接或优化网络配置')
    }
    
    if (scores.temperature < 70) {
      recommendations.push('设备温度较高，建议检查散热系统或改善通风环境')
    }
    
    if (scores.uptime < 70) {
      recommendations.push('设备运行时间异常，建议检查设备稳定性或重启系统')
    }

    // 如果没有问题，添加正面反馈
    if (recommendations.length === 0) {
      recommendations.push('设备运行状态良好，继续保持')
    }

    return recommendations
  }

  /**
   * 获取健康状态对应的颜色
   * @param status 健康状态
   * @returns 颜色值
   */
  getStatusColor(status: 'healthy' | 'warning' | 'danger'): string {
    const colors = {
      healthy: '#52c41a', // 绿色
      warning: '#faad14', // 橙色
      danger: '#f5222d'   // 红色
    }
    return colors[status]
  }

  /**
   * 获取健康状态对应的图标
   * @param status 健康状态
   * @returns 图标类名
   */
  getStatusIcon(status: 'healthy' | 'warning' | 'danger'): string {
    const icons = {
      healthy: 'el-icon-success',
      warning: 'el-icon-warning',
      danger: 'el-icon-error'
    }
    return icons[status]
  }
}

// 创建单例实例
export const healthScoringService = new HealthScoringService()

// Vue组合式函数
export function useHealthScoring() {
  const healthScore = ref<HealthScore | null>(null)
  const isLoading = ref(false)

  const calculateScore = async (metrics: DeviceMetrics) => {
    isLoading.value = true
    try {
      // 模拟异步计算（实际可能是API调用）
      await new Promise(resolve => setTimeout(resolve, 100))
      healthScore.value = healthScoringService.calculateHealthScore(metrics)
    } catch (error) {
      console.error('健康度评分计算失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    healthScore,
    isLoading,
    calculateScore
  }
}