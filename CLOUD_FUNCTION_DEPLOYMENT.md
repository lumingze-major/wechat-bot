# 云函数部署修复指南

## 问题描述

原始的微信机器人项目在云函数环境中部署失败，主要错误：

```
Error: Cannot find module 'wechaty'
```

## 问题原因

1. **依赖复杂性**：`wechaty` 及其相关依赖（如 `wechaty-puppet-wechat`）在云函数环境中难以正确安装和运行
2. **二进制依赖**：某些依赖包含需要编译的二进制文件，在云函数环境中可能失败
3. **入口文件不兼容**：原始入口文件不符合云函数的要求

## 解决方案

### 1. 简化依赖项

移除了以下复杂依赖：
- `wechaty` 和相关 puppet 包
- `nodejieba`（中文分词，需要编译）
- `cheerio`、`node-cron`、`winston` 等非核心依赖

保留核心依赖：
- `express`：HTTP 服务器
- `axios`：HTTP 客户端
- `moment`：日期处理
- `openai`：AI 服务集成

### 2. 创建云函数兼容的入口文件

创建了新的 `index.js` 文件，包含：
- Express 应用服务器
- 健康检查端点
- 云函数主函数导出

### 3. 添加云函数配置

创建了 `cloudbaserc.json` 配置文件，用于腾讯云 CloudBase 部署。

## 部署步骤

### 方式一：Kubernetes 部署（解决健康检查问题）

1. **构建 Docker 镜像**：
   ```bash
   docker build -t wechat-bot:latest .
   ```

2. **部署到 Kubernetes**：
   ```bash
   kubectl apply -f k8s-deployment.yaml
   ```

3. **检查部署状态**：
   ```bash
   kubectl get pods -l app=wechat-bot
   kubectl logs -l app=wechat-bot
   ```

4. **验证健康检查**：
   ```bash
   kubectl port-forward service/wechat-bot-service 8080:80
   curl http://localhost:8080/health
   ```

### 方式二：使用简化版本（云平台）

1. **确认修改**：
   ```bash
   git status
   git log --oneline -3
   ```

2. **本地测试**：
   ```bash
   npm install
   PORT=3002 npm start
   curl http://localhost:3002/health
   ```

3. **部署到云平台**：
   - Railway/Render/Fly.io：直接使用现有配置文件
   - 腾讯云 CloudBase：使用 `cloudbaserc.json` 配置

### 方式二：恢复完整功能

如果需要完整的微信机器人功能，建议：

1. **使用容器化部署**：
   ```dockerfile
   FROM node:16-alpine
   RUN apk add --no-cache python3 make g++
   # ... 其他配置
   ```

2. **选择支持复杂依赖的平台**：
   - Docker 容器服务
   - VPS 服务器
   - 支持完整 Node.js 环境的云服务

## 验证部署

部署成功后，访问以下端点验证：

- `GET /`：基本状态检查
- `GET /health`：健康检查

预期响应：
```json
{
  "status": "ok",
  "message": "微信机器人云函数运行中",
  "timestamp": "2025-08-03T15:58:18.000Z"
}
```

## 注意事项

1. **功能限制**：当前简化版本主要提供 HTTP 服务，微信机器人功能需要额外配置
2. **环境变量**：确保在部署平台设置必要的环境变量
3. **端口配置**：云函数平台通常会自动分配端口，无需手动指定
4. **日志监控**：部署后注意监控应用日志，确保服务正常运行

## 故障排除

如果仍然遇到部署问题：

1. 检查平台的 Node.js 版本支持
2. 确认所有依赖都在 `package.json` 中正确声明
3. 查看平台的构建和运行日志
4. 考虑使用平台提供的示例模板