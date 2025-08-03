# 推送到远程仓库指南

## 当前状态

本地仓库有 2 个提交需要推送到远程 GitHub 仓库：

1. **Fix cloud function deployment: simplify dependencies and add cloud function entry point**
2. **Fix Kubernetes health check: update port to 8080 and add K8s deployment files**

## 网络问题

当前遇到网络连接问题：
```
fatal: unable to access 'https://github.com/lumingze-major/wechat-bot.git/': 
Failed to connect to github.com port 443 after 146083 ms: Couldn't connect to server
```

## 解决方案

### 方案一：重试推送（推荐）

等待网络稳定后，执行：
```bash
cd /mnt/c/py/ql/wechat-bot
git push origin master
```

### 方案二：使用 SSH 方式

如果 HTTPS 连接有问题，可以改用 SSH：

1. **设置 SSH 密钥**（如果还没有）：
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   cat ~/.ssh/id_rsa.pub
   ```
   将公钥添加到 GitHub 账户的 SSH Keys 中。

2. **更改远程仓库 URL**：
   ```bash
   git remote set-url origin git@github.com:lumingze-major/wechat-bot.git
   git push origin master
   ```

### 方案三：使用代理

如果网络环境需要代理：
```bash
# 设置 HTTP 代理
git config --global http.proxy http://proxy.server:port
git config --global https.proxy https://proxy.server:port

# 推送
git push origin master

# 推送后清除代理设置
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 方案四：分批推送

如果文件太大，可以分批推送：
```bash
# 推送第一个提交
git push origin HEAD~1:master

# 推送第二个提交
git push origin master
```

### 方案五：手动上传

作为最后手段，可以：
1. 将修改的文件手动上传到 GitHub 网页界面
2. 或者使用 GitHub Desktop 客户端
3. 或者使用 GitHub CLI：
   ```bash
   gh repo sync lumingze-major/wechat-bot
   ```

## 验证推送成功

推送成功后，检查：
```bash
git status
# 应该显示：Your branch is up to date with 'origin/master'

git log --oneline -3
# 应该显示最新的提交
```

## 重要文件清单

本次推送包含以下重要文件：
- `index.js` - 云函数入口文件
- `package.json` - 简化的依赖配置
- `Dockerfile` - Docker 容器配置
- `k8s-deployment.yaml` - Kubernetes 部署配置
- `CLOUD_FUNCTION_DEPLOYMENT.md` - 部署指南

这些文件解决了云函数部署和 Kubernetes 健康检查的问题。