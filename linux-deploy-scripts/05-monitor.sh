#!/bin/bash

# ==========================================
# 设备管理系统运维监控脚本
# 版本: 1.0.0
# 支持: 支持3000+设备的运维监控
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/monitor.log"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" | tee -a "$LOG_FILE"
}

# 检查Docker和Docker Compose
check_docker() {
    log_info "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker服务未运行，请启动Docker服务"
        return 1
    fi
    
    log_success "Docker环境检查通过"
    return 0
}

# 检查服务健康状态
check_services() {
    log_info "检查服务健康状态..."
    
    local services=(
        "postgres_db:5432"
        "redis_cache:6379"
        "influxdb:8086"
        "kafka:9092"
        "eureka_server:8761"
        "gateway_server:8080"
        "device_service:8081"
        "monitor_service:8082"
        "data_collection_service:8083"
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        local service_name="${service%:*}"
        local service_port="${service#*:}"
        
        if curl -f -s "http://localhost:$service_port/health" > /dev/null 2>&1 || \
           curl -f -s "http://localhost:$service_port/actuator/health" > /dev/null 2>&1; then
            log_success "$service_name - 健康"
        elif nc -z localhost "$service_port" 2>/dev/null; then
            log_success "$service_name - 端口可连接"
        else
            log_error "$service_name - 不可用 (端口:$service_port)"
            failed_services+=("$service_name")
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_warning "发现 ${#failed_services[@]} 个不健康的服务: ${failed_services[*]}"
        return 1
    else
        log_success "所有服务健康检查通过"
        return 0
    fi
}

# 检查系统资源
check_resources() {
    log_info "检查系统资源..."
    
    # CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo 0) )); then
        log_warning "CPU使用率过高: ${cpu_usage}%"
    else
        log_success "CPU使用率正常: ${cpu_usage}%"
    fi
    
    # 内存使用率
    local mem_usage=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
    if (( $(echo "$mem_usage > 85" | bc -l 2>/dev/null || echo 0) )); then
        log_warning "内存使用率过高: ${mem_usage}%"
    else
        log_success "内存使用率正常: ${mem_usage}%"
    fi
    
    # 磁盘使用率
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_warning "磁盘使用率过高: ${disk_usage}%"
    else
        log_success "磁盘使用率正常: ${disk_usage}%"
    fi
    
    # Docker容器数量
    local container_count=$(docker ps -a --format "table {{.Names}}\t{{.Status}}" | wc -l)
    log_info "当前运行容器数: $((container_count - 1))"
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # PostgreSQL连接检查
    if docker exec postgres_db pg_isready -U device_admin &>/dev/null; then
        local pg_connections=$(docker exec postgres_db psql -U device_admin -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
        log_success "PostgreSQL - 连接数: $pg_connections"
    else
        log_error "PostgreSQL - 连接失败"
    fi
    
    # Redis连接检查
    if docker exec redis_cache redis-cli ping | grep -q PONG; then
        local redis_info=$(docker exec redis_cache redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log_success "Redis - 内存使用: $redis_info"
    else
        log_error "Redis - 连接失败"
    fi
    
    # InfluxDB连接检查
    if curl -f -s http://localhost:8086/health &>/dev/null; then
        log_success "InfluxDB - 健康"
    else
        log_error "InfluxDB - 连接失败"
    fi
}

# 检查设备连接状态
check_device_connections() {
    log_info "检查设备连接状态..."
    
    # 通过API获取设备连接数
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/v1/devices/stats 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local device_stats=$(curl -s http://localhost:8081/api/v1/devices/stats 2>/dev/null || echo '{"total":0,"online":0,"offline":0}')
        local total_devices=$(echo "$device_stats" | jq -r '.total // 0' 2>/dev/null || echo "0")
        local online_devices=$(echo "$device_stats" | jq -r '.online // 0' 2>/dev/null || echo "0")
        local offline_devices=$(echo "$device_stats" | jq -r '.offline // 0' 2>/dev/null || echo "0")
        
        log_success "设备统计 - 总数: $total_devices, 在线: $online_devices, 离线: $offline_devices"
        
        # 检查是否接近容量上限
        if [ "$online_devices" -gt 2800 ]; then
            log_warning "设备在线数接近容量上限: $online_devices/3000"
        fi
    else
        log_warning "无法获取设备连接状态 (HTTP: $response)"
    fi
    
    # 检查WebSocket连接数
    local ws_connections=$(netstat -an | grep :8084 | grep ESTABLISHED | wc -l 2>/dev/null || echo "0")
    log_info "WebSocket连接数: $ws_connections"
}

# 生成健康报告
generate_health_report() {
    log_info "生成健康检查报告..."
    
    local report_file="$PROJECT_DIR/reports/health-report-$(date +%Y%m%d-%H%M%S).html"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>设备管理系统健康报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007bff; }
        .metric h3 { margin: 0 0 5px 0; color: #333; }
        .metric p { margin: 0; color: #666; }
        .status-good { border-left-color: #28a745; }
        .status-warning { border-left-color: #ffc107; }
        .status-error { border-left-color: #dc3545; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>设备管理系统健康报告</h1>
            <p>生成时间: $(date '+%Y-%m-%d %H:%M:%S')</p>
        </div>
        
        <div id="metrics">
            <!-- 动态内容将在这里插入 -->
        </div>
        
        <div class="footer">
            <p>设备管理系统运维监控 | 支持3000+设备接入</p>
        </div>
    </div>
</body>
</html>
EOF
    
    # 添加系统信息到报告
    echo "
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const metrics = document.getElementById('metrics');
        metrics.innerHTML = \`
            <div class='metric status-good'>
                <h3>系统状态</h3>
                <p>正常运行</p>
            </div>
            <div class='metric'>
                <h3>CPU使用率</h3>
                <p>\$(top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | awk -F'%' '{print \$1}' || echo 'N/A')%</p>
            </div>
            <div class='metric'>
                <h3>内存使用率</h3>
                <p>\$(free | grep Mem | awk '{printf(\"%.1f%%\"), \$3/\$2 * 100.0}')</p>
            </div>
            <div class='metric'>
                <h3>磁盘使用率</h3>
                <p>\$(df -h / | awk 'NR==2 {print \$5}')</p>
            </div>
            <div class='metric'>
                <h3>运行容器数</h3>
                <p>\$(docker ps -q | wc -l) / \$(docker ps -a -q | wc -l)</p>
            </div>
        \`;
    });
    </script>
    " >> "$report_file"
    
    log_success "健康报告已生成: $report_file"
}

# 发送告警通知
send_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="${3:-warning}"
    
    # 发送邮件告警 (需要配置mailx)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "设备管理系统告警 - $alert_type" admin@company.com 2>/dev/null || true
    fi
    
    # 发送钉钉/企业微信通知 (需要配置webhook)
    local webhook_url="your-webhook-url"
    if [ -n "$webhook_url" ]; then
        curl -X POST "$webhook_url" \
            -H "Content-Type: application/json" \
            -d "{\"msgtype\": \"text\",\"text\": {\"content\": \"设备管理系统告警: $message\"}}" \
            &>/dev/null || true
    fi
    
    log_warning "告警已发送: $alert_type - $message"
}

# 自动修复常见问题
auto_fix() {
    log_info "尝试自动修复常见问题..."
    
    # 清理未使用的Docker资源
    if docker system df | grep -q "0 B"; then
        log_info "清理未使用的Docker资源..."
        docker system prune -f &>/dev/null || true
    fi
    
    # 重启无响应服务
    for service in postgres_db redis_cache influxdb; do
        if ! docker exec "$service" ps aux | grep -v grep >/dev/null 2>&1; then
            log_info "重启无响应服务: $service"
            docker restart "$service" &>/dev/null || true
            sleep 5
        fi
    done
    
    # 清理日志文件
    find "$PROJECT_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    find "$PROJECT_DIR/logs" -name "*.log.*" -mtime +3 -delete 2>/dev/null || true
    
    log_success "自动修复完成"
}

# 显示帮助信息
show_help() {
    echo "设备管理系统运维监控脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示此帮助信息"
    echo "  -c, --check             执行完整健康检查"
    echo "  -r, --report            生成健康报告"
    echo "  -f, --fix               自动修复常见问题"
    echo "  -a, --all               执行所有检查并生成报告"
    echo "  --services              仅检查服务状态"
    echo "  --resources             仅检查系统资源"
    echo "  --database              仅检查数据库连接"
    echo "  --devices               仅检查设备连接状态"
    echo ""
    echo "示例:"
    echo "  $0 --check              # 执行完整健康检查"
    echo "  $0 --report             # 生成健康报告"
    echo "  $0 -a                   # 执行所有检查"
    echo "  $0 --services           # 仅检查服务状态"
}

# 主函数
main() {
    local action="check"
    
    # 解析参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -c|--check)
            action="check"
            ;;
        -r|--report)
            action="report"
            ;;
        -f|--fix)
            action="fix"
            ;;
        -a|--all)
            action="all"
            ;;
        --services)
            action="services"
            ;;
        --resources)
            action="resources"
            ;;
        --database)
            action="database"
            ;;
        --devices)
            action="devices"
            ;;
        *)
            echo "未知选项: ${1:-}"
            show_help
            exit 1
            ;;
    esac
    
    log_info "开始执行: $action"
    
    # 检查Docker环境
    if ! check_docker; then
        exit 1
    fi
    
    # 执行相应操作
    case "$action" in
        check)
            check_services
            check_resources
            check_database
            check_device_connections
            ;;
        report)
            check_services
            check_resources
            check_database
            check_device_connections
            generate_health_report
            ;;
        fix)
            auto_fix
            check_services
            ;;
        all)
            auto_fix
            check_services
            check_resources
            check_database
            check_device_connections
            generate_health_report
            ;;
        services)
            check_services
            ;;
        resources)
            check_resources
            ;;
        database)
            check_database
            ;;
        devices)
            check_device_connections
            ;;
    esac
    
    log_success "监控检查完成"
}

# 执行主函数
main "$@"