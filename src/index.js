const { WechatyBuilder } = require('wechaty');
const qrTerm = require('qrcode-terminal');
const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const MessageHandler = require('./handlers/messageHandler');
const ContactHandler = require('./handlers/contactHandler');
const RoomHandler = require('./handlers/roomHandler');
const SchedulerService = require('./services/schedulerService');
const DoubaoService = require('./services/doubaoService');
const GroupService = require('./services/groupService');
const ToolService = require('./services/toolService');

class WechatBot {
  constructor() {
    console.log('🚀 初始化微信机器人...');
    
    // 构建puppet配置
    const puppetConfig = {
      name: config.bot.name,
      puppet: config.puppet.type
    };
    
    // 根据puppet类型添加特定配置
    if (config.puppet.type === 'wechaty-puppet-service') {
      if (config.puppet.options.token) {
        puppetConfig.puppetOptions = {
          token: config.puppet.options.token,
          endpoint: config.puppet.options.endpoint
        };
      }
    } else if (config.puppet.type === 'wechaty-puppet-wechat') {
      if (config.puppet.options.uos) {
        puppetConfig.puppetOptions = {
          uos: config.puppet.options.uos
        };
      }
    }
    
    console.log(`📡 使用 Puppet: ${config.puppet.type}`);
    this.bot = WechatyBuilder.build(puppetConfig);
    
    console.log('✅ 机器人实例创建成功');
  }
  
  async initializeServices() {
    console.log('📦 初始化服务...');
    
    // 初始化豆包服务
    this.doubaoService = new DoubaoService();
    
    // 初始化其他服务
    this.groupService = new GroupService(this.doubaoService);
    this.toolService = new ToolService(this.doubaoService);
    
    // 初始化处理器
    this.messageHandler = new MessageHandler(this.doubaoService, this.groupService, this.toolService);
    this.contactHandler = new ContactHandler(this.doubaoService);
    this.roomHandler = new RoomHandler(this.doubaoService, this.groupService);
    this.schedulerService = new SchedulerService(this.bot, this.doubaoService);
    
    console.log('✅ 服务初始化完成');
    
    // 只在第一次初始化时设置健康检查服务器和事件处理器
    if (!this.healthServer) {
      this.setupHealthServer();
    }
    if (!this.eventsSetup) {
      this.setupEventHandlers();
      this.eventsSetup = true;
    }
  }

  setupHealthServer() {
    this.app = express();
    this.healthPort = process.env.PORT || 3001;
    
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot_status: this.bot ? 'initialized' : 'not_initialized',
        version: require('../package.json').version
      });
    });
    
    // 根路径
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: '微信机器人运行中',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });
    
    // 启动健康检查服务器，使用动态端口避免冲突
    const port = process.env.HEALTH_PORT || 0; // 0表示系统自动分配可用端口
    this.healthServer = this.app.listen(port, () => {
      const actualPort = this.healthServer.address().port;
      logger.info(`健康检查服务器运行在端口 ${actualPort}`);
      console.log(`]: 健康检查服务器运行在端口 ${actualPort}`);
    });
  }

  setupEventHandlers() {
    this.bot
      .on('scan', this.onScan)
      .on('login', this.onLogin.bind(this))
      .on('logout', this.onLogout)
      .on('message', this.onMessage.bind(this))
      .on('friendship', this.onFriendship.bind(this))
      .on('room-join', this.onRoomJoin.bind(this))
      .on('room-leave', this.onRoomLeave.bind(this))
      .on('error', this.onError);
  }

  onScan(qrcode, status) {
    qrTerm.generate(qrcode, { small: true });
    logger.info(`扫描二维码登录: ${status}`);
  }

  async onLogin(user) {
    logger.info(`机器人登录成功: ${user.name()}`);
    await this.schedulerService.start();
  }

  onLogout(user) {
    logger.info(`机器人退出登录: ${user.name()}`);
    this.schedulerService.stop();
  }

  async onMessage(message) {
    try {
      await this.messageHandler.handle(message);
    } catch (error) {
      logger.error('消息处理失败:', error);
    }
  }

  async onFriendship(friendship) {
    try {
      await this.contactHandler.handleFriendship(friendship);
    } catch (error) {
      logger.error('好友请求处理失败:', error);
    }
  }

  async onRoomJoin(room, inviteeList, inviter) {
    try {
      await this.roomHandler.handleJoin(room, inviteeList, inviter);
    } catch (error) {
      logger.error('群成员加入处理失败:', error);
    }
  }

  async onRoomLeave(room, leaverList, remover) {
    try {
      await this.roomHandler.handleLeave(room, leaverList, remover);
    } catch (error) {
      logger.error('群成员离开处理失败:', error);
    }
  }

  onError(error) {
    logger.error('机器人错误:', error);
  }

  async start() {
    try {
      // 初始化服务
      await this.initializeServices();
      
      console.log('🔄 启动微信机器人...');
      await this.bot.start();
      console.log('✅ 微信机器人启动成功');
      logger.info('微信机器人启动成功');
    } catch (error) {
      console.error('❌ 机器人启动失败:', error);
      logger.error('机器人启动失败:', error);
      logger.info('健康检查服务器将继续运行');
      // 不退出进程，让健康检查服务器继续运行
    }
  }

  async stop() {
    try {
      await this.bot.stop();
      this.schedulerService.stop();
      
      // 关闭健康检查服务器
      if (this.healthServer) {
        this.healthServer.close(() => {
          logger.info('健康检查服务器已关闭');
        });
      }
      
      logger.info('微信机器人已停止');
    } catch (error) {
      logger.error('机器人停止失败:', error);
    }
  }
}

// 注意：机器人启动由 start.js 管理，这里不自动启动

module.exports = WechatBot;