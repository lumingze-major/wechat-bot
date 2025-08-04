# 微信机器人进程管理优化

## 🎯 概述

本项目提供了完整的进程管理解决方案，包括优雅的进程启动、停止、重启和清理功能，解决了进程积累和资源泄漏问题。

## 🚀 快速开始

### 方式一：使用进程管理器（推荐）

```bash
# 后台启动
./bot start --daemon

# 查看状态
./bot status

# 查看日志
./bot logs

# 停止
./bot stop

# 重启
./bot restart --daemon

# 清理所有相关进程
./bot clean
```

### 方式二：使用系统服务

```bash
# 安装系统服务
sudo bash install-service.sh

# 启动服务
sudo systemctl start wechat-bot

# 查看状态
sudo systemctl status wechat-bot

# 查看日志
sudo journalctl -u wechat-bot -f
```

## 📁 新增文件说明

### 1. `process-manager.js` - 核心进程管理器

**功能特性：**
- ✅ PID文件管理，防止重复启动
- ✅ 优雅关闭机制（SIGTERM → SIGKILL）
- ✅ 进程状态检测和监控
- ✅ 自动进程清理功能
- ✅ 日志文件管理
- ✅ 后台/前台启动模式

**主要方法：**
- `start(daemon)` - 启动机器人
- `stop()` - 停止机器人
- `restart(daemon)` - 重启机器人
- `status()` - 查看状态
- `cleanAll()` - 清理所有相关进程
- `showLogs(lines)` - 显示日志

### 2. `bot` - 命令行工具

简化的命令行接口，提供便捷的操作方式：

```bash
./bot <command> [options]
```

**支持的命令：**
- `start [--daemon|-d]` - 启动机器人
- `stop` - 停止机器人
- `restart [--daemon|-d]` - 重启机器人
- `status` - 查看状态
- `clean` - 清理所有相关进程
- `logs [lines]` - 显示日志

### 3. `wechat-bot.service` - 系统服务配置

**服务特性：**
- ✅ 自动重启机制
- ✅ 安全权限控制
- ✅ 日志管理
- ✅ 开机自启动
- ✅ 优雅关闭超时控制

### 4. `install-service.sh` - 服务安装脚本

自动安装和配置系统服务，提供完整的服务管理功能。

## 🔧 进程管理机制

### 启动流程

1. **检查现有进程** - 防止重复启动
2. **创建PID文件** - 记录进程ID
3. **启动子进程** - 分离或继承模式
4. **设置信号处理** - 优雅关闭机制
5. **日志重定向** - 统一日志管理

### 停止流程

1. **读取PID文件** - 获取进程ID
2. **发送SIGTERM** - 优雅关闭信号
3. **等待退出** - 最多30秒
4. **强制关闭** - SIGKILL信号
5. **清理资源** - 删除PID文件

### 清理机制

```bash
# 查找所有相关进程
pgrep -f "node.*start\.js"

# 逐个优雅关闭
kill -TERM <pid>

# 强制关闭（如需要）
kill -KILL <pid>

# 清理PID文件
rm -f bot.pid
```

## 📊 监控和日志

### 日志文件

- **位置**: `./bot.log`
- **格式**: 时间戳 + 日志级别 + 消息
- **轮转**: 自动管理，防止文件过大

### 状态检查

```bash
# 检查进程状态
./bot status

# 查看实时日志
./bot logs
tail -f bot.log

# 系统服务状态
sudo systemctl status wechat-bot
```

## 🛡️ 安全特性

### 权限控制

- **用户隔离**: 以普通用户身份运行
- **文件权限**: 只读系统文件，读写工作目录
- **网络限制**: 仅允许必要的网络访问

### 资源限制

- **内存保护**: 防止内存泄漏
- **进程隔离**: 独立的进程空间
- **临时文件**: 私有临时目录

## 🔄 升级和维护

### 热重启

```bash
# 无缝重启（保持服务连续性）
./bot restart --daemon

# 或使用系统服务
sudo systemctl restart wechat-bot
```

### 版本更新

```bash
# 停止服务
./bot stop

# 更新代码
git pull
npm install

# 重新启动
./bot start --daemon
```

### 故障排除

```bash
# 清理所有进程
./bot clean

# 查看详细日志
./bot logs 200

# 检查系统资源
top -p $(cat bot.pid)
```

## 📈 性能优化

### 内存管理

- **垃圾回收**: 自动内存清理
- **缓存控制**: 合理的缓存策略
- **连接池**: 复用网络连接

### 进程优化

- **单进程模式**: 避免进程碎片
- **异步处理**: 非阻塞I/O操作
- **资源释放**: 及时释放不用资源

## 🚨 故障恢复

### 自动恢复

- **进程监控**: 自动检测进程状态
- **自动重启**: 异常退出时自动重启
- **健康检查**: 定期检查服务健康状态

### 手动恢复

```bash
# 完全清理和重启
./bot clean
./bot start --daemon

# 或重置系统服务
sudo systemctl reset-failed wechat-bot
sudo systemctl restart wechat-bot
```

## 📞 技术支持

如果遇到问题，请按以下步骤排查：

1. **查看日志**: `./bot logs 100`
2. **检查状态**: `./bot status`
3. **清理进程**: `./bot clean`
4. **重新启动**: `./bot start --daemon`

如问题持续存在，请提供详细的日志信息以便进一步分析。