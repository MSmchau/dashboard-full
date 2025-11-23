#!/bin/bash
# 设备管理系统一键部署脚本
# 支持开发、测试、生产环境

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/03-environment.env"
DOCKER_COMPOSE_FILE="$SCRIPT_DIR/02-docker-compose.yml"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 帮助信息
show_help() {
    echo "设备管理系统部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -e, --env ENV       指定部署环境 (dev|test|prod)"
    echo "  -m, --mode MODE     部署模式 (quick|full|rebuild)"
    echo "  --check             仅检查系统环境"
    echo "  --stop              停止所有服务"
    echo "  --restart           重启所有服务"
    echo "  --backup            部署前备份数据"
    echo "  --force             强制部署 (忽略警告)"
    echo ""
    echo "示例:"
    echo "  $0 -e dev --mode quick              # 开发环境快速部署"
    echo "  $0 -e prod --mode full --backup     # 生产环境完整部署(带备份)"
    echo "  $0 --check                          # 仅检查环境"
    echo "  $0 --stop                           # 停止所有服务"
}

# 检查系统环境
check_system() {
    log_info "检查系统环境..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "操作系统: Linux"
    else
        log_error "仅支持Linux操作系统"
        exit 1
    fi
    
    # 检查内存
    total_mem=$(free -g | awk '/^Mem:/{print $2}')
    if [ $total_mem -lt 8 ]; then
        log_warning "系统内存不足8GB，建议至少16GB"
        [ "$FORCE_DEPLOY" != "true" ] && read -p "是否继续部署? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "系统内存: ${total_mem}GB"
    fi
    
    # 检查磁盘空间
    available_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ $available_space -lt 50 ]; then
        log_error "磁盘空间不足50GB，当前可用: ${available_space}GB"
        exit 1
    else
        log_success "磁盘空间: ${available_space}GB"
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    docker_version=$(docker --version)
    log_success "Docker版本: $docker_version"
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    compose_version=$(docker-compose --version)
    log_success "Docker Compose版本: $compose_version"
    
    # 检查Java
    if ! command -v java &> /dev/null; then
        log_warning "Java未安装，Docker容器将使用内置Java"
    else
        java_version=$(java -version 2>&1 | head -1)
        log_success "Java版本: $java_version"
    fi
    
    # 检查Maven
    if ! command -v mvn &> /dev/null; then
        log_warning "Maven未安装，Docker容器将使用内置Maven"
    else
        mvn_version=$(mvn -version)
        log_success "Maven版本: $mvn_version"
    fi
    
    return 0
}

# 数据备份
backup_data() {
    if [ "$BACKUP" == "true" ]; then
        log_info "开始数据备份..."
        
        backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        # 备份数据库
        if docker ps | grep -q device-postgresql; then
            log_info "备份PostgreSQL数据库..."
            docker exec device-postgresql pg_dump -U device_admin device_management > "$backup_dir/postgresql_backup.sql"
            log_success "PostgreSQL备份完成"
        fi
        
        # 备份Redis
        if docker ps | grep -q device-redis; then
            log_info "备份Redis数据..."
            docker exec device-redis redis-cli BGSAVE
            docker cp device-redis:/data/dump.rdb "$backup_dir/redis_dump.rdb"
            log_success "Redis备份完成"
        fi
        
        # 备份InfluxDB
        if docker ps | grep -q device-influxdb; then
            log_info "备份InfluxDB数据..."
            docker exec device-influxdb influx backup /var/lib/influxdb2 --bucket device-metrics
            docker cp device-influxdb:/root/.influxdb2/backup "$backup_dir/influxdb_backup"
            log_success "InfluxDB备份完成"
        fi
        
        log_success "数据备份完成: $backup_dir"
    fi
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."
    
    cd "$SCRIPT_DIR"
    docker-compose down --remove-orphans
    
    # 清理未使用的数据卷
    docker volume prune -f
    
    log_success "所有服务已停止"
}

# 清理服务
clean_services() {
    log_warning "清理服务数据..."
    
    cd "$SCRIPT_DIR"
    
    # 停止并删除容器
    docker-compose down --volumes --remove-orphans
    
    # 清理镜像
    docker images | grep device-management | awk '{print $3}' | xargs -r docker rmi -f
    
    # 清理数据卷
    docker volume prune -f
    
    log_success "服务清理完成"
}

# 构建服务
build_services() {
    log_info "构建服务镜像..."
    
    cd "$SCRIPT_DIR"
    
    # 构建应用服务镜像
    if [ "$MODE" == "rebuild" ] || [ "$MODE" == "full" ]; then
        log_info "重新构建应用服务..."
        
        # 这里需要根据实际项目结构调整
        # 假设Spring Boot项目在 src/ 目录
        if [ -d "$PROJECT_ROOT/src" ]; then
            cd "$PROJECT_ROOT"
            
            # 构建每个服务
            for service_dir in services/*/; do
                if [ -d "$service_dir" ]; then
                    service_name=$(basename "$service_dir")
                    log_info "构建服务: $service_name"
                    
                    cd "$service_dir"
                    if [ -f "pom.xml" ]; then
                        mvn clean package -DskipTests
                        docker build -t device-management/$service_name:latest .
                    fi
                fi
            done
            
            cd "$SCRIPT_DIR"
        fi
    fi
    
    log_success "服务镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    cd "$SCRIPT_DIR"
    
    # 启动基础设施服务
    log_info "启动基础设施服务..."
    docker-compose up -d postgresql redis influxdb kafka zookeeper eureka-server
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    sleep 30
    
    # 检查数据库连接
    while ! docker exec device-postgresql pg_isready -U device_admin -d device_management; do
        log_warning "等待PostgreSQL就绪..."
        sleep 5
    done
    
    # 启动应用服务
    log_info "启动应用服务..."
    docker-compose up -d gateway-server device-service data-collection-service monitoring-service config-service auth-service
    
    # 启动监控服务
    log_info "启动监控服务..."
    docker-compose up -d prometheus grafana elasticsearch logstash kibana nginx
    
    # 启动MinIO
    log_info "启动对象存储..."
    docker-compose up -d minio
    
    log_success "服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local failed_services=0
    local total_services=0
    
    # 检查核心服务
    services=(
        "postgresql:5432"
        "redis:6379"
        "influxdb:8086"
        "kafka:9092"
        "eureka-server:8761"
        "gateway-server:8080"
        "device-service:8081"
        "data-collection-service:8083"
        "monitoring-service:8082"
    )
    
    for service in "${services[@]}"; do
        total_services=$((total_services + 1))
        service_name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)
        
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/actuator/health" | grep -q "200"; then
            log_success "$service_name 健康检查通过"
        else
            log_error "$service_name 健康检查失败"
            failed_services=$((failed_services + 1))
        fi
    done
    
    log_info "健康检查完成: $((total_services - failed_services))/$total_services 服务正常"
    
    return $failed_services
}

# 部署验证
verify_deployment() {
    log_info "验证部署结果..."
    
    # 检查API网关
    if curl -s "http://localhost:8080/actuator/health" | grep -q "UP"; then
        log_success "API网关可用"
    else
        log_error "API网关不可用"
        return 1
    fi
    
    # 检查设备管理API
    if curl -s "http://localhost:8081/api/v1/devices" | grep -q "content\|devices"; then
        log_success "设备管理API可用"
    else
        log_warning "设备管理API验证失败"
    fi
    
    # 检查监控面板
    if curl -s "http://localhost:3000" | grep -q "Grafana"; then
        log_success "Grafana监控面板可访问"
    else
        log_warning "Grafana监控面板访问失败"
    fi
    
    # 检查数据库连接
    if docker exec device-postgresql pg_isready -U device_admin -d device_management | grep -q "accepting connections"; then
        log_success "PostgreSQL数据库连接正常"
    else
        log_error "PostgreSQL数据库连接异常"
        return 1
    fi
    
    # 检查Redis连接
    if docker exec device-redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis缓存连接正常"
    else
        log_error "Redis缓存连接异常"
        return 1
    fi
    
    log_success "部署验证通过"
}

# 生成访问信息
show_access_info() {
    log_info "=== 部署完成 ==="
    echo ""
    echo "🔗 访问地址:"
    echo "  API网关:        http://$(hostname -I | awk '{print $1}'):8080"
    echo "  设备管理API:    http://$(hostname -I | awk '{print $1}'):8081"
    echo "  监控面板:       http://$(hostname -I | awk '{print $1}'):3000 (admin/admin_123)"
    echo "  日志分析:       http://$(hostname -I | awk '{print $1}'):5601"
    echo "  对象存储控制台: http://$(hostname -I | awk '{print $1}'):9001 (admin/admin_123456)"
    echo ""
    echo "📊 服务状态:"
    docker-compose ps
    echo ""
    echo "📝 日志查看:"
    echo "  tail -f /var/log/device/gateway-server/application.log"
    echo ""
    echo "🔧 管理命令:"
    echo "  查看服务状态: cd $SCRIPT_DIR && docker-compose ps"
    echo "  查看服务日志: cd $SCRIPT_DIR && docker-compose logs -f [service_name]"
    echo "  重启服务:     cd $SCRIPT_DIR && docker-compose restart [service_name]"
    echo "  停止所有服务: cd $SCRIPT_DIR && $0 --stop"
}

# 解析命令行参数
ENVIRONMENT="dev"
MODE="quick"
FORCE_DEPLOY="false"
CHECK_ONLY="false"
BACKUP="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        --check)
            CHECK_ONLY="true"
            shift
            ;;
        --stop)
            stop_services
            exit 0
            ;;
        --restart)
            stop_services
            sleep 5
            start_services
            exit 0
            ;;
        --backup)
            BACKUP="true"
            shift
            ;;
        --force)
            FORCE_DEPLOY="true"
            shift
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主流程
main() {
    log_info "开始设备管理系统部署..."
    log_info "环境: $ENVIRONMENT | 模式: $MODE"
    
    # 检查系统环境
    if [ "$CHECK_ONLY" == "true" ]; then
        check_system
        exit 0
    fi
    
    check_system || exit 1
    
    # 停止现有服务
    if [ "$MODE" != "quick" ]; then
        log_info "准备部署..."
        read -p "是否停止现有服务并重新部署? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            stop_services
        fi
    fi
    
    # 数据备份
    backup_data
    
    # 构建服务
    build_services
    
    # 启动服务
    start_services
    
    # 等待服务启动
    log_info "等待服务就绪..."
    sleep 60
    
    # 健康检查
    if health_check; then
        log_success "健康检查通过"
    else
        log_error "健康检查失败"
        log_info "查看日志: docker-compose logs"
        exit 1
    fi
    
    # 部署验证
    if verify_deployment; then
        log_success "部署验证通过"
    else
        log_error "部署验证失败"
        exit 1
    fi
    
    # 显示访问信息
    show_access_info
}

# 错误处理
trap 'log_error "部署过程中发生错误，脚本已退出"; exit 1' ERR

# 执行主流程
main