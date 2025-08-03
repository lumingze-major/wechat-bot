#!/bin/bash

# 微信机器人快速部署脚本
# 支持 Railway, Render, Fly.io 三个平台

set -e

echo "🚀 微信机器人部署助手"
echo "==================="
echo ""
echo "支持的平台:"
echo "1. Railway (推荐) - 最简单的部署"
echo "2. Render - 稳定可靠"
echo "3. Fly.io - 全球边缘部署"
echo "4. 手动部署指南"
echo ""

read -p "请选择部署平台 (1-4): " choice

case $choice in
  1)
    echo "\n🚄 Railway 部署"
    echo "==============="
    echo "1. 访问 https://railway.app"
    echo "2. 使用 GitHub 登录"
    echo "3. 点击 'New Project'"
    echo "4. 选择 'Deploy from GitHub repo'"
    echo "5. 选择你的微信机器人仓库"
    echo "6. Railway 会自动检测并部署"
    echo "7. 在 Variables 标签中添加环境变量:"
    echo "   - DOUBAO_API_KEY"
    echo "   - DOUBAO_BASE_URL"
    echo "   - DOUBAO_MODEL"
    echo "   - BOT_NAME"
    echo "   - ADMIN_CONTACT"
    echo "8. 点击 'Generate Domain' 获取访问地址"
    echo "\n✅ Railway 部署完成！"
    ;;
  2)
    echo "\n🎨 Render 部署"
    echo "=============="
    echo "1. 访问 https://render.com"
    echo "2. 使用 GitHub 登录"
    echo "3. 点击 'New' → 'Web Service'"
    echo "4. 连接 GitHub 仓库"
    echo "5. 配置构建设置:"
    echo "   - Build Command: npm install"
    echo "   - Start Command: npm start"
    echo "6. 添加环境变量 (Environment 标签)"
    echo "7. 点击 'Create Web Service'"
    echo "\n✅ Render 部署完成！"
    ;;
  3)
    echo "\n✈️ Fly.io 部署"
    echo "=============="
    echo "请确保已安装 Fly CLI:"
    echo "curl -L https://fly.io/install.sh | sh"
    echo ""
    echo "部署步骤:"
    echo "1. flyctl auth login"
    echo "2. flyctl launch (选择现有的 fly.toml 配置)"
    echo "3. 设置环境变量:"
    echo "   flyctl secrets set DOUBAO_API_KEY=your_key"
    echo "   flyctl secrets set DOUBAO_BASE_URL=your_url"
    echo "   flyctl secrets set DOUBAO_MODEL=your_model"
    echo "4. flyctl deploy"
    echo "\n✅ Fly.io 部署完成！"
    ;;
  4)
    echo "\n📖 手动部署指南"
    echo "==============="
    echo "请查看 DEPLOYMENT_GUIDE.md 文件获取详细的部署指南"
    echo "包含所有平台的详细步骤和配置说明"
    ;;
  *)
    echo "❌ 无效选择，请重新运行脚本"
    exit 1
    ;;
esac

echo ""
echo "📋 部署后检查清单:"
echo "================="
echo "✓ 检查应用状态和日志"
echo "✓ 访问 /health 端点验证服务"
echo "✓ 确认所有环境变量已正确设置"
echo "✓ 测试微信机器人功能"
echo ""
echo "🔗 有用的链接:"
echo "- Railway: https://railway.app"
echo "- Render: https://render.com"
echo "- Fly.io: https://fly.io"
echo "- 部署指南: ./DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 祝你部署成功！"