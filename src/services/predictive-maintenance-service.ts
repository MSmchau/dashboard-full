import { anomalyDetectionService } from './anomaly-detection-service'

// 设备维护状态枚举
export enum MaintenanceStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  MAINTENANCE_REQUIRED = 'maintenance_required'
}

// 设备健康趋势
export enum HealthTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  RAPID_DECLINE = 'rapid_decline'
}

// 预测性维护建议接口
export interface MaintenanceRecommendation {
  id: string
  deviceId: string
  deviceName: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  type: 'inspection' | 'cleaning' | 'replacement' | 'calibration' | 'software_update'
  title: string
  description: string
  estimatedDuration: number // 分钟
  estimatedCost: number // 元
  recommendedDate: Date
  deadline: Date
  impact: string[]
  prerequisites: string[]
}

// 设备健康历史记录
export interface HealthHistory {
  timestamp: Date
  healthScore: number
  metrics: {
    cpu: number
    memory: number
    disk: number
    network: number
    temperature: number
    load: number
  }
  anomalies: number[]
  maintenanceStatus: MaintenanceStatus
}

// 预测性维护服务类
export class PredictiveMaintenanceService {
  private healthHistory: Map<string, HealthHistory[]> = new Map()
  private recommendations: MaintenanceRecommendation[] = []
  
  // 初始化服务
  async initialize(): Promise<void> {
    try {
      await anomalyDetectionService.initModel()
      
      // 生成模拟训练数据并训练模型
      const trainingData = anomalyDetectionService.generateTrainingData(2000)
      await anomalyDetectionService.trainModel(trainingData)
      
      console.log('预测性维护服务初始化完成')
    } catch (error) {
      console.error('预测性维护服务初始化失败:', error)
      throw error
    }
  }

  // 分析设备健康状况
  async analyzeDeviceHealth(
    deviceId: string,
    deviceName: string,
    currentMetrics: {
      cpu: number
      memory: number
      disk: number
      network: number
      temperature: number
      load: number
    }
  ): Promise<{
    healthScore: number
    maintenanceStatus: MaintenanceStatus
    healthTrend: HealthTrend
    riskLevel: number
    recommendations: MaintenanceRecommendation[]
    anomalies: number[]
  }> {
    try {
      // 转换为模型输入格式
      const metricsArray = [
        currentMetrics.cpu,
        currentMetrics.memory,
        currentMetrics.disk,
        currentMetrics.network,
        currentMetrics.temperature,
        currentMetrics.load
      ]

      // 检测异常
      const detectionResult = await anomalyDetectionService.detectAnomalies([metricsArray])
      const anomalies = detectionResult.anomalies[0] ? detectionResult.scores : []

      // 计算健康评分
      const healthScore = this.calculateHealthScore(currentMetrics, anomalies)
      
      // 确定维护状态
      const maintenanceStatus = this.determineMaintenanceStatus(healthScore, anomalies)
      
      // 分析健康趋势
      const healthTrend = await this.analyzeHealthTrend(deviceId, healthScore)
      
      // 计算风险等级
      const riskLevel = this.calculateRiskLevel(healthScore, healthTrend, anomalies.length)
      
      // 生成维护建议
      const recommendations = await this.generateRecommendations(
        deviceId,
        deviceName,
        currentMetrics,
        maintenanceStatus,
        healthTrend,
        riskLevel
      )

      // 保存健康历史
      this.saveHealthHistory(deviceId, {
        timestamp: new Date(),
        healthScore,
        metrics: currentMetrics,
        anomalies,
        maintenanceStatus
      })

      return {
        healthScore,
        maintenanceStatus,
        healthTrend,
        riskLevel,
        recommendations,
        anomalies
      }
    } catch (error) {
      console.error('设备健康分析失败:', error)
      throw error
    }
  }

  // 计算健康评分
  private calculateHealthScore(metrics: any, anomalies: number[]): number {
    // 基础评分（基于指标正常程度）
    let baseScore = 100
    
    // CPU使用率惩罚
    if (metrics.cpu > 80) baseScore -= (metrics.cpu - 80) * 0.5
    if (metrics.cpu > 95) baseScore -= 10
    
    // 内存使用率惩罚
    if (metrics.memory > 80) baseScore -= (metrics.memory - 80) * 0.4
    if (metrics.memory > 95) baseScore -= 8
    
    // 磁盘使用率惩罚
    if (metrics.disk > 85) baseScore -= (metrics.disk - 85) * 0.3
    if (metrics.disk > 95) baseScore -= 6
    
    // 温度惩罚
    if (metrics.temperature > 70) baseScore -= (metrics.temperature - 70) * 0.8
    if (metrics.temperature > 85) baseScore -= 15
    
    // 负载惩罚
    if (metrics.load > 4) baseScore -= (metrics.load - 4) * 2
    if (metrics.load > 6) baseScore -= 12
    
    // 异常检测惩罚
    if (anomalies.length > 0) {
      const maxAnomalyScore = Math.max(...anomalies)
      baseScore -= maxAnomalyScore * 5
    }
    
    return Math.max(0, Math.min(100, baseScore))
  }

  // 确定维护状态
  private determineMaintenanceStatus(healthScore: number, anomalies: number[]): MaintenanceStatus {
    if (healthScore >= 80 && anomalies.length === 0) {
      return MaintenanceStatus.NORMAL
    } else if (healthScore >= 60 && anomalies.length <= 1) {
      return MaintenanceStatus.WARNING
    } else if (healthScore >= 40 || anomalies.length <= 2) {
      return MaintenanceStatus.CRITICAL
    } else {
      return MaintenanceStatus.MAINTENANCE_REQUIRED
    }
  }

  // 分析健康趋势
  private async analyzeHealthTrend(deviceId: string, currentScore: number): Promise<HealthTrend> {
    const history = this.healthHistory.get(deviceId) || []
    
    if (history.length < 3) {
      return HealthTrend.STABLE
    }
    
    // 获取最近的数据点
    const recentScores = history
      .slice(-6) // 最近6个数据点
      .map(record => record.healthScore)
    
    // 计算趋势
    const trend = this.calculateTrend(recentScores, currentScore)
    
    return trend
  }

  // 计算趋势
  private calculateTrend(scores: number[], currentScore: number): HealthTrend {
    if (scores.length < 2) return HealthTrend.STABLE
   // 计算趋势
    const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length
    
    const diff = currentScore - avgRecent
    
    if (diff > 5) return HealthTrend.IMPROVING
    if (diff < -10) return HealthTrend.RAPID_DECLINE
    if (diff < -3) return HealthTrend.DECLINING
    
    return HealthTrend.STABLE
  }

  // 计算风险等级
  private calculateRiskLevel(healthScore: number, trend: HealthTrend, anomalyCount: number): number {
    let risk = 0
    
    // 健康评分风险
    if (healthScore < 40) risk += 40
    else if (healthScore < 60) risk += 20
    else if (healthScore < 80) risk += 10
    
    // 趋势风险
    if (trend === HealthTrend.RAPID_DECLINE) risk += 30
    else if (trend === HealthTrend.DECLINING) risk += 15
    
    // 异常数量风险
    risk += anomalyCount * 5
    
    return Math.min(100, risk)
  }

  // 生成维护建议
  private async generateRecommendations(
    deviceId: string,
    deviceName: string,
    metrics: any,
    status: MaintenanceStatus,
    trend: HealthTrend,
    riskLevel: number
  ): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = []
    const now = new Date()
    
    // 基于状态和风险生成建议
    if (status === MaintenanceStatus.MAINTENANCE_REQUIRED || riskLevel > 70) {
      recommendations.push({
        id: `rec_${deviceId}_${Date.now()}_critical`,
        deviceId,
        deviceName,
        priority: 'critical',
        type: 'inspection',
        title: '紧急设备检查',
        description: '设备健康状态严重下降，需要立即进行全面检查',
        estimatedDuration: 120,
        estimatedCost: 500,
        recommendedDate: now,
        deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24小时内
        impact: ['可能影响生产', '需要停机维护'],
        prerequisites: ['准备备用设备', '通知相关人员']
      })
    }
    
    if (metrics.cpu > 85) {
      recommendations.push({
        id: `rec_${deviceId}_${Date.now()}_cpu`,
        deviceId,
        deviceName,
        priority: metrics.cpu > 95 ? 'high' : 'medium',
        type: 'cleaning',
        title: 'CPU散热系统清理',
        description: `CPU使用率过高（${metrics.cpu.toFixed(1)}%），建议清理散热系统`,
        estimatedDuration: 60,
        estimatedCost: 200,
        recommendedDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3天内
        deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7天内
        impact: ['短暂停机'],
        prerequisites: ['准备清洁工具']
      })
    }
    
    if (metrics.temperature > 75) {
      recommendations.push({
        id: `rec_${deviceId}_${Date.now()}_temp`,
        deviceId,
        deviceName,
        priority: metrics.temperature > 80 ? 'high' : 'medium',
        type: 'inspection',
        title: '温度控制系统检查',
        description: `设备温度过高（${metrics.temperature.toFixed(1)}°C），建议检查冷却系统`,
        estimatedDuration: 90,
        estimatedCost: 300,
        recommendedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2天内
        deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5天内
        impact: ['需要专业技术人员'],
        prerequisites: ['检查冷却液', '准备温度检测设备']
      })
    }
    
    if (trend === HealthTrend.DECLINING || trend === HealthTrend.RAPID_DECLINE) {
      recommendations.push({
        id: `rec_${deviceId}_${Date.now()}_trend`,
        deviceId,
        deviceName,
        priority: 'medium',
        type: 'calibration',
        title: '设备性能校准',
        description: '检测到设备性能下降趋势，建议进行性能校准',
        estimatedDuration: 45,
        estimatedCost: 150,
        recommendedDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5天内
        deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14天内
        impact: ['轻微影响运行'],
        prerequisites: ['准备校准工具']
      })
    }
    
    // 保存推荐
    this.recommendations.push(...recommendations)
    
    return recommendations
  }

  // 保存健康历史
  private saveHealthHistory(deviceId: string, record: HealthHistory): void {
    if (!this.healthHistory.has(deviceId)) {
      this.healthHistory.set(deviceId, [])
    }
    
    const history = this.healthHistory.get(deviceId)!
    history.push(record)
    
    // 限制历史记录数量
    if (history.length > 100) {
      history.shift()
    }
  }

  // 获取设备维护历史
  getDeviceMaintenanceHistory(deviceId: string): HealthHistory[] {
    return this.healthHistory.get(deviceId) || []
  }

  // 获取所有维护建议
  getAllRecommendations(): MaintenanceRecommendation[] {
    return [...this.recommendations]
  }

  // 获取特定设备的维护建议
  getDeviceRecommendations(deviceId: string): MaintenanceRecommendation[] {
    return this.recommendations.filter(rec => rec.deviceId === deviceId)
  }

  // 标记建议为已完成
  markRecommendationCompleted(recommendationId: string): void {
    this.recommendations = this.recommendations.filter(rec => rec.id !== recommendationId)
  }

  // 清理服务
  dispose(): void {
    anomalyDetectionService.dispose()
    this.healthHistory.clear()
    this.recommendations = []
  }
}

// 创建单例实例
export const predictiveMaintenanceService = new PredictiveMaintenanceService()

export default predictiveMaintenanceService