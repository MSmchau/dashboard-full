# 📊 可视化大屏数据展示系统

[![GitHub stars](https://img.shields.io/github/stars/MSmchau/dashboard-full.svg?style=social&label=Star)](https://github.com/MSmchau/dashboard-full)
[![GitHub forks](https://img.shields.io/github/forks/MSmchau/dashboard-full.svg?style=social&label=Fork)](https://github.com/MSmchau/dashboard-full/fork)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 Vue 3 + TypeScript + Vite 构建的现代化数据可视化大屏系统，支持实时监控、设备管理、告警通知等功能。

> 🏭 **专为工业4.0和IoT设备监控设计** | 支持设备性能监控、错误告警、预测性维护等企业级功能

## 🚀 核心特性

### 📊 数据可视化
- **多种图表类型**: 折线图、柱状图、饼图、散点图、热力图等
- **3D可视化**: Three.js驱动的3D设备模型和数据展示
- **实时图表**: WebSocket驱动的实时数据更新
- **自定义仪表盘**: 拖拽式组件布局和配置

### 🏭 设备监控
- **设备状态监控**: 实时设备在线/离线状态跟踪
- **性能指标监控**: CPU、内存、存储、网络等关键指标
- **历史数据分析**: 设备性能趋势分析和异常检测
- **设备分组管理**: 按区域、类型、状态等多维度分组

### ⚠️ 错误监控
- **错误日志收集**: 实时收集和分类系统错误信息
- **异常检测**: AI驱动的异常模式识别和预测
- **告警系统**: 多级别告警通知（邮件、短信、UI弹窗）
- **故障诊断**: 智能故障诊断和解决方案推荐

### 🔧 预测性维护
- **设备健康评分**: 基于多维数据的设备健康度评估
- **维护预测**: AI模型预测设备维护时间和建议
- **故障预警**: 提前发现潜在故障并提供预警
- **维护记录**: 完整的设备维护历史记录管理

### 🔐 企业级功能
- **多角色权限**: 管理员、运维、查看者等不同权限控制
- **用户认证**: 安全的登录认证和会话管理
- **数据安全**: 数据加密传输和存储
- **系统审计**: 完整的操作日志和审计跟踪

### 💻 技术特性
- **现代化技术栈**: Vue 3 + TypeScript + Vite + Pinia
- **响应式设计**: 支持大屏、桌面、平板、手机等多种设备
- **高性能**: 虚拟滚动、懒加载、缓存优化等性能优化
- **模块化架构**: 高度可扩展和可维护的代码结构

## 📦 技术栈

### 前端框架
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue状态管理库
- **Vue Router** - 官方路由管理器

### 可视化组件
- **ECharts** - 百度开源可视化图表库
- **Three.js** - 3D图形渲染引擎
- **CountUp.js** - 数字动画效果

### UI与样式
- **Tailwind CSS** - 实用优先的CSS框架
- **自定义主题** - 大屏专用配色方案
- **响应式设计** - 多设备适配

### 开发工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Vitest** - 单元测试框架
- **TypeScript** - 类型检查

## 🛠️ 快速开始

### 🚀 在线演示

- **GitHub仓库**: https://github.com/MSmchau/dashboard-full
- **问题反馈**: [提交Issue](https://github.com/MSmchau/dashboard-full/issues)
- **功能建议**: [发起讨论](https://github.com/MSmchau/dashboard-full/discussions)

### 📋 环境要求

- **Node.js**: >= 16.0.0 (推荐使用 Node.js 18+)
- **包管理器**: npm >= 7.0.0 | yarn >= 1.22.0 | pnpm >= 7.0.0
- **操作系统**: Windows 10+ | macOS 10.15+ | Ubuntu 18.04+

### 💻 一键安装

```bash
# 克隆项目
git clone https://github.com/MSmchau/dashboard-full.git
cd dashboard-full

# 安装依赖 (支持 npm/yarn/pnpm)
npm install

# 启动开发服务器
npm run dev
```

### 🎯 开发模式

```bash
# 启动开发服务器 (默认: http://localhost:5173)
npm run dev

# 使用HTTPS启动 (推荐生产环境测试)
npm run dev:https

# 使用自定义端口
npm run dev -- --port 8080

# 开启调试模式
npm run dev:debug
```

### 🏗️ 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 生产环境预览 (支持外部访问)
npm run preview:prod

# 分析打包体积
npm run build:analyze
```

### 🧪 测试与质量

```bash
# 代码格式检查和修复
npm run lint
npm run lint:fix

# 代码格式化 (Prettier)
npm run format

# TypeScript类型检查
npm run type-check

# 单元测试
npm run test

# 测试覆盖率报告
npm run test:coverage

# UI交互测试
npm run test:ui

# E2E测试
npm run test:e2e
```

## 📁 项目结构

```
dashboard-full/
├── src/                    # 源代码目录
│   ├── components/        # 可复用组件
│   ├── views/            # 页面组件
│   ├── stores/           # 状态管理
│   ├── router/           # 路由配置
│   ├── services/         # API服务
│   ├── utils/            # 工具函数
│   ├── assets/           # 静态资源
│   └── style.css         # 全局样式
├── public/               # 公共资源
├── dist/                 # 构建输出
├── package.json          # 项目配置
├── vite.config.ts        # Vite配置
├── tailwind.config.js    # Tailwind配置
├── tsconfig.json         # TypeScript配置
└── README.md            # 项目文档
```

## 🎯 功能模块详解

### 1. 📊 全局数据总览大屏
```vue
<template>
  <DashboardCharts 
    :real-time-data="dashboardData"
    :time-range="selectedTimeRange"
    @device-click="handleDeviceClick"
  />
</template>
```
- **实时数据指标**: 设备在线率、告警数量、CPU使用率、内存使用率
- **多维度图表**: 支持折线图、柱状图、饼图、热力图等多种可视化
- **3D地理展示**: Three.js驱动的3D设备状态可视化
- **智能告警**: 基于规则的自动告警和多渠道通知

### 2. 🏭 设备监控中心
```typescript
// 设备状态实时监控
const deviceStore = useDeviceStore()

// 获取设备列表
const devices = computed(() => deviceStore.devices)

// 设备筛选和搜索
const filteredDevices = computed(() => 
  deviceStore.filterDevices(searchTerm.value, statusFilter.value)
)

// 实时数据更新
deviceStore.startMonitoring()
```
- **设备列表管理**: 支持按区域、类型、状态等多维度筛选
- **3D设备展示**: 基于Three.js的3D设备模型和实时状态展示
- **性能监控**: 实时CPU、内存、磁盘、网络等关键指标
- **历史数据分析**: 设备性能趋势分析和异常检测

### 3. ⚠️ 错误监控与告警
```typescript
// 错误监控服务
import { useErrorMonitoringService } from '@/services/error-monitoring-service'

const errorService = useErrorMonitoringService()

// 收集错误信息
errorService.captureError(error, {
  level: 'error',
  context: userContext,
  deviceId: device.id
})

// 异常检测
const anomalies = await errorService.detectAnomalies(timeRange)
```
- **错误日志收集**: 实时收集前端、后端、设备等各类错误信息
- **AI异常检测**: 基于机器学习的异常模式识别和预测
- **多级告警系统**: 支持邮件、短信、UI弹窗等多种告警方式
- **故障诊断**: 智能故障根因分析和解决建议

### 4. 🔧 预测性维护
```typescript
// 健康评分计算
const healthScore = await predictiveService.calculateHealthScore(device.id)

// 维护预测
const maintenancePrediction = await predictiveService.predictMaintenance(
  device.id, 
  { days: 30 }
)

// 设备健康趋势
const healthTrends = await predictiveService.getHealthTrends(device.id)
```
- **设备健康评分**: 基于多维数据融合的设备健康度智能评估
- **维护时间预测**: AI模型预测设备最佳维护时间窗口
- **故障预警系统**: 提前发现潜在故障，提供预警信息
- **维护记录管理**: 完整的设备维护历史和效果跟踪

### 5. 🔐 用户认证与权限
```typescript
// 路由守卫配置
const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/monitor',
    component: MonitoringDashboard,
    meta: { requiresAuth: true, roles: ['admin', 'operator'] }
  }
]

// 权限检查
const hasPermission = (user: User, action: string) => {
  return user.permissions.includes(action)
}
```
- **多角色权限**: 管理员、运维、查看者等细粒度权限控制
- **安全认证**: JWT token + 刷新机制的认证系统
- **操作审计**: 完整的用户操作日志和安全审计
- **个性化设置**: 用户偏好设置和界面自定义

## 🔧 配置说明

### 环境变量

创建 `.env` 文件配置环境变量：

```env
# API基础地址
VITE_API_BASE_URL=http://localhost:3001/api

# WebSocket地址
VITE_WS_URL=ws://localhost:3001/ws

# 应用标题
VITE_APP_TITLE=可视化大屏数据展示系统

# 设计尺寸（用于自适应）
VITE_DESIGN_WIDTH=1920
VITE_DESIGN_HEIGHT=1080
```

### 主题配置

在 `tailwind.config.js` 中自定义主题：

```javascript
// 大屏专用配色方案
colors: {
  dashboard: {
    bg: '#0f172a',      // 背景色
    card: '#1e293b',    // 卡片色
    border: '#334155',  // 边框色
    text: '#f1f5f9',    // 文字色
    muted: '#64748b',   // 次要文字色
  }
}
```

## 📊 数据接口

### API服务

项目使用统一的API服务管理，支持：

- **RESTful API** - 标准REST接口
- **WebSocket** - 实时数据推送
- **Mock数据** - 开发环境模拟数据
- **错误处理** - 统一错误处理机制

### 主要接口

```typescript
// 仪表板数据
GET /api/dashboard/overview

// 设备列表
GET /api/devices

// 设备详情
GET /api/devices/:id

// 告警信息
GET /api/alerts

// 用户认证
POST /api/auth/login
POST /api/auth/logout
```

## 🎨 自定义组件

### 图表组件

使用 ECharts 封装的可复用图表组件：

```vue
<template>
  <ChartContainer title="设备状态分布">
    <PieChart :data="deviceStatusData" />
  </ChartContainer>
</template>
```

### 指标卡片

数字指标展示组件：

```vue
<template>
  <MetricCard
    title="在线设备"
    :value="onlineCount"
    icon="device"
    trend="up"
    :trend-value="5.2"
  />
</template>
```

### 3D可视化

基于 Three.js 的3D可视化组件：

```vue
<template>
  <ThreeDScene :data="deviceData" />
</template>
```

## 🚀 部署指南

### 开发环境部署

1. 克隆项目代码
2. 安装依赖：`npm install`
3. 配置环境变量
4. 启动开发服务器：`npm run dev`

### 生产环境部署

1. 构建项目：`npm run build`
2. 部署 `dist` 目录到Web服务器
3. 配置Nginx反向代理（如需）
4. 配置SSL证书（生产环境）

### Docker部署

```dockerfile
# 使用官方Node.js镜像
FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "run", "preview:prod"]
```

## 🤝 贡献指南

### 开发流程

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 配置
- 编写单元测试覆盖核心功能
- 提交信息使用约定式提交格式

### 提交信息格式

```
feat: 添加新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具变动
```

## 📄 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢以下开源项目的支持：

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [ECharts](https://echarts.apache.org/) - 强大的可视化图表库
- [Three.js](https://threejs.org/) - 3D图形渲染引擎
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架

## 🤝 贡献与支持

### 🐛 问题反馈
- **Bug报告**: [GitHub Issues](https://github.com/MSmchau/dashboard-full/issues/new?template=bug_report.md)
- **功能建议**: [Feature Requests](https://github.com/MSmchau/dashboard-full/issues/new?template=feature_request.md)
- **讨论交流**: [GitHub Discussions](https://github.com/MSmchau/dashboard-full/discussions)

### 💡 贡献指南

欢迎任何形式的贡献！以下是几种参与方式：

1. **🐛 报告Bug**: 发现问题时提供详细的重现步骤
2. **💡 提出新功能**: 对项目未来发展提出建设性建议  
3. **📝 完善文档**: 帮助改进项目文档和使用指南
4. **🔧 代码贡献**: 提交Pull Request修复问题或添加功能

### 🏗️ 开发参与

```bash
# 1. Fork 项目并克隆到本地
git clone https://github.com/your-username/dashboard-full.git
cd dashboard-full

# 2. 创建功能分支
git checkout -b feature/amazing-feature

# 3. 提交更改
git commit -m "feat: 添加令人惊叹的新功能"

# 4. 推送到GitHub
git push origin feature/amazing-feature

# 5. 创建Pull Request
```

### 🌟 致谢名单

感谢所有为项目做出贡献的开发者和用户！

特别感谢以下开源项目：
- **Vue.js** - 渐进式JavaScript框架
- **ECharts** - 强大的可视化图表库  
- **Three.js** - 3D图形渲染引擎
- **Tailwind CSS** - 实用优先的CSS框架

### 📄 许可证

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

本项目基于 MIT 许可证开源，您可以自由地使用、修改和分发本项目。详见 [LICENSE](LICENSE) 文件。

### 🔗 相关链接

- **🏠 项目主页**: https://github.com/MSmchau/dashboard-full
- **📖 在线文档**: https://msmchau.github.io/dashboard-full/ 
- **🎮 在线演示**: https://dashboard-full-demo.vercel.app/
- **📦 NPM包**: https://www.npmjs.com/package/dashboard-full

---

<div align="center">

### 📊 可视化大屏数据展示系统

**让数据可视化更简单、更智能！**

[![GitHub stars](https://img.shields.io/github/stars/MSmchau/dashboard-full.svg?style=social&label=Star)](https://github.com/MSmchau/dashboard-full)
[![GitHub forks](https://img.shields.io/github/forks/MSmchau/dashboard-full.svg?style=social&label=Fork)](https://github.com/MSmchau/dashboard-full/fork)

*如果这个项目对您有帮助，请给我们一个 ⭐ Star！*

</div>