# 微信机器人

功能全面的智能微信机器人，基于 Node.js + Wechaty + 豆包大模型构建。

## 功能特性

### 🤖 智能对话
- 豆包驱动的自然语言对话
- 上下文记忆和理解
- 情感分析和个性化回复

### 📚 知识问答
- 维基百科/百度百科集成
- 豆包增强的知识整合
- 智能搜索和答案生成

### 🎮 娱乐功能
- 知识竞赛（豆包生成题目）
- 文字接龙游戏
- 故事创作和诗词生成
- 笑话、谜语、名言分享

### 🔧 实用工具
- 天气查询和提醒
- 文本翻译服务
- 数学计算器
- 时间查询和汇率转换
- 短链生成和二维码

### 👥 群组管理
- 自动欢迎新成员
- 内容过滤和违规检测
- 警告系统和自动踢人
- 群设置和统计功能

### ⏰ 定时任务
- 每日问候和天气提醒
- 健康提醒和励志语录
- 系统维护和统计报告
- 自定义定时消息

## 快速开始

### 环境要求
- Node.js 14.0.0+
- 豆包 API 密钥

### 安装配置

```bash
# 克隆项目
git clone <repository-url>
cd wechat-bot

# 安装依赖
npm install

# 配置环境
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 运行测试
node test.js

# 启动机器人
npm start
# 或使用
node start.js
```

### 环境变量配置

```env
# 机器人基础配置
BOT_NAME=智能助手
ADMIN_CONTACT=管理员微信号

# 豆包服务配置
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=ep-20241230140956-8xqzm

# 功能开关
ENABLE_KNOWLEDGE=true
ENABLE_ENTERTAINMENT=true
ENABLE_TOOLS=true
ENABLE_GROUP_MANAGEMENT=true

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/bot.log
```

## 使用指南

### 基础命令
- `/帮助` - 查看所有可用命令
- `/状态` - 查看机器人运行状态
- `/统计` - 查看使用统计信息

### 知识问答
- `/问 <问题>` - 知识查询
- `/搜索 <关键词>` - 搜索相关信息

### 娱乐功能
- `/游戏` - 查看可用游戏
- `/竞赛 [类别]` - 开始知识竞赛
- `/接龙` - 文字接龙游戏
- `/故事 [主题]` - AI 创作故事
- `/笑话` - 随机笑话
- `/谜语` - 猜谜游戏
- `/诗词 [主题]` - 诗词创作
- `/名言 [类别]` - 励志名言

### 实用工具
- `/工具` - 查看可用工具
- `/天气 [城市]` - 天气查询
- `/翻译 <文本>` - 文本翻译
- `/计算 <表达式>` - 数学计算
- `/时间 [时区]` - 时间查询
- `/汇率 [货币1] [货币2]` - 汇率查询
- `/短链 <URL>` - 生成短链接
- `/二维码 <内容>` - 生成二维码

### 群管理（管理员）
- `/群设置` - 查看/修改群设置
- `/群信息` - 查看群基本信息
- `/群统计` - 查看群管理统计
- `/踢人 @用户` - 踢出群成员
- `/警告 @用户 [原因]` - 警告用户

## 项目结构

```
wechat-bot/
├── src/
│   ├── config/           # 配置文件
│   ├── handlers/         # 事件处理器
│   ├── services/         # 业务服务
│   ├── utils/           # 工具函数
│   └── index.js         # 主入口
├── logs/                # 日志文件
├── data/                # 数据存储
├── .env.example         # 环境变量模板
├── package.json         # 项目配置
├── start.js            # 启动脚本
├── test.js             # 测试脚本
└── README.md           # 说明文档
```

## 开发说明

### 添加新功能
1. 在 `src/services/` 创建服务模块
2. 在 `src/handlers/messageHandler.js` 添加命令处理
3. 更新配置文件和帮助信息

### 自定义豆包模型
修改 `src/config/index.js` 中的豆包配置：
```javascript
doubao: {
  baseURL: 'your_api_endpoint',
  apiKey: process.env.DOUBAO_API_KEY,
  model: 'your_model_name'
}
```

### 日志和监控
- 日志文件：`logs/bot.log`
- 错误日志：`logs/error.log`
- 运行状态：通过 `/状态` 命令查看

## 故障排除

### 常见问题
1. **登录失败**：检查网络连接和微信版本
2. **豆包服务错误**：验证 API 密钥和网络访问
3. **功能异常**：查看日志文件排查问题

### 测试命令
```bash
# 运行所有测试
node test.js

# 测试特定功能
node test.js --feature doubao
node test.js --feature cache

# 性能测试
node test.js --performance
```

## 许可证

MIT License