const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保日志目录存在
const logDir = path.dirname(config.log.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: config.log.level,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // 文件输出
    new winston.transports.File({
      filename: config.log.file,
      maxsize: config.log.maxSize,
      maxFiles: config.log.maxFiles,
      tailable: true
    }),
    
    // 错误日志单独文件
    new winston.transports.File({
      filename: config.log.file.replace('.log', '.error.log'),
      level: 'error',
      maxsize: config.log.maxSize,
      maxFiles: config.log.maxFiles,
      tailable: true
    })
  ]
});

// 添加便捷方法
logger.bot = (message, ...args) => {
  logger.info(`[BOT] ${message}`, ...args);
};

logger.user = (user, message, ...args) => {
  logger.info(`[USER:${user}] ${message}`, ...args);
};

logger.room = (room, message, ...args) => {
  logger.info(`[ROOM:${room}] ${message}`, ...args);
};

logger.api = (api, message, ...args) => {
  logger.info(`[API:${api}] ${message}`, ...args);
};

module.exports = logger;