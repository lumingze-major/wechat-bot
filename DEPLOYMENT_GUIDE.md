# 微信机器人部署指南 - 最佳免费托管平台

## 🚀 推荐的免费托管平台

基于2024年最新调研，以下是最适合Node.js微信机器人的免费托管平台：

### 1. Railway ⭐⭐⭐⭐⭐ (强烈推荐)

**为什么选择Railway：**
- 🎯 专为开发者设计，部署极其简单
- 🔄 自动从GitHub部署，支持持续集成
- 💾 内置PostgreSQL和Redis支持
- 🌐 全球CDN和自动SSL证书
- 💰 慷慨的免费额度：512MB RAM，1GB存储
- ⚡ 快速冷启动，无睡眠模式问题

**免费额度：**
- 512MB RAM
- 1GB磁盘空间
- 100GB带宽/月
- 无睡眠模式

### 2. Render ⭐⭐⭐⭐

**优势：**
- 🛡️ 内置DDoS保护和WAF
- 🔒 自动SSL证书管理
- 📊 详细的监控和日志
- 🐳 支持Docker容器
- 🗄️ 免费PostgreSQL数据库

**免费额度：**
- 512MB RAM
- 无限静态站点
- 100GB带宽/月
- 90天数据库保留

### 3. Fly.io ⭐⭐⭐⭐

**特色：**
- 🌍 全球边缘部署，低延迟
- 🐳 基于Docker的部署
- 📍 应用运行在离用户最近的服务器
- 💡 IPv6原生支持

**免费额度：**
- 3个共享CPU虚拟机
- 256MB RAM每个VM
- 3GB持久存储
- 160GB出站流量/月

## 📋 部署前准备

### 1. 环境变量配置

创建 `.env` 文件（基于 `.env.example`）：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**必需的环境变量：**
```env
# 豆包服务配置（必需）
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=your_model_endpoint

# 机器人配置
BOT_NAME=微信机器人
ADMIN_CONTACT=your_wechat_id

# 功能开关
ENABLE_KNOWLEDGE=true
ENABLE_ENTERTAINMENT=true
ENABLE_TOOLS=true
ENABLE_GROUP_MANAGE=true

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/bot.log

# 数据存储
DATA_DIR=data
CACHE_TTL=3600
```

### 2. 添加启动脚本

在 `package.json` 中确保有正确的启动脚本：

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### 3. 创建健康检查端点

为了确保服务正常运行，建议添加健康检查：

```javascript
// 在 src/index.js 中添加
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});
```

## 🚀 Railway 部署步骤（推荐）

### 1. 准备代码仓库

```bash
# 初始化Git仓库（如果还没有）
git init
git add .
git commit -m "Initial commit for deployment"

# 推送到GitHub
git remote add origin https://github.com/yourusername/wechat-bot.git
git push -u origin main
```

### 2. 部署到Railway

1. 访问 [Railway.app](https://railway.app)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择你的微信机器人仓库
6. Railway会自动检测Node.js项目并开始部署

### 3. 配置环境变量

在Railway项目面板中：
1. 点击你的服务
2. 进入 "Variables" 标签
3. 添加所有必需的环境变量

### 4. 生成公共域名

1. 在项目设置中点击 "Generate Domain"
2. 获取你的应用URL

## 🔧 Render 部署步骤

### 1. 创建 render.yaml 配置文件

```yaml
services:
  - type: web
    name: wechat-bot
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### 2. 部署步骤

1. 访问 [Render.com](https://render.com)
2. 使用GitHub登录
3. 点击 "New" → "Web Service"
4. 连接GitHub仓库
5. 配置构建设置：
   - Build Command: `npm install`
   - Start Command: `npm start`
6. 添加环境变量
7. 点击 "Create Web Service"

## ⚡ Fly.io 部署步骤

### 1. 安装Fly CLI

```bash
# Linux/macOS
curl -L https://fly.io/install.sh | sh

# 或使用包管理器
npm install -g @flydotio/flyctl
```

### 2. 登录和初始化

```bash
# 登录Fly.io
flyctl auth login

# 在项目目录中初始化
flyctl launch
```

### 3. 配置 fly.toml

```toml
app = "your-wechat-bot"
primary_region = "hkg"  # 香港区域，延迟更低

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### 4. 设置环境变量

```bash
# 设置豆包API密钥
flyctl secrets set DOUBAO_API_KEY=your_api_key
flyctl secrets set DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
flyctl secrets set DOUBAO_MODEL=your_model

# 设置其他环境变量
flyctl secrets set BOT_NAME="微信机器人"
flyctl secrets set ADMIN_CONTACT=your_wechat_id
```

### 5. 部署

```bash
flyctl deploy
```

## 📊 平台对比总结

| 平台 | 免费RAM | 存储 | 带宽 | 冷启动 | 推荐指数 |
|------|---------|------|------|--------|----------|
| Railway | 512MB | 1GB | 100GB/月 | 无睡眠 | ⭐⭐⭐⭐⭐ |
| Render | 512MB | 无限 | 100GB/月 | 30秒 | ⭐⭐⭐⭐ |
| Fly.io | 256MB×3 | 3GB | 160GB/月 | 200ms | ⭐⭐⭐⭐ |

## 🔍 部署后验证

### 1. 检查应用状态

```bash
# Railway
railway status

# Render
# 在Render控制台查看日志

# Fly.io
flyctl status
flyctl logs
```

### 2. 测试健康检查

```bash
curl https://your-app-url.railway.app/health
```

### 3. 监控日志

所有平台都提供实时日志查看功能，用于调试和监控。

## 🛡️ 安全建议

1. **环境变量安全**：
   - 永远不要在代码中硬编码API密钥
   - 使用平台的环境变量功能

2. **访问控制**：
   - 设置适当的管理员联系人
   - 定期轮换API密钥

3. **监控**：
   - 定期检查应用日志
   - 设置错误告警

## 🎯 推荐选择

**对于微信机器人项目，我强烈推荐 Railway**：

✅ **优势**：
- 部署最简单，几分钟即可完成
- 无睡眠模式，机器人始终在线
- 自动SSL和域名
- 优秀的开发者体验
- 慷慨的免费额度

✅ **适合场景**：
- 个人项目和小型团队
- 需要24/7在线的机器人
- 快速原型和测试

开始部署你的微信机器人吧！🚀