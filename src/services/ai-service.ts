import { ref } from 'vue'

// AI查询状态管理
export const aiQueryState = ref({
  loading: false,
  error: null as string | null,
  result: null as any,
  history: [] as Array<{query: string, result: any, timestamp: Date}>,
  suggestions: [] as string[]
})

// 查询类型定义
interface QueryIntent {
  intent: string
  entities: Record<string, any>
  confidence: number
  suggestedActions: string[]
}

// 查询场景支持
const SUPPORTED_SCENARIOS = {
  // 设备监控场景
  device_status: {
    keywords: ['设备状态', '设备在线', '设备离线', '设备故障', 'device status', '设备运行'],
    timeFrames: ['今天', '昨天', '近1小时', '近24小时', '本周', '本月'],
    metrics: ['CPU', '内存', '磁盘', '网络', '温度', '电源']
  },
  
  // 告警分析场景
  alert_analysis: {
    keywords: ['告警', '异常', '错误', '警告', 'alert', '故障', '问题'],
    levels: ['严重', '重要', '一般', '提示'],
    types: ['设备故障', '性能告警', '安全告警', '业务告警']
  },
  
  // 性能趋势场景
  performance_trend: {
    keywords: ['趋势', '趋势分析', '历史数据', '趋势变化', 'trend', '增长', '下降'],
    periods: ['小时', '天', '周', '月'],
    aggregation: ['平均值', '最大值', '最小值', '总和']
  },
  
  // 业务统计场景
  business_stats: {
    keywords: ['统计', '报表', '汇总', '排名', '统计信息', 'statistics'],
    dimensions: ['业务线', '地区', '用户', '产品', '渠道']
  },
  
  // 对比分析场景
  comparison_analysis: {
    keywords: ['对比', '比较', '同比', '环比', 'comparison', '差异'],
    comparisonTypes: ['时间对比', '业务对比', '区域对比', '设备对比']
  }
}

// 增强的意图解析
export class AIService {
  
  // 智能意图解析
  static parseIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase()
    const words = lowerQuery.split(/\s+/)
    
    // 分析查询类型
    let intent = 'general_query'
    let confidence = 0
    const entities: Record<string, any> = {}
    const suggestedActions: string[] = []
    
    // 设备状态查询
    if (this.matchKeywords(lowerQuery, SUPPORTED_SCENARIOS.device_status.keywords)) {
      intent = 'device_query'
      confidence = 0.9
      
      // 提取时间范围
      const timeFrame = this.extractTimeFrame(query)
      if (timeFrame) entities.timeFrame = timeFrame
      
      // 提取指标
      const metric = this.extractMetric(query)
      if (metric) entities.metric = metric
      
      suggestedActions.push('查看设备状态详情', '分析设备性能指标')
    }
    
    // 告警分析查询
    else if (this.matchKeywords(lowerQuery, SUPPORTED_SCENARIOS.alert_analysis.keywords)) {
      intent = 'alert_query'
      confidence = 0.85
      
      // 提取告警级别
      const level = this.extractAlertLevel(query)
      if (level) entities.alertLevel = level
      
      // 提取时间范围
      const timeFrame = this.extractTimeFrame(query)
      if (timeFrame) entities.timeFrame = timeFrame
      
      suggestedActions.push('查看告警详情', '处理告警事件')
    }
    
    // 趋势分析查询
    else if (this.matchKeywords(lowerQuery, SUPPORTED_SCENARIOS.performance_trend.keywords)) {
      intent = 'trend_query'
      confidence = 0.8
      
      // 提取时间周期
      const period = this.extractPeriod(query)
      if (period) entities.period = period
      
      suggestedActions.push('查看趋势图表', '分析数据变化')
    }
    
    // 业务统计查询
    else if (this.matchKeywords(lowerQuery, SUPPORTED_SCENARIOS.business_stats.keywords)) {
      intent = 'statistics_query'
      confidence = 0.75
      
      // 提取统计维度
      const dimension = this.extractDimension(query)
      if (dimension) entities.dimension = dimension
      
      suggestedActions.push('查看统计报表', '导出数据报告')
    }
    
    // 对比分析查询
    else if (this.matchKeywords(lowerQuery, SUPPORTED_SCENARIOS.comparison_analysis.keywords)) {
      intent = 'comparison_query'
      confidence = 0.7
      
      suggestedActions.push('查看对比图表', '分析差异原因')
    }
    
    return { intent, entities, confidence, suggestedActions }
  }
  
  // 关键词匹配
  private static matchKeywords(query: string, keywords: string[]): boolean {
    return keywords.some(keyword => query.includes(keyword))
  }
  
  // 提取时间范围
  private static extractTimeFrame(query: string): string | null {
    const timePatterns = [
      { pattern: /近(\d+)小时/, type: 'hours' },
      { pattern: /近(\d+)天/, type: 'days' },
      { pattern: /今天/, type: 'today' },
      { pattern: /昨天/, type: 'yesterday' },
      { pattern: /本周/, type: 'thisWeek' },
      { pattern: /本月/, type: 'thisMonth' }
    ]
    
    for (const { pattern, type } of timePatterns) {
      const match = query.match(pattern)
      if (match) {
        return type === 'hours' || type === 'days' 
          ? `近${match[1]}${type === 'hours' ? '小时' : '天'}`
          : type
      }
    }
    return null
  }
  
  // 提取指标
  private static extractMetric(query: string): string | null {
    const metrics = SUPPORTED_SCENARIOS.device_status.metrics
    for (const metric of metrics) {
      if (query.includes(metric)) return metric
    }
    return null
  }
  
  // 提取告警级别
  private static extractAlertLevel(query: string): string | null {
    const levels = SUPPORTED_SCENARIOS.alert_analysis.levels
    for (const level of levels) {
      if (query.includes(level)) return level
    }
    return null
  }
  
  // 提取时间周期
  private static extractPeriod(query: string): string | null {
    const periods = SUPPORTED_SCENARIOS.performance_trend.periods
    for (const period of periods) {
      if (query.includes(period)) return period
    }
    return null
  }
  
  // 提取统计维度
  private static extractDimension(query: string): string | null {
    const dimensions = SUPPORTED_SCENARIOS.business_stats.dimensions
    for (const dimension of dimensions) {
      if (query.includes(dimension)) return dimension
    }
    return null
  }
  
  // 模拟增强的大模型调用
  private static async callEnhancedLLM(query: string, intentInfo: QueryIntent) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    const { intent, entities, confidence } = intentInfo
    
    // 根据意图和实体生成响应
    switch (intent) {
      case 'device_query':
        return this.generateDeviceQueryResponse(query, entities, confidence)
      
      case 'alert_query':
        return this.generateAlertQueryResponse(query, entities, confidence)
      
      case 'trend_query':
        return this.generateTrendQueryResponse(query, entities, confidence)
      
      case 'statistics_query':
        return this.generateStatisticsQueryResponse(query, entities, confidence)
      
      case 'comparison_query':
        return this.generateComparisonQueryResponse(query, entities, confidence)
      
      default:
        return this.generateGeneralResponse(query, confidence)
    }
  }
  
  // 生成设备查询响应
  private static generateDeviceQueryResponse(query: string, entities: any, confidence: number) {
    const timeFrame = entities.timeFrame || '当前'
    const metric = entities.metric || '整体状态'
    
    return {
      type: 'device_data',
      data: {
        summary: {
          totalDevices: 1568,
          onlineDevices: 1423,
          offlineDevices: 145,
          warningDevices: 23,
          errorDevices: 8
        },
        metrics: {
          'CPU使用率': '65.3%',
          '内存使用率': '78.2%',
          '磁盘使用率': '45.7%',
          '网络流量': '1.2GB/s'
        },
        timeFrame,
        metric,
        topDevices: [
          { name: '服务器-001', status: 'online', cpu: 45, memory: 62 },
          { name: '服务器-002', status: 'online', cpu: 72, memory: 81 },
          { name: '交换机-A1', status: 'warning', cpu: 89, memory: null }
        ]
      },
      visualization: 'device_dashboard',
      confidence,
      message: `根据您的查询"${query}"，${timeFrame}内设备${metric}情况如下：`,
      insights: [
        '设备整体运行状态良好，在线率达90.7%',
        '仅有8台设备出现故障，需要关注',
        'CPU使用率整体偏低，系统负载适中'
      ]
    }
  }
  
  // 生成告警查询响应
  private static generateAlertQueryResponse(query: string, entities: any, confidence: number) {
    const timeFrame = entities.timeFrame || '近24小时'
    const alertLevel = entities.alertLevel || '全部'
    
    return {
      type: 'alert_data',
      data: {
        alerts: [
          { 
            id: 1, 
            device: '服务器A01', 
            metric: 'CPU使用率', 
            level: 'high', 
            value: '95%', 
            time: '2分钟前',
            description: 'CPU使用率持续过高，可能影响系统性能'
          },
          { 
            id: 2, 
            device: '交换机B12', 
            metric: '端口流量', 
            level: 'medium', 
            value: '85%', 
            time: '5分钟前',
            description: '网络端口流量接近上限'
          },
          { 
            id: 3, 
            device: '存储C05', 
            metric: '磁盘I/O', 
            level: 'low', 
            value: '78%', 
            time: '10分钟前',
            description: '磁盘I/O使用率偏高'
          }
        ],
        statistics: {
          total: 156,
          high: 12,
          medium: 45,
          low: 99,
          resolved: 134
        }
      },
      visualization: 'alert_dashboard',
      confidence,
      message: `查询到${timeFrame}内${alertLevel}级别告警信息：`,
      recommendations: [
        '立即处理高优先级告警，避免系统故障',
        '检查相关设备的资源配置',
        '优化系统负载分布'
      ]
    }
  }
  
  // 生成趋势查询响应
  private static generateTrendQueryResponse(query: string, entities: any, confidence: number) {
    const period = entities.period || '24小时'
    
    return {
      type: 'trend_data',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        datasets: [
          { name: '设备在线数', data: [300, 280, 320, 350, 380, 360, 340], color: '#1890ff' },
          { name: '业务处理量', data: [200, 180, 220, 250, 280, 260, 240], color: '#52c41a' },
          { name: '告警数量', data: [12, 8, 15, 22, 18, 14, 10], color: '#faad14' }
        ],
        trend: '上升',
        change: '+12.5%',
        analysis: '系统负载呈上升趋势，建议提前扩容'
      },
      visualization: 'trend_chart',
      confidence,
      message: `基于${period}的数据分析，以下是相关趋势信息：`,
      insights: [
        '设备在线数量稳步增长，系统规模不断扩大',
        '业务处理量与设备数量正相关',
        '告警数量控制良好，故障率持续降低'
      ]
    }
  }
  
  // 生成统计查询响应
  private static generateStatisticsQueryResponse(query: string, entities: any, confidence: number) {
    const dimension = entities.dimension || '业务线'
    
    return {
      type: 'statistics_data',
      data: {
        summary: {
          totalValue: 1000000,
          growth: '+15.3%',
          topCategories: 5
        },
        distribution: [
          { name: '业务线A', value: 320000, percentage: 32, growth: '+8.2%' },
          { name: '业务线B', value: 280000, percentage: 28, growth: '+12.1%' },
          { name: '业务线C', value: 250000, percentage: 25, growth: '+22.7%' },
          { name: '业务线D', value: 150000, percentage: 15, growth: '+5.4%' }
        ],
        dimension
      },
      visualization: 'statistics_dashboard',
      confidence,
      message: `${dimension}统计数据如下：`,
      insights: [
        '业务线C增长最快，值得重点关注',
        '整体业务呈现健康增长态势',
        '建议优化业务线D的资源配置'
      ]
    }
  }
  
  // 生成对比查询响应
  private static generateComparisonQueryResponse(query: string, entities: any, confidence: number) {
    return {
      type: 'comparison_data',
      data: {
        comparisonType: '时间对比',
        periods: ['上周', '本周'],
        metrics: [
          { name: '设备在线率', previous: '88.5%', current: '90.7%', change: '+2.2%' },
          { name: '业务处理量', previous: '8500', current: '9200', change: '+8.2%' },
          { name: '平均响应时间', previous: '120ms', current: '115ms', change: '-4.2%' }
        ]
      },
      visualization: 'comparison_chart',
      confidence,
      message: `本周与上周对比分析结果：`,
      insights: [
        '各项指标均有改善，系统性能提升明显',
        '建议继续保持当前优化策略',
        '可考虑将成功经验推广到其他业务'
      ]
    }
  }
  
  // 生成通用响应
  private static generateGeneralResponse(query: string, confidence: number) {
    return {
      type: 'general_response',
      data: null,
      visualization: 'none',
      confidence,
      message: `我理解您想查询"${query}"，但我需要更多信息来提供准确的答案。`,
      suggestions: [
        '您可以询问设备状态、告警信息或业务趋势',
        '例如："显示最近1小时的设备告警"',
        '或者："分析本周的业务增长趋势"'
      ]
    }
  }
  
  // 主查询方法
  static async query(query: string) {
    if (!query.trim()) {
      throw new Error('查询内容不能为空')
    }

    aiQueryState.value.loading = true
    aiQueryState.value.error = null

    try {
      // 1. 智能意图解析
      const intentInfo = this.parseIntent(query)
      console.log('意图解析结果:', intentInfo)
      
      // 2. 调用增强的大模型
      const result = await this.callEnhancedLLM(query, intentInfo)
      
      // 3. 生成智能建议
      const suggestions = this.generateQuerySuggestions(intentInfo)
      aiQueryState.value.suggestions = suggestions
      
      // 4. 更新状态
      aiQueryState.value.result = result
      aiQueryState.value.history.unshift({
        query,
        result,
        timestamp: new Date()
      })
      
      // 限制历史记录数量
      if (aiQueryState.value.history.length > 10) {
        aiQueryState.value.history = aiQueryState.value.history.slice(0, 10)
      }
      
      return result
    } catch (error) {
      aiQueryState.value.error = error instanceof Error ? error.message : '查询失败'
      throw error
    } finally {
      aiQueryState.value.loading = false
    }
  }
  
  // 生成查询建议
  private static generateQuerySuggestions(intentInfo: QueryIntent): string[] {
    const { intent, suggestedActions } = intentInfo
    
    const suggestionTemplates = {
      device_query: [
        '显示所有在线设备列表',
        '查看CPU使用率最高的设备',
        '分析内存使用情况',
        '统计设备故障率'
      ],
      alert_query: [
        '查看高优先级告警详情',
        '分析告警趋势变化',
        '统计各类告警数量',
        '查看已处理的告警'
      ],
      trend_query: [
        '分析24小时趋势变化',
        '对比本周与上周数据',
        '查看业务增长趋势',
        '监控关键指标变化'
      ],
      statistics_query: [
        '生成业务统计报表',
        '分析各部门贡献度',
        '查看排名TOP10',
        '导出数据报告'
      ],
      comparison_query: [
        '对比不同时期数据',
        '分析差异原因',
        '查看改进效果',
        '生成对比报告'
      ]
    }
    
    return suggestionTemplates[intent as keyof typeof suggestionTemplates] || [
      '您可以询问设备状态、告警信息或业务趋势',
      '例如："显示最近1小时的设备状态"',
      '或者："分析本周的业务统计"'
    ]
  }

  // 清除查询结果
  static clearResult() {
    aiQueryState.value.result = null
    aiQueryState.value.error = null
    aiQueryState.value.suggestions = []
  }

  // 获取查询历史
  static getHistory() {
    return aiQueryState.value.history
  }
  
  // 获取智能建议
  static getSuggestions() {
    return aiQueryState.value.suggestions
  }
}

// LangChain集成（实际项目中启用）
/*
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "langchain/schema"
import { LLMChain } from "langchain/chains"
import { PromptTemplate } from "langchain/prompts"

export class LangChainAIService {
  private static model: ChatOpenAI
  private static chain: LLMChain

  static init() {
    this.model = new ChatOpenAI({
      openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      temperature: 0.7,
      modelName: "gpt-3.5-turbo"
    })

    const template = `
你是一个专业的数据可视化大屏AI助手。请分析用户查询并提供结构化响应。

用户查询: {query}

请提供：
1. 查询意图识别
2. 相关数据提取
3. 可视化建议
4. 自然语言分析

响应格式为JSON：
{{
  "intent": "意图类型",
  "entities": {{"实体信息"}},
  "data": {{"相关数据"}},
  "visualization": "可视化建议",
  "message": "自然语言响应",
  "insights": ["洞察1", "洞察2"]
}}
    `

    const prompt = new PromptTemplate({
      template,
      inputVariables: ["query"]
    })

    this.chain = new LLMChain({ llm: this.model, prompt })
  }

  static async queryWithLangChain(query: string) {
    if (!this.chain) {
      this.init()
    }

    const response = await this.chain.call({ query })
    return JSON.parse(response.text)
  }
}
*/