import * as tf from '@tensorflow/tfjs'

// 异常检测服务类
export class AnomalyDetectionService {
  private model: tf.LayersModel | null = null
  private isTraining: boolean = false
  
  // 初始化模型
  async initModel(): Promise<void> {
    try {
      // 创建简单的自编码器模型用于异常检测
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [6], units: 4, activation: 'relu' }),
          tf.layers.dense({ units: 2, activation: 'relu' }),
          tf.layers.dense({ units: 4, activation: 'relu' }),
          tf.layers.dense({ units: 6, activation: 'linear' })
        ]
      })
      
      // 编译模型
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError'
      })
      
      console.log('TensorFlow.js异常检测模型初始化完成')
    } catch (error) {
      console.error('TensorFlow.js模型初始化失败:', error)
      throw error
    }
  }
  
  // 训练模型
  async trainModel(trainingData: number[][]): Promise<void> {
    if (!this.model) {
      await this.initModel()
    }
    
    if (this.isTraining) {
      console.warn('模型正在训练中，请稍后重试')
      return
    }
    
    this.isTraining = true
    
    try {
      // 转换为Tensor
      const xs = tf.tensor2d(trainingData)
      
      // 训练模型
      await this.model!.fit(xs, xs, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`训练轮次 ${epoch}: 损失 = ${logs!.loss.toFixed(4)}`)
            }
          }
        }
      })
      
      console.log('异常检测模型训练完成')
    } catch (error) {
      console.error('模型训练失败:', error)
      throw error
    } finally {
      this.isTraining = false
    }
  }
  
  // 检测异常
  async detectAnomalies(data: number[][]): Promise<{
    anomalies: boolean[]
    scores: number[]
    reconstructionErrors: number[]
  }> {
    if (!this.model) {
      throw new Error('模型未初始化，请先调用initModel()')
    }
    
    try {
      const xs = tf.tensor2d(data)
      
      // 获取重构数据
      const reconstructed = this.model.predict(xs) as tf.Tensor
      
      // 计算重构误差
      const errors = tf.mean(tf.square(tf.sub(xs, reconstructed)), 1)
      const errorValues = await errors.data()
      
      // 计算异常分数（基于重构误差）
      const meanError = tf.mean(errors).dataSync()[0]
      const stdError = tf.moments(errors).variance.dataSync()[0]
      
      const scores = Array.from(errorValues).map(error => 
        (error - meanError) / stdError
      )
      
      // 判断异常（阈值设为2倍标准差）
      const anomalies = scores.map(score => score > 2)
      
      // 清理内存
      tf.dispose([xs, reconstructed, errors])
      
      return {
        anomalies,
        scores,
        reconstructionErrors: Array.from(errorValues)
      }
    } catch (error) {
      console.error('异常检测失败:', error)
      throw error
    }
  }
  
  // 生成模拟训练数据
  generateTrainingData(count: number = 1000): number[][] {
    const data: number[][] = []
    
    for (let i = 0; i < count; i++) {
      // 生成正常的设备指标数据
      const cpu = Math.random() * 30 + 40 // 40-70%
      const memory = Math.random() * 25 + 35 // 35-60%
      const disk = Math.random() * 20 + 30 // 30-50%
      const network = Math.random() * 50 + 50 // 50-100 MB/s
      const temperature = Math.random() * 10 + 55 // 55-65°C
      const load = Math.random() * 1.5 + 2.5 // 2.5-4.0
      
      data.push([cpu, memory, disk, network, temperature, load])
    }
    
    return data
  }
  
  // 生成模拟测试数据（包含一些异常数据）
  generateTestData(normalCount: number = 50, anomalyCount: number = 5): number[][] {
    const data: number[][] = []
    
    // 正常数据
    for (let i = 0; i < normalCount; i++) {
      const cpu = Math.random() * 30 + 40
      const memory = Math.random() * 25 + 35
      const disk = Math.random() * 20 + 30
      const network = Math.random() * 50 + 50
      const temperature = Math.random() * 10 + 55
      const load = Math.random() * 1.5 + 2.5
      
      data.push([cpu, memory, disk, network, temperature, load])
    }
    
    // 异常数据
    for (let i = 0; i < anomalyCount; i++) {
      const cpu = Math.random() * 40 + 80 // 80-120% (异常高)
      const memory = Math.random() * 30 + 70 // 70-100% (异常高)
      const disk = Math.random() * 40 + 80 // 80-120% (异常高)
      const network = Math.random() * 100 + 200 // 200-300 MB/s (异常高)
      const temperature = Math.random() * 20 + 80 // 80-100°C (异常高)
      const load = Math.random() * 3 + 5 // 5-8 (异常高)
      
      data.push([cpu, memory, disk, network, temperature, load])
    }
    
    return data
  }
  
  // 获取模型状态
  getModelStatus(): {
    isInitialized: boolean
    isTraining: boolean
  } {
    return {
      isInitialized: this.model !== null,
      isTraining: this.isTraining
    }
  }
  
  // 清理模型
  dispose(): void {
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
  }
}

// 创建单例实例
export const anomalyDetectionService = new AnomalyDetectionService()

export default anomalyDetectionService