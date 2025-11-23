# Linux服务器部署指南

## 🚀 快速部署

### 1. 系统要求
- **操作系统**: CentOS 8+, RHEL 8+, Ubuntu 22.04+
- **内存**: 至少8GB (推荐16GB+)
- **磁盘**: 至少100GB可用空间 (推荐SSD)
- **CPU**: 4核心以上
- **网络**: 外网访问权限

### 2. 一键部署

```bash
# 1. 上传项目到服务器
scp -r dashboard-full/ user@server_ip:/opt/

# 2. 登录服务器
ssh user@server_ip

# 3. 进入部署目录
cd /opt/dashboard-full/linux-deploy-scripts

# 4. 给脚本执行权限
chmod +x *.sh

# 5. 执行系统初始化 (首次部署必执行)
sudo ./01-system-init.sh

# 6. 重启终端使权限生效
# 然后重新连接SSH

# 7. 一键部署
./04-deploy.sh -e dev --mode quick
```

### 3. 部署选项说明

```bash
# 开发环境快速部署 (推荐测试)
./04-deploy.sh -e dev --mode quick

# 生产环境完整部署 (包含监控和日志)
./04-deploy.sh -e prod --mode full --backup

# 重置部署 (清理并重新部署)
./04-deploy.sh -e prod --mode rebuild

# 仅检查系统环境
./04-deploy.sh --check

# 停止所有服务
./04-deploy.sh --stop
```

### 4. 部署完成后访问

| 服务 | 访问地址 | 默认账户 |
|------|----------|----------|
| API网关 | http://服务器IP:8080 | - |
| 设备管理API | http://服务器IP:8081 | - |
| Grafana监控面板 | http://服务器IP:3000 | admin/admin_123 |
| Kibana日志分析 | http://服务器IP:5601 | - |
| MinIO对象存储 | http://服务器IP:9001 | admin/admin_123456 |

### 5. 常用管理命令

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f gateway-server

# 重启某个服务
docker-compose restart device-service

# 查看资源使用情况
docker stats

# 进入容器调试
docker exec -it device-gateway-server bash

# 备份数据
./04-deploy.sh --backup

# 健康检查
curl http://localhost:8080/actuator/health
```

## 🏗️ 架构概览

### 微服务架构
```
前端 (React/Vue) 
    ↓
API网关 (Gateway:8080)
    ↓
┌─────────────┬─────────────┬─────────────┐
│设备管理服务  │监控告警服务  │数据采集服务  │
│8081         │8082         │8083         │
└─────────────┴─────────────┴─────────────┘
    ↓           ↓           ↓
┌─────────────┬─────────────┬─────────────┐
│PostgreSQL   │InfluxDB     │Kafka        │
│业务数据     │时序数据     │消息队列     │
└─────────────┴─────────────┴─────────────┘
```

### 服务端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 关系数据库 |
| Redis | 6379 | 缓存数据库 |
| InfluxDB | 8086 | 时序数据库 |
| Kafka | 9092 | 消息队列 |
| Eureka | 8761 | 服务注册中心 |
| API网关 | 8080 | 统一入口 |
| 设备管理 | 8081 | 设备CRUD |
| 监控告警 | 8082 | 监控告警 |
| 数据采集 | 8083 | 设备数据采集 |
| 配置中心 | 8084 | 配置管理 |
| 认证授权 | 8085 | 用户认证 |
| MinIO | 9000/9001 | 对象存储 |
| Prometheus | 9090 | 指标收集 |
| Grafana | 3000 | 监控面板 |
| ELK Stack | 9200/5601 | 日志分析 |
| Nginx | 80/443 | 负载均衡 |

## 🔧 定制化配置

### 1. 修改环境配置

编辑 `03-environment.env` 文件:

```bash
# 数据库配置
DB_PASSWORD=your_secure_password

# 监控配置  
GRAFANA_PASSWORD=your_grafana_password

# SSL证书 (生产环境)
SSL_CERT_PATH=/etc/ssl/certs/your_cert.crt
SSL_KEY_PATH=/etc/ssl/private/your_key.key
```

### 2. 修改服务配置

#### PostgreSQL优化配置
```sql
-- 调整连接数
ALTER SYSTEM SET max_connections = 500;
SELECT pg_reload_conf();

-- 调整缓存
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

#### InfluxDB存储策略
```bash
# 创建存储策略
curl -XPOST http://localhost:8086/api/v2/buckets \
  -H "Authorization: Token device_admin_token_123" \
  -H "Content-Type: application/json" \
  -d '{"name":"device-metrics-30d","retentionRules":[{"type":"expire","everySeconds":2592000}]}'
```

### 3. 性能调优

#### JVM参数优化
```bash
# 在docker-compose.yml中调整
environment:
  JAVA_OPTS: "-Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

#### 系统参数优化
```bash
# 网络优化
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
sysctl -p
```

## 📊 监控与运维

### 1. 关键指标监控

**系统指标**:
- CPU使用率 < 80%
- 内存使用率 < 85%  
- 磁盘使用率 < 90%
- 网络延迟 < 100ms

**应用指标**:
- API响应时间 P99 < 2000ms
- 错误率 < 5%
- 数据库连接数 < 80%
- 消息队列积压 < 1000条

### 2. 告警配置

在Grafana中配置告警规则:

```yaml
# 告警规则示例
groups:
- name: device-management
  rules:
  - alert: HighAPIResponseTime
    expr: histogram_quantile(0.99, http_request_duration_seconds_bucket) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "API响应时间过高"
```

### 3. 备份策略

```bash
# 数据库备份脚本
#!/bin/bash
BACKUP_DIR="/opt/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# PostgreSQL备份
docker exec device-postgresql pg_dump -U device_admin device_management > $BACKUP_DIR/postgresql.sql

# Redis备份
docker cp device-redis:/data/dump.rdb $BACKUP_DIR/redis.rdb

# InfluxDB备份
docker exec device-influxdb influx backup /var/lib/influxdb2 --bucket device-metrics --path $BACKUP_DIR/influxdb
```

## 🆘 故障排查

### 常见问题

**1. 服务启动失败**
```bash
# 查看服务日志
docker-compose logs [service_name]

# 检查端口占用
netstat -tulpn | grep [port]

# 检查磁盘空间
df -h
```

**2. 数据库连接失败**
```bash
# 检查PostgreSQL状态
docker exec device-postgresql pg_isready -U device_admin

# 检查连接数
docker exec device-postgresql psql -U device_admin -c "SELECT count(*) FROM pg_stat_activity;"
```

**3. 内存不足**
```bash
# 查看内存使用
free -h
docker stats

# 清理未使用的镜像
docker system prune -f

# 调整JVM参数
export JAVA_OPTS="-Xms1g -Xmx2g"
```

## 📞 技术支持

如遇到部署问题，请提供以下信息:
1. 服务器配置信息 (CPU/内存/磁盘)
2. 操作系统版本
3. Docker版本
4. 错误日志 (`docker-compose logs`)
5. 系统资源使用情况 (`docker stats`)

## 🔄 版本更新

```bash
# 备份现有数据
./04-deploy.sh --backup

# 拉取最新代码
git pull origin main

# 重新构建服务
./04-deploy.sh -e prod --mode rebuild

# 验证部署
curl http://localhost:8080/actuator/health
```