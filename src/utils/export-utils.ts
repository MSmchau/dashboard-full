// 数据导出工具函数
// @ts-ignore
import { saveAs } from 'file-saver'

// 导出格式枚举
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'xlsx',
  JSON = 'json',
  PDF = 'pdf',
  TXT = 'txt'
}

// 导出选项接口
export interface ExportOptions {
  filename?: string
  format: ExportFormat
  includeHeaders?: boolean
  timestamp?: boolean
  compress?: boolean
}

// 数据行接口
export interface DataRow {
  [key: string]: any
}

// 导出配置接口
export interface ExportConfig {
  columns: string[]
  columnNames?: { [key: string]: string }
  data: DataRow[]
}

/**
 * 基础数据导出函数
 */
export function exportData(config: ExportConfig, options: ExportOptions): void {
  const { columns, columnNames = {}, data } = config
  const { 
    filename = 'exported-data', 
    format, 
    includeHeaders = true, 
    timestamp = true,
    compress = false
  } = options
  
  // 生成文件名
  const timestampStr = timestamp ? `_${new Date().getTime()}` : ''
  const fullFilename = `${filename}${timestampStr}.${format}`
  
  try {
    switch (format) {
      case ExportFormat.CSV:
        exportToCSV(columns, columnNames, data, fullFilename, includeHeaders)
        break
      case ExportFormat.JSON:
        exportToJSON(data, fullFilename, compress)
        break
      case ExportFormat.TXT:
        exportToTXT(columns, columnNames, data, fullFilename, includeHeaders)
        break
      case ExportFormat.EXCEL:
        exportToExcel(columns, columnNames, data, fullFilename)
        break
      case ExportFormat.PDF:
        exportToPDF(columns, columnNames, data, fullFilename)
        break
      default:
        throw new Error(`不支持的导出格式: ${format}`)
    }
    
    console.log(`数据导出成功: ${fullFilename}`)
  } catch (error) {
    console.error('数据导出失败:', error)
    throw error
  }
}

/**
 * 导出为CSV格式
 */
function exportToCSV(
  columns: string[], 
  columnNames: { [key: string]: string }, 
  data: DataRow[], 
  filename: string, 
  includeHeaders: boolean
): void {
  const headers = columns.map(col => columnNames[col] || col)
  const csvContent = []
  
  // 添加表头
  if (includeHeaders) {
    csvContent.push(headers.join(','))
  }
  
  // 添加数据行
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col]
      // 处理包含逗号、引号或换行符的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value || ''
    })
    csvContent.push(rowData.join(','))
  })
  
  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, filename)
}

/**
 * 导出为JSON格式
 */
function exportToJSON(data: DataRow[], filename: string, compress: boolean): void {
  const jsonContent = compress ? JSON.stringify(data) : JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  saveAs(blob, filename)
}

/**
 * 导出为文本格式
 */
function exportToTXT(
  columns: string[], 
  columnNames: { [key: string]: string }, 
  data: DataRow[], 
  filename: string, 
  includeHeaders: boolean
): void {
  const headers = columns.map(col => columnNames[col] || col)
  const txtContent = []
  
  // 添加表头
  if (includeHeaders) {
    txtContent.push(headers.join('\t'))
  }
  
  // 添加数据行
  data.forEach(row => {
    const rowData = columns.map(col => row[col] || '')
    txtContent.push(rowData.join('\t'))
  })
  
  const blob = new Blob([txtContent.join('\n')], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, filename)
}

/**
 * 导出为Excel格式（使用xlsx库）
 */
function exportToExcel(
  columns: string[], 
  columnNames: { [key: string]: string }, 
  data: DataRow[], 
  filename: string
): void {
  // 动态导入xlsx库
  import('xlsx').then(xlsx => {
    const worksheetData = []
    
    // 添加表头
    const headers = columns.map(col => columnNames[col] || col)
    worksheetData.push(headers)
    
    // 添加数据行
    data.forEach(row => {
      const rowData = columns.map(col => row[col] || '')
      worksheetData.push(rowData)
    })
    
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    
    // 生成Excel文件
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, filename)
  }).catch(error => {
    console.error('Excel导出失败:', error)
    throw new Error('Excel导出功能需要安装xlsx库')
  })
}

/**
 * 导出为PDF格式（使用jsPDF库）
 */
function exportToPDF(
  columns: string[], 
  columnNames: { [key: string]: string }, 
  data: DataRow[], 
  filename: string
): void {
  // 动态导入jsPDF库
  import('jspdf').then(jsPDFModule => {
    import('jspdf-autotable').then(_autoTableModule => {
      const { jsPDF } = jsPDFModule
      const doc = new jsPDF()
      
      // 设置标题
      doc.setFontSize(16)
      doc.text('数据导出报表', 14, 15)
      
      // 准备表格数据
      const headers = columns.map(col => columnNames[col] || col)
      const tableData = data.map(row => 
        columns.map(col => row[col] || '')
      )
      
      // 添加表格
      ;(doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: 25,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202] }
      })
      
      // 保存PDF
      doc.save(filename)
    }).catch(error => {
      console.error('PDF表格生成失败:', error)
      throw new Error('PDF导出功能需要安装jspdf-autotable库')
    })
  }).catch(error => {
    console.error('PDF导出失败:', error)
    throw new Error('PDF导出功能需要安装jsPDF库')
  })
}

/**
 * 批量导出函数 - 支持同时导出多种格式
 */
export function batchExport(config: ExportConfig, formats: ExportFormat[], baseFilename?: string): void {
  formats.forEach(format => {
    exportData(config, {
      filename: baseFilename,
      format,
      timestamp: true
    })
  })
}

/**
 * 高级导出函数 - 支持自定义数据处理
 */
export function advancedExport<T>(
  data: T[],
  transformer: (item: T) => DataRow,
  options: ExportOptions & { columns: string[] }
): void {
  const transformedData = data.map(transformer)
  const config: ExportConfig = {
    columns: options.columns,
    data: transformedData
  }
  
  exportData(config, options)
}

/**
 * 报表生成器 - 生成带有统计信息的报表
 */
export function generateReport(
  data: DataRow[], 
  statistics: { [key: string]: any },
  title: string,
  format: ExportFormat = ExportFormat.PDF
): void {
  const filename = `${title.replace(/\s+/g, '_')}_report`
  
  if (format === ExportFormat.PDF) {
    // 生成带统计信息的PDF报表
    import('jspdf').then(jsPDFModule => {
      const { jsPDF } = jsPDFModule
      const doc = new jsPDF()
      
      // 标题
      doc.setFontSize(18)
      doc.text(title, 14, 15)
      
      // 统计信息
      doc.setFontSize(12)
      let yPosition = 30
      Object.entries(statistics).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPosition)
        yPosition += 8
      })
      
      // 数据表格（如果数据量不大）
      if (data.length > 0 && data.length <= 50) {
        const columns = Object.keys(data[0])
        const headers = columns
        const tableData = data.map(row => columns.map(col => row[col] || ''))
        
        ;(doc as any).autoTable({
          head: [headers],
          body: tableData,
          startY: yPosition + 10,
          styles: { fontSize: 8, cellPadding: 2 }
        })
      }
      
      doc.save(`${filename}.pdf`)
    })
  } else {
    // 其他格式的报表
    const config: ExportConfig = {
      columns: Object.keys(data[0] || {}),
      data: data
    }
    
    exportData(config, {
      filename,
      format,
      timestamp: true
    })
  }
}

/**
 * 导出性能监控数据
 */
export function exportPerformanceData(performanceData: any[], options?: Partial<ExportOptions>): void {
  const config: ExportConfig = {
    columns: ['timestamp', 'metric', 'value', 'unit', 'threshold'],
    columnNames: {
      timestamp: '时间戳',
      metric: '指标名称',
      value: '指标值',
      unit: '单位',
      threshold: '阈值'
    },
    data: performanceData
  }
  
  exportData(config, {
    filename: 'performance_metrics',
    format: ExportFormat.CSV,
    timestamp: true,
    ...options
  })
}

/**
 * 导出设备监控数据
 */
export function exportDeviceData(deviceData: any[], options?: Partial<ExportOptions>): void {
  const config: ExportConfig = {
    columns: ['deviceId', 'deviceName', 'status', 'cpuUsage', 'memoryUsage', 'temperature', 'timestamp'],
    columnNames: {
      deviceId: '设备ID',
      deviceName: '设备名称',
      status: '状态',
      cpuUsage: 'CPU使用率',
      memoryUsage: '内存使用率',
      temperature: '温度',
      timestamp: '时间戳'
    },
    data: deviceData
  }
  
  exportData(config, {
    filename: 'device_monitoring',
    format: ExportFormat.EXCEL,
    timestamp: true,
    ...options
  })
}

/**
 * 导出日志数据
 */
export function exportLogData(logData: any[], options?: Partial<ExportOptions>): void {
  const config: ExportConfig = {
    columns: ['timestamp', 'level', 'message', 'source', 'deviceId'],
    columnNames: {
      timestamp: '时间戳',
      level: '日志级别',
      message: '日志内容',
      source: '来源',
      deviceId: '设备ID'
    },
    data: logData
  }
  
  exportData(config, {
    filename: 'system_logs',
    format: ExportFormat.CSV,
    timestamp: true,
    ...options
  })
}