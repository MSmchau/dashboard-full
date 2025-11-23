#!/bin/bash

# ==========================================
# 设备管理系统数据备份恢复脚本
# 版本: 1.0.0
# 功能: 自动化数据库备份、恢复和迁移
# 支持: PostgreSQL、Redis、InfluxDB数据备份
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/opt/backups/device-management"
LOG_FILE="$PROJECT_DIR/logs/backup.log"

# 创建必要的目录
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# 配置
RETENTION_DAYS=30
BACKUP_COMPRESSION=true
ENCRYPT_BACKUP=false

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 生成时间戳
get_timestamp() {
    date +"%Y%m%d-%H%M%S"
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理 $RETENTION_DAYS 天前的备份文件..."
    
    find "$BACKUP_DIR" -type f -name "*.sql" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type f -name "*.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type f -name "*.rdb" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type d -empty -mtime +1 -delete 2>/dev/null || true
    
    log_success "旧备份清理完成"
}

# 压缩文件
compress_file() {
    local file="$1"
    if [ "$BACKUP_COMPRESSION" = true ] && command -v gzip &> /dev/null; then
        gzip "$file"
        echo "${file}.gz"
    else
        echo "$file"
    fi
}

# 加密文件
encrypt_file() {
    local file="$1"
    local password="$2"
    
    if [ "$ENCRYPT_BACKUP" = true ] && command -v gpg &> /dev/null && [ -n "$password" ]; then
        gpg --symmetric --cipher-algo AES256 --passphrase "$password" --quiet --no-greeting -o "${file}.gpg" "$file" 2>/dev/null && {
            rm "$file"
            echo "${file}.gpg"
        } || {
            log_warning "加密失败，使用未加密备份"
            echo "$file"
        }
    else
        echo "$file"
    fi
}

# 备份PostgreSQL
backup_postgresql() {
    local backup_name="postgresql-backup-$(get_timestamp)"
    local backup_file="$BACKUP_DIR/$backup_name.sql"
    
    log_info "开始备份PostgreSQL数据库..."
    
    # 确保容器正在运行
    if ! docker ps --format "table {{.Names}}" | grep -q postgres_db; then
        log_error "PostgreSQL容器未运行"
        return 1
    fi
    
    # 创建备份
    if docker exec postgres_db pg_dump -U device_admin -d device_management --verbose --clean --create \
       --format=custom --file=/tmp/"$backup_name".dump >/dev/null 2>&1; then
        
        # 复制备份文件到宿主机
        docker cp postgres_db:/tmp/"$backup_name".dump "$backup_file"
        
        # 压缩和加密
        local final_file=$(compress_file "$backup_file")
        final_file=$(encrypt_file "$final_file" "${BACKUP_PASSWORD:-}")
        
        log_success "PostgreSQL备份完成: $final_file"
        
        # 显示备份大小
        local backup_size=$(du -h "$final_file" | cut -f1)
        log_info "备份文件大小: $backup_size"
        
        return 0
    else
        log_error "PostgreSQL备份失败"
        return 1
    fi
}

# 恢复PostgreSQL
restore_postgresql() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件路径"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    log_info "开始恢复PostgreSQL数据库..."
    
    # 检查备份文件格式
    local temp_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        temp_file="${backup_file%.gz}"
        log_info "解压备份文件..."
        gunzip -c "$backup_file" > "$temp_file"
    elif [[ "$backup_file" == *.gpg ]]; then
        temp_file="${backup_file%.gpg}"
        log_info "解密备份文件..."
        if [ -n "${BACKUP_PASSWORD:-}" ]; then
            gpg --decrypt --quiet --no-greeting --passphrase "$BACKUP_PASSWORD" "$backup_file" > "$temp_file" 2>/dev/null || {
                log_error "解密失败"
                return 1
            }
        else
            log_error "需要解密密码"
            return 1
        fi
    fi
    
    # 恢复数据库
    if [[ "$temp_file" == *.dump ]]; then
        # 自定义格式
        docker exec -i postgres_db pg_restore -U device_admin -d postgres -v "$temp_file" < /dev/null
    else
        # SQL格式
        cat "$temp_file" | docker exec -i postgres_db psql -U device_admin -d postgres
    fi
    
    log_success "PostgreSQL恢复完成"
    
    # 清理临时文件
    [ "$temp_file" != "$backup_file" ] && rm -f "$temp_file"
}

# 备份Redis
backup_redis() {
    local backup_name="redis-backup-$(get_timestamp)"
    local backup_file="$BACKUP_DIR/$backup_name.rdb"
    
    log_info "开始备份Redis..."
    
    # 确保Redis容器正在运行
    if ! docker exec redis_cache redis-cli ping | grep -q PONG; then
        log_error "Redis连接失败"
        return 1
    fi
    
    # 执行Redis BGSAVE
    docker exec redis_cache redis-cli BGSAVE
    
    # 等待保存完成
    sleep 5
    
    # 复制RDB文件
    docker cp redis_cache:/data/dump.rdb "$backup_file"
    
    # 压缩和加密
    local final_file=$(compress_file "$backup_file")
    final_file=$(encrypt_file "$final_file" "${BACKUP_PASSWORD:-}")
    
    log_success "Redis备份完成: $final_file"
    
    # 显示备份大小
    local backup_size=$(du -h "$final_file" | cut -f1)
    log_info "备份文件大小: $backup_size"
    
    return 0
}

# 恢复Redis
restore_redis() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件路径"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    log_info "开始恢复Redis..."
    
    # 解密和解压
    local temp_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        temp_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$temp_file"
    elif [[ "$backup_file" == *.gpg ]]; then
        temp_file="${backup_file%.gpg}"
        if [ -n "${BACKUP_PASSWORD:-}" ]; then
            gpg --decrypt --quiet --no-greeting --passphrase "$BACKUP_PASSWORD" "$backup_file" > "$temp_file"
        else
            log_error "需要解密密码"
            return 1
        fi
    fi
    
    # 停止Redis
    docker stop redis_cache
    sleep 3
    
    # 替换RDB文件
    cp "$temp_file" /tmp/dump.rdb
    docker cp /tmp/dump.rdb redis_cache:/data/dump.rdb
    rm -f /tmp/dump.rdb
    
    # 重启Redis
    docker start redis_cache
    sleep 3
    
    # 验证恢复
    if docker exec redis_cache redis-cli ping | grep -q PONG; then
        log_success "Redis恢复完成"
    else
        log_error "Redis恢复验证失败"
        return 1
    fi
    
    # 清理临时文件
    [ "$temp_file" != "$backup_file" ] && rm -f "$temp_file"
}

# 备份InfluxDB
backup_influxdb() {
    local backup_name="influxdb-backup-$(get_timestamp)"
    local backup_dir="$BACKUP_DIR/$backup_name"
    
    log_info "开始备份InfluxDB..."
    
    # 确保InfluxDB容器正在运行
    if ! curl -f -s http://localhost:8086/health &>/dev/null; then
        log_error "InfluxDB连接失败"
        return 1
    fi
    
    # 创建备份目录
    mkdir -p "$backup_dir"
    
    # 获取认证token
    local token=$(docker exec influxdb influx auth list --json 2>/dev/null | jq -r '.[0].token // empty' || echo "")
    
    if [ -n "$token" ]; then
        # 执行备份
        if docker exec influxdb influx backup /var/lib/influxdb2 \
           --bucket device-metrics \
           --path "$backup_dir" \
           --token "$token" 2>/dev/null; then
            
            # 压缩整个备份目录
            local final_archive="$BACKUP_DIR/$backup_name.tar.gz"
            tar -czf "$final_archive" -C "$BACKUP_DIR" "$(basename "$backup_dir")"
            rm -rf "$backup_dir"
            
            # 加密
            final_archive=$(encrypt_file "$final_archive" "${BACKUP_PASSWORD:-}")
            
            log_success "InfluxDB备份完成: $final_archive"
            
            # 显示备份大小
            local backup_size=$(du -h "$final_archive" | cut -f1)
            log_info "备份文件大小: $backup_size"
            
            return 0
        else
            log_error "InfluxDB备份失败"
            return 1
        fi
    else
        log_error "无法获取InfluxDB认证token"
        return 1
    fi
}

# 完整系统备份
full_system_backup() {
    local backup_name="full-system-backup-$(get_timestamp)"
    local backup_archive="$BACKUP_DIR/$backup_name.tar.gz"
    
    log_info "开始完整系统备份..."
    
    # 创建临时备份目录
    local temp_backup_dir="$BACKUP_DIR/temp-$backup_name"
    mkdir -p "$temp_backup_dir"
    
    # 备份各个组件
    local backup_result=0
    
    # PostgreSQL
    if ! backup_postgresql; then
        log_error "PostgreSQL备份失败"
        backup_result=1
    fi
    
    # Redis
    if ! backup_redis; then
        log_error "Redis备份失败"
        backup_result=1
    fi
    
    # InfluxDB
    if ! backup_influxdb; then
        log_error "InfluxDB备份失败"
        backup_result=1
    fi
    
    # 备份配置文件
    log_info "备份配置文件..."
    cp -r "$PROJECT_DIR/linux-deploy-scripts" "$temp_backup_dir/scripts/"
    
    # 备份数据目录
    log_info "备份数据目录..."
    mkdir -p "$temp_backup_dir/data"
    docker volume ls -q | while read volume; do
        docker run --rm -v "$volume":/data -v "$temp_backup_dir/data":/backup alpine \
            tar czf "/backup/$(echo $volume | tr ':' '_')_volume.tar.gz" -C /data . 2>/dev/null || true
    done
    
    # 创建备份清单
    cat > "$temp_backup_dir/backup-manifest.txt" << EOF
设备管理系统备份清单
备份时间: $(get_timestamp)
备份版本: 1.0.0
包含组件:
- PostgreSQL数据库
- Redis缓存
- InfluxDB时序数据库
- Docker配置
- 应用配置
- 数据卷备份

备份命令: $0 --full-backup
EOF
    
    # 压缩完整备份
    tar -czf "$backup_archive" -C "$BACKUP_DIR" "$(basename "$temp_backup_dir")"
    rm -rf "$temp_backup_dir"
    
    # 加密
    backup_archive=$(encrypt_file "$backup_archive" "${BACKUP_PASSWORD:-}")
    
    log_success "完整系统备份完成: $backup_archive"
    
    # 显示备份大小
    local backup_size=$(du -h "$backup_archive" | cut -f1)
    log_info "备份文件大小: $backup_size"
    
    return $backup_result
}

# 列出备份文件
list_backups() {
    log_info "备份文件列表:"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        log_info "未找到备份文件"
        return 0
    fi
    
    echo "文件名称                                大小         创建时间"
    echo "---------------------------------------- ------------ ------------"
    
    find "$BACKUP_DIR" -type f -name "*.sql*" -o -name "*.rdb*" -o -name "*.dump*" -o -name "*.tar.gz*" \
         -o -name "*.gpg*" | sort -r | while read file; do
        local filename=$(basename "$file")
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -c %y "$file" | cut -d' ' -f1-2)
        printf "%-40s %-12s %s\n" "$filename" "$size" "$date"
    done
}

# 显示恢复选项
show_restore_options() {
    log_info "可用的恢复选项:"
    
    echo ""
    echo "数据库恢复:"
    list_backups | grep -E "(sql|dump)" | head -5
    echo ""
    echo "Redis恢复:"
    list_backups | grep -E "(rdb)" | head -5
    echo ""
    echo "完整系统恢复:"
    list_backups | grep -E "(tar.gz)" | head -3
    echo ""
}

# 验证备份完整性
verify_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件路径"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    log_info "验证备份文件完整性: $backup_file"
    
    # 检查文件大小
    local file_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [ "$file_size" -eq 0 ]; then
        log_error "备份文件为空"
        return 1
    fi
    
    # 检查文件格式
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log_error "压缩文件损坏"
            return 1
        fi
    elif [[ "$backup_file" == *.gpg ]]; then
        if ! gpg --list-packets "$backup_file" &>/dev/null; then
            log_error "加密文件损坏或密码错误"
            return 1
        fi
    fi
    
    log_success "备份文件完整性验证通过"
    return 0
}

# 显示帮助信息
show_help() {
    echo "设备管理系统数据备份恢复脚本"
    echo ""
    echo "用法: $0 [选项] [参数]"
    echo ""
    echo "备份选项:"
    echo "  --postgresql-backup     备份PostgreSQL数据库"
    echo "  --redis-backup          备份Redis缓存"
    echo "  --influxdb-backup       备份InfluxDB时序数据库"
    echo "  --full-backup          完整系统备份"
    echo ""
    echo "恢复选项:"
    echo "  --restore-postgresql <backup_file>    恢复PostgreSQL"
    echo "  --restore-redis <backup_file>         恢复Redis"
    echo "  --restore-influxdb <backup_file>      恢复InfluxDB"
    echo "  --restore-full <backup_file>          完整系统恢复"
    echo ""
    echo "管理选项:"
    echo "  --list                 列出所有备份文件"
    echo "  --verify <backup_file> 验证备份文件完整性"
    echo "  --cleanup              清理旧备份文件"
    echo "  --show-options         显示恢复选项"
    echo ""
    echo "环境变量:"
    echo "  BACKUP_PASSWORD        备份加密密码"
    echo "  RETENTION_DAYS         备份保留天数 (默认: 30)"
    echo "  BACKUP_COMPRESSION     是否压缩备份 (true/false)"
    echo "  ENCRYPT_BACKUP         是否加密备份 (true/false)"
    echo ""
    echo "示例:"
    echo "  $0 --full-backup                          # 完整备份"
    echo "  $0 --restore-postgresql /path/to/backup.sql.gz  # 恢复PostgreSQL"
    echo "  BACKUP_PASSWORD=mypassword $0 --full-backup      # 带密码加密的完整备份"
}

# 主函数
main() {
    # 设置默认值
    BACKUP_PASSWORD="${BACKUP_PASSWORD:-}"
    RETENTION_DAYS="${RETENTION_DAYS:-30}"
    BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-true}"
    ENCRYPT_BACKUP="${ENCRYPT_BACKUP:-false}"
    
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --postgresql-backup)
            backup_postgresql
            ;;
        --redis-backup)
            backup_redis
            ;;
        --influxdb-backup)
            backup_influxdb
            ;;
        --full-backup)
            full_system_backup
            cleanup_old_backups
            ;;
        --restore-postgresql)
            if [ -z "${2:-}" ]; then
                log_error "请指定备份文件路径"
                exit 1
            fi
            restore_postgresql "$2"
            ;;
        --restore-redis)
            if [ -z "${2:-}" ]; then
                log_error "请指定备份文件路径"
                exit 1
            fi
            restore_redis "$2"
            ;;
        --restore-influxdb)
            if [ -z "${2:-}" ]; then
                log_error "请指定备份文件路径"
                exit 1
            fi
            # InfluxDB恢复实现
            log_info "InfluxDB恢复功能需要手动配置"
            ;;
        --restore-full)
            if [ -z "${2:-}" ]; then
                log_error "请指定备份文件路径"
                exit 1
            fi
            log_info "完整系统恢复功能需要详细配置和验证"
            ;;
        --list)
            list_backups
            ;;
        --verify)
            if [ -z "${2:-}" ]; then
                log_error "请指定备份文件路径"
                exit 1
            fi
            verify_backup "$2"
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        --show-options)
            show_restore_options
            ;;
        "")
            show_help
            exit 1
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"