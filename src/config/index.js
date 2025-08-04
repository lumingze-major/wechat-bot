require('dotenv').config();
const path = require('path');

module.exports = {
  // 机器人基础配置
  bot: {
    name: process.env.BOT_NAME || '微信机器人',
    adminContact: process.env.ADMIN_CONTACT || '',
    dataDir: process.env.DATA_DIR || 'data'
  },

  // Puppet 配置
  puppet: {
    type: process.env.PUPPET_TYPE || 'wechaty-puppet-wechat4u', // 可选: wechaty-puppet-wechat4u, wechaty-puppet-wechat, wechaty-puppet-service
    options: {
      // wechaty-puppet-service 配置
      token: process.env.PUPPET_SERVICE_TOKEN || '',
      endpoint: process.env.PUPPET_SERVICE_ENDPOINT || '',
      // wechaty-puppet-wechat 配置
      uos: process.env.PUPPET_WECHAT_UOS === 'true' // 启用UOS协议可能更稳定
    }
  },

  // 豆包服务配置
  doubao: {
    apiKey: process.env.DOUBAO_API_KEY || '',
    baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    model: process.env.DOUBAO_MODEL || 'ep-20241230140956-8xqzm',
    maxTokens: parseInt(process.env.DOUBAO_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.DOUBAO_TEMPERATURE) || 0.7,
    visionModel: process.env.DOUBAO_VISION_MODEL || 'doubao-seed-1-6-250615',
    videoModel: process.env.DOUBAO_VIDEO_MODEL || 'doubao-seed-1-6-250615'
  },

  // 功能开关
  features: {
    knowledge: process.env.ENABLE_KNOWLEDGE === 'true',
    entertainment: process.env.ENABLE_ENTERTAINMENT === 'true',
    tools: process.env.ENABLE_TOOLS === 'true',
    groupManage: process.env.ENABLE_GROUP_MANAGE === 'true',
    groupChat: process.env.ENABLE_GROUP_CHAT === 'true'
  },

  // 一起聊功能配置
  groupChat: {
    messageInterval: parseInt(process.env.GROUP_CHAT_INTERVAL) || 3, // 每隔几条消息发送一次
    maxContextLength: parseInt(process.env.GROUP_CHAT_MAX_CONTEXT) || 20, // 最大上下文长度
    enabled: false // 默认关闭
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/bot.log',
    maxSize: '10m',
    maxFiles: 5
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600,
    maxSize: 1000
  },

  // 命令前缀
  commands: {
    prefix: '/',
    help: ['help', '帮助', '?'],
    knowledge: ['知识', 'k', 'knowledge'],
    game: ['游戏', 'g', 'game'],
    tool: ['工具', 't', 'tool'],
    admin: ['admin', '管理'],
    clear: ['clear', '清除', 'reset', '重置'],
    groupChat: ['一起聊', 'together', 'group-chat'],
    stopGroupChat: ['停止一起聊', 'stop-together', 'stop-group-chat']
  },

  // 知识库配置
  knowledge: {
    sources: {
      wikipedia: true,
      baidu: true,
      custom: true
    },
    maxResults: 5,
    timeout: 10000
  },

  // 娱乐功能配置
  entertainment: {
    games: {
      quiz: true,
      wordChain: true,
      riddle: true,
      story: true
    },
    creative: {
      poetry: true,
      joke: true,
      quote: true
    }
  },

  // 工具配置
  tools: {
    weather: {
      apiKey: process.env.WEATHER_API_KEY || '',
      defaultCity: '北京'
    },
    translate: {
      apiKey: process.env.TRANSLATE_API_KEY || ''
    },
    qrcode: true,
    shortUrl: true
  },

  // 群管理配置
  groupManage: {
    welcomeMessage: true,
    autoReply: true,
    keywordFilter: true,
    memberLimit: 500
  },

  // 定时任务配置
  schedule: {
    dailyNews: {
      enabled: false,
      time: '08:00',
      rooms: []
    },
    weather: {
      enabled: false,
      time: '07:30',
      rooms: []
    }
  },

  // 调度器配置 (SchedulerService使用)
  scheduler: {
    dailyGreeting: {
      enabled: false,
      time: '09:00',
      rooms: []
    },
    weatherReminder: {
      enabled: false,
      time: '08:00',
      rooms: []
    },
    dailyQuote: {
      enabled: false,
      time: '10:00',
      rooms: []
    },
    healthReminder: {
      enabled: false,
      time: '18:00',
      rooms: []
    },
    adminNotification: {
      enabled: false,
      targetRooms: []
    }
  },

  // 文件路径
  paths: {
    data: path.join(__dirname, '../../data'),
    logs: path.join(__dirname, '../../logs'),
    cache: path.join(__dirname, '../../data/cache'),
    config: path.join(__dirname, '../../data/config')
  }
};