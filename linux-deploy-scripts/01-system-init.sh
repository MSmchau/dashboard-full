#!/bin/bash
# Linux服务器系统初始化脚本
# 适用于CentOS 8/RHEL 8/Ubuntu 22.04

set -e

echo "=== 开始系统初始化 ==="

# 更新系统包
if command -v dnf &> /dev/null; then
    echo "使用dnf包管理器..."
    sudo dnf update -y
    sudo dnf install -y java-17-openjdk java-17-openjdk-devel maven git docker docker-compose
elif command -v apt &> /dev/null; then
    echo "使用apt包管理器..."
    sudo apt update -y
    sudo apt install -y openjdk-17-jdk maven git docker.io docker-compose nginx
else
    echo "不支持的包管理器"
    exit 1
fi

# 创建项目目录结构
sudo mkdir -p /opt/device-management/{logs,config,data,backups}
sudo mkdir -p /var/log/device/{gateway-server,device-service,monitoring-service,data-collection-service,config-service,auth-service}

# 设置权限
sudo chown -R $USER:$USER /opt/device-management
sudo chown -R $USER:$USER /var/log/device

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 创建docker用户组（如果不存在）
if ! getent group docker > /dev/null 2>&1; then
    sudo groupadd docker
fi
sudo usermod -aG docker $USER

# 配置系统参数
echo "配置系统参数..."
cat << EOF | sudo tee /etc/sysctl.d/99-device-management.conf
# 网络优化
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# 文件描述符限制
fs.file-max = 65536

# 内存管理
vm.swappiness = 10
vm.dirty_ratio = 80
vm.dirty_background_ratio = 5
EOF

sudo sysctl -p /etc/sysctl.d/99-device-management.conf

# 配置限制
cat << EOF | sudo tee /etc/security/limits.d/99-device-management.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# 配置时区
sudo timedatectl set-timezone Asia/Shanghai

echo "=== 系统初始化完成 ==="
echo "请重启终端以使权限生效，然后继续部署"