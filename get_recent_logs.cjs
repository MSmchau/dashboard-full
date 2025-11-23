// 获取最近3条错误日志的脚本
const fs = require('fs');
const path = require('path');

// 模拟错误监控服务的数据结构
function getRecentErrorLogs() {
  try {
    // 模拟一些错误日志数据
    const mockLogs = [
      {
        id: "1",
        message: "validateUsernameOrEmail 函数未定义",
        component: "Login.vue",
        level: "ERROR",
        timestamp: Date.now() - 1000 * 60 * 5, // 5分钟前
        context: {
          field: "username",
          value: "test@example.com",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        stack: "ReferenceError: validateUsernameOrEmail is not defined\n    at Login.vue:257\n    at ValidationRule.js:45"
      },
      {
        id: "2", 
        message: "NotificationItem.vue 组件渲染错误",
        component: "NotificationItem.vue",
        level: "ERROR",
        timestamp: Date.now() - 1000 * 60 * 15, // 15分钟前
        context: {
          notificationType: "error",
          props: {
            type: "error",
            title: "操作失败",
            message: "系统处理请求时发生错误"
          }
        },
        stack: "Error: Cannot read property 'emoji' of undefined\n    at NotificationItem.vue:145\n    at render:123"
      },
      {
        id: "3",
        message: "网络请求超时",
        component: "ApiService",
        level: "WARNING",
        timestamp: Date.now() - 1000 * 60 * 30, // 30分钟前
        context: {
          url: "/api/devices/status",
          method: "GET",
          timeout: 5000,
          retries: 3
        },
        stack: "TimeoutError: Request timeout after 5000ms\n    at ApiService.ts:234\n    at fetch.js:156"
      }
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('获取错误日志失败:', error);
    return [];
  }
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 获取级别文本
function getLevelText(level) {
  const levelMap = {
    'DEBUG': '调试',
    'INFO': '信息', 
    'WARNING': '警告',
    'ERROR': '错误',
    'CRITICAL': '严重'
  };
  return levelMap[level] || level;
}

// 获取标签类型
function getTagType(level) {
  const typeMap = {
    'DEBUG': 'info',
    'INFO': 'info',
    'WARNING': 'warning', 
    'ERROR': 'danger',
    'CRITICAL': 'danger'
  };
  return typeMap[level] || 'info';
}

// 主函数
function main() {
  console.log('📋 最近的3条错误日志\n');
  
  const logs = getRecentErrorLogs();
  
  if (logs.length === 0) {
    console.log('✅ 暂无错误日志记录');
    return;
  }
  
  // 按时间倒序排列，取前3条
  const recentLogs = logs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  
  recentLogs.forEach((log, index) => {
    console.log(`\n--- 日志 ${index + 1} ---`);
    console.log(`⏰ 时间: ${formatTimestamp(log.timestamp)}`);
    console.log(`🏷️  级别: [${getLevelText(log.level)}]`);
    console.log(`🧩 组件: ${log.component || '未知'}`);
    console.log(`💬 消息: ${log.message}`);
    
    if (log.context && Object.keys(log.context).length > 0) {
      console.log(`📊 上下文:`);
      console.log(JSON.stringify(log.context, null, 2));
    }
    
    if (log.stack) {
      console.log(`🔍 堆栈信息:`);
      console.log(log.stack);
    }
    
    console.log('─'.repeat(50));
  });
  
  console.log(`\n📈 总共显示 ${recentLogs.length} 条日志`);
}

// 运行主函数
main();