# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 生产阶段
FROM node:18-alpine AS production

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# 复制package文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制应用代码
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.js ./
COPY --from=builder /app/index.js ./
COPY --from=builder /app/.env.example ./
COPY --from=builder /app/cloudbaserc.json ./

# 创建必要的目录
RUN mkdir -p logs data

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S wechatbot -u 1001 -G nodejs

# 设置文件权限
RUN chown -R wechatbot:nodejs /app

# 切换到非root用户
USER wechatbot

# 暴露端口
EXPOSE 8080

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 启动应用
CMD ["node", "start.js"]