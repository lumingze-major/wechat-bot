#!/bin/bash

# 微信机器人系统服务安装脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/wechat-bot.service"
SYSTEM_SERVICE_DIR="/etc/systemd/system"
SERVICE_NAME="wechat-bot.service"

echo "🚀 微信机器人系统服务安装程序"
echo "================================="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 sudo 运行此脚本"
    echo "   sudo bash install-service.sh"
    exit 1
fi

# 检查服务文件是否存在
if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ 错误: 未找到服务文件 $SERVICE_FILE"
    exit 1
fi

# 停止现有服务（如果存在）
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "🛑 停止现有服务..."
    systemctl stop $SERVICE_NAME
fi

# 复制服务文件
echo "📋 复制服务文件..."
cp "$SERVICE_FILE" "$SYSTEM_SERVICE_DIR/"

# 重新加载systemd
echo "🔄 重新加载 systemd..."
systemctl daemon-reload

# 启用服务
echo "✅ 启用服务..."
systemctl enable $SERVICE_NAME

echo ""
echo "🎉 安装完成！"
echo ""
echo "📖 使用方法:"
echo "  启动服务: sudo systemctl start wechat-bot"
echo "  停止服务: sudo systemctl stop wechat-bot"
echo "  重启服务: sudo systemctl restart wechat-bot"
echo "  查看状态: sudo systemctl status wechat-bot"
echo "  查看日志: sudo journalctl -u wechat-bot -f"
echo "  开机启动: sudo systemctl enable wechat-bot"
echo "  禁用开机启动: sudo systemctl disable wechat-bot"
echo ""
echo "🔧 或者使用进程管理器:"
echo "  ./bot start --daemon    # 后台启动"
echo "  ./bot stop             # 停止"
echo "  ./bot restart --daemon # 重启"
echo "  ./bot status           # 查看状态"
echo "  ./bot clean            # 清理所有进程"
echo "  ./bot logs 100         # 查看日志"
echo ""