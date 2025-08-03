# 腾讯云托管部署指南

## 项目概述

这是一个功能全面的微信机器人项目，支持智能对话、知识问答、娱乐功能、实用工具和群组管理等功能。

## 部署准备

### 1. 环境要求

- Node.js 18.15+
- 腾讯云账号
- 微信开发者账号

### 2. 必需的环境变量

在腾讯云控制台配置以下环境变量：

```bash
# AI服务配置
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=ep-20241203140648-xxxxx

# 功能开关
ENABLE_AI_CHAT=true
ENABLE_KNOWLEDGE_QA=true
ENABLE_ENTERTAINMENT=true
ENABLE_TOOLS=true
ENABLE_GROUP_MANAGEMENT=true

# 服务配置
PORT=8080
NODE_ENV=production

# 可选配置
LOG_LEVEL=info
CACHE_TTL=3600
```

## 部署步骤

### 方式一：云函数部署

1. **安装腾讯云CLI工具**
   ```bash
   npm install -g @cloudbase/cli
   ```

2. **登录腾讯云**
   ```bash
   cloudbase login
   ```

3. **初始化项目**
   ```bash
   cloudbase init
   ```

4. **部署云函数**
   ```bash
   cloudbase functions:deploy wechat-bot
   ```

5. **部署静态网站**
   ```bash
   cloudbase hosting:deploy public
   ```

### 方式二：容器部署

1. **构建Docker镜像**
   ```bash
   docker build -t wechat-bot .
   ```

2. **推送到腾讯云容器镜像服务**
   ```bash
   docker tag wechat-bot ccr.ccs.tencentyun.com/your-namespace/wechat-bot
   docker push ccr.ccs.tencentyun.com/your-namespace/wechat-bot
   ```

3. **在腾讯云容器服务中部署**

## 配置说明

### cloudbaserc.json

```json
{
  "envId": "your-env-id",
  "functionRoot": "./",
  "functions": [
    {
      "name": "wechat-bot",
      "timeout": 300,
      "envVariables": {
        "NODE_ENV": "production",
        "PORT": "8080"
      },
      "runtime": "Nodejs18.15",
      "memorySize": 512,
      "handler": "index.main"
    }
  ],
  "hosting": {
    "public": "./public",
    "ignore": [
      "node_modules/**/*",
      ".git/**/*",
      "logs/**/*",
      "data/**/*"
    ]
  }
}
```

### Dockerfile

项目包含优化的Dockerfile，支持：
- 多阶段构建
- 非root用户运行
- 生产环境优化
- 健康检查

## 功能特性

### 🤖 智能对话
- 基于豆包AI的智能对话
- 上下文记忆
- 多轮对话支持

### 📚 知识问答
- 实时信息查询
- 专业知识解答
- 学习资料推荐

### 🎮 娱乐功能
- 笑话大全
- 成语接龙
- 猜谜游戏
- 星座运势

### 🛠️ 实用工具
- 天气查询
- 翻译服务
- 计算器
- 提醒设置

### 👥 群组管理
- 群消息管理
- 成员管理
- 群规则设置
- 自动回复

## 监控和维护

### 健康检查

- 健康检查端点：`/health`
- 管理界面：`/`
- 实时状态监控

### 日志管理

- 结构化日志输出
- 多级别日志记录
- 错误追踪和报告

### 性能优化

- 内存缓存机制
- 请求限流
- 资源清理

## 故障排除

### 常见问题

1. **部署失败**
   - 检查环境变量配置
   - 确认依赖包安装
   - 查看部署日志

2. **微信登录失败**
   - 检查网络连接
   - 确认微信版本兼容性
   - 重新扫码登录

3. **AI服务异常**
   - 验证API密钥
   - 检查服务配额
   - 确认网络访问

### 日志查看

```bash
# 查看云函数日志
cloudbase functions:log wechat-bot

# 查看容器日志
kubectl logs deployment/wechat-bot
```

## 安全建议

1. **环境变量安全**
   - 使用腾讯云密钥管理服务
   - 定期轮换API密钥
   - 避免在代码中硬编码敏感信息

2. **网络安全**
   - 配置安全组规则
   - 启用HTTPS
   - 限制访问来源

3. **数据安全**
   - 定期备份数据
   - 加密敏感信息
   - 遵循数据保护法规

## 技术支持

如遇到问题，请：

1. 查看项目文档
2. 检查日志输出
3. 提交Issue反馈
4. 联系技术支持

---

**注意**：部署前请确保已正确配置所有必需的环境变量和依赖服务。