const config = require('../config');
const logger = require('../utils/logger');
const DoubaoService = require('../services/doubaoService');
const KnowledgeService = require('../services/knowledgeService');
const EntertainmentService = require('../services/entertainmentService');
const ToolService = require('../services/toolService');
const GroupService = require('../services/groupService');

class MessageHandler {
  constructor(doubaoService, groupService, toolService) {
    this.doubaoService = doubaoService || new DoubaoService();
    this.knowledgeService = new KnowledgeService();
    this.entertainmentService = new EntertainmentService();
    this.toolService = toolService || new ToolService(this.doubaoService);
    this.groupService = groupService || new GroupService(this.doubaoService);
    
    // 用户会话上下文
    this.userContexts = new Map();
    
    // 一起聊功能状态
    this.groupChatEnabled = false;
    this.groupChatContext = []; // 共享上下文
    this.groupChatMessageCount = 0; // 消息计数器
    this.groupChatRooms = new Set(); // 启用一起聊的群聊
  }

  /**
   * 处理消息
   */
  async handle(message) {
    return this.handleMessage(message);
  }

  /**
   * 处理消息的主要逻辑（支持并发处理）
   */
  async handleMessage(message) {
    // 忽略自己发送的消息
    if (message.self()) return;
    
    const contact = message.talker();
    const room = message.room();
    const messageType = message.type();
    const isRoom = !!room;
    const userId = contact.id;
    
    // 群聊中的文本消息需要@机器人或包含关键词才响应
    // 但图片和视频消息在群聊中也会被处理
    if (isRoom && messageType === message.constructor.Type.Text && !this.shouldRespondInRoom(message)) {
      return;
    }
    
    // 记录消息处理开始
    const messageId = `${userId}_${Date.now()}`;
    logger.info(`开始处理消息 [${messageId}] 来自用户: ${contact.name()}`);
    
    // 异步处理消息，不阻塞其他消息
    this.processMessageAsync(message, messageId).catch(error => {
      logger.error(`消息处理异常 [${messageId}]:`, error);
    });
  }
  
  /**
   * 异步处理单个消息
   */
  async processMessageAsync(message, messageId) {
    const contact = message.talker();
    const messageType = message.type();
    
    try {
      // 根据消息类型处理
      switch (messageType) {
        case message.constructor.Type.Text:
          await this.handleTextMessage(message);
          break;
        case message.constructor.Type.Image:
          await this.handleImageMessage(message);
          break;
        case message.constructor.Type.Video:
          await this.handleVideoMessage(message);
          break;

        default:
          // 其他类型消息暂不处理
          logger.info(`收到未处理的消息类型: ${messageType}`);
          break;
      }
      
      logger.info(`消息处理完成 [${messageId}]`);
      
    } catch (error) {
      logger.error(`消息处理失败 [${messageId}]:`, error);
      await this.sendReply(message, '抱歉，处理消息时出现了错误，请稍后重试。');
    }
  }

  /**
   * 处理文本消息
   */
  async handleTextMessage(message) {
    const contact = message.talker();
    const room = message.room();
    const text = message.text().trim();
    const isRoom = !!room;
    
    // 记录消息
    if (isRoom) {
      logger.room(await room.topic(), `${contact.name()}: ${text}`);
    } else {
      logger.user(contact.name(), text);
    }
    
    // 解析命令
    const command = this.parseCommand(text);
    
    if (command) {
      await this.handleCommand(message, command);
    } else {
      await this.handleNormalMessage(message);
    }
  }

  /**
   * 处理图片消息
   */
  async handleImageMessage(message) {
    const contact = message.talker();
    const room = message.room();
    const isRoom = !!room;
    
    // 记录消息
    if (isRoom) {
      logger.room(await room.topic(), `${contact.name()}: [图片]`);
    } else {
      logger.user(contact.name(), '[图片]');
    }
    
    try {
      // 获取图片文件
      const fileBox = await message.toFileBox();
      
      // 保存图片到临时目录
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(process.cwd(), 'data', 'temp');
      
      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}_${fileBox.name}`;
      const filePath = path.join(tempDir, fileName);
      
      // 保存文件
      await fileBox.toFile(filePath);
      
      // 创建可访问的URL（这里需要根据实际部署环境调整）
      // 简单起见，我们使用本地文件路径，实际应用中可能需要上传到云存储
      const imageUrl = `file://${filePath}`;
      
      // 使用豆包进行图像识别
      const response = await this.doubaoService.analyzeImage(
        imageUrl,
        '请详细描述这张图片的内容，包括主要物体、场景、颜色、情感等信息。'
      );
      
      // 发送回复（支持@用户）
      await this.sendReply(message, `🖼️ 图片识别结果：\n\n${response}`);
      
      // 清理临时文件
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 60000); // 1分钟后删除
      
    } catch (error) {
      logger.error('图片处理失败:', error);
      await this.sendReply(message, '抱歉，图片识别功能暂时不可用，请稍后重试。');
    }
  }

  /**
   * 处理视频消息
   */
  async handleVideoMessage(message) {
    const contact = message.talker();
    const room = message.room();
    const isRoom = !!room;
    
    // 记录消息
    if (isRoom) {
      logger.room(await room.topic(), `${contact.name()}: [视频]`);
    } else {
      logger.user(contact.name(), '[视频]');
    }
    
    try {
      // 获取视频文件
      const fileBox = await message.toFileBox();
      
      // 保存视频到临时目录
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(process.cwd(), 'data', 'temp');
      
      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}_${fileBox.name}`;
      const filePath = path.join(tempDir, fileName);
      
      // 保存文件
      await fileBox.toFile(filePath);
      
      // 创建可访问的URL
      const videoUrl = `file://${filePath}`;
      
      // 使用豆包进行视频识别
      const response = await this.doubaoService.analyzeVideo(
        videoUrl,
        '请详细描述这个视频的内容，包括主要场景、动作、人物、情感等信息。'
      );
      
      // 发送回复（支持@用户）
      await this.sendReply(message, `🎬 视频识别结果：\n\n${response}`);
      
      // 清理临时文件
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 300000); // 5分钟后删除（视频文件较大）
      
    } catch (error) {
      logger.error('视频处理失败:', error);
      await this.sendReply(message, '抱歉，视频识别功能暂时不可用，请稍后重试。');
    }
  }

  /**
   * 判断是否应该在群聊中响应
   */
  shouldRespondInRoom(message) {
    const text = message.text();
    const mentionSelf = message.mentionSelf();
    
    // 被@了
    if (mentionSelf) return true;
    
    // 包含机器人名称
    if (text.includes(config.bot.name)) return true;
    
    // 以命令前缀开头
    if (text.startsWith(config.commands.prefix)) return true;
    
    // 包含帮助关键词
    const helpKeywords = config.commands.help;
    if (helpKeywords.some(keyword => text.includes(keyword))) return true;
    
    return false;
  }

  /**
   * 解析命令
   */
  parseCommand(text) {
    // 移除@和机器人名称
    let cleanText = text.replace(/@\S+\s*/g, '').replace(config.bot.name, '').trim();
    
    // 检查是否以命令前缀开头
    if (!cleanText.startsWith(config.commands.prefix)) {
      return null;
    }
    
    // 移除前缀
    cleanText = cleanText.substring(config.commands.prefix.length);
    
    // 分割命令和参数
    const parts = cleanText.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return { command, args, original: cleanText };
  }

  /**
   * 处理命令
   */
  async handleCommand(message, { command, args, original }) {
    const { help, knowledge, game, tool, admin, clear, groupChat, stopGroupChat } = config.commands;
    
    // 帮助命令
    if (help.includes(command)) {
      await this.handleHelp(message);
      return;
    }
    
    // 清除上下文命令
    if (clear.includes(command)) {
      await this.handleClearContext(message);
      return;
    }
    
    // 一起聊命令
    if (groupChat.includes(command)) {
      await this.handleGroupChatStart(message);
      return;
    }
    
    // 停止一起聊命令
    if (stopGroupChat.includes(command)) {
      await this.handleGroupChatStop(message);
      return;
    }
    
    // 知识命令
    if (knowledge.includes(command) && config.features.knowledge) {
      await this.knowledgeService.handle(message, args.join(' '));
      return;
    }
    
    // 游戏命令
    if (game.includes(command) && config.features.entertainment) {
      await this.entertainmentService.handle(message, args.join(' '));
      return;
    }
    
    // 工具命令
    if (tool.includes(command) && config.features.tools) {
      await this.toolService.handle(message, args.join(' '));
      return;
    }
    
    // 管理命令
    if (admin.includes(command)) {
      await this.groupService.handleCommand(message, args.join(' '));
      return;
    }
    
    // 未知命令
    await this.sendReply(message, `未知命令：${command}\n发送 "${config.commands.prefix}help" 查看可用命令`);
  }

  /**
   * 处理普通消息
   */
  async handleNormalMessage(message) {
    const contact = message.talker();
    const room = message.room();
    const text = message.text();
    const userId = contact.id;
    const isRoom = !!room;
    const roomId = isRoom ? room.id : null;
    
    // 检查是否启用了一起聊功能（只检查当前群聊是否启用）
    if (isRoom && this.groupChatRooms.has(roomId)) {
      await this.handleGroupChatMessage(message);
      return;
    }
    
    // 获取用户上下文
    const context = this.getUserContext(userId);
    
    // 使用AI进行对话
    const response = await this.doubaoService.chat(text, context);
    
    // 更新用户上下文
    this.updateUserContext(userId, [
      { role: 'user', content: text },
      { role: 'assistant', content: response }
    ]);
    
    // 发送回复（支持@用户）
    await this.sendReply(message, response);
  }

  /**
   * 处理帮助命令
   */
  async handleHelp(message) {
    const helpText = this.generateHelpText();
    await this.sendReply(message, helpText);
  }

  /**
   * 处理清除上下文命令
   */
  async handleClearContext(message) {
    const contact = message.talker();
    const userId = contact.id;
    
    // 清除用户上下文
    this.clearUserContext(userId);
    
    // 记录日志
    logger.info(`用户 ${contact.name()} (${userId}) 清除了对话上下文`);
    
    // 回复确认消息
    await this.sendReply(message, '✅ 对话上下文已清除，我们可以开始全新的对话了！');
  }

  /**
   * 处理开启一起聊命令
   */
  async handleGroupChatStart(message) {
    const contact = message.talker();
    const room = message.room();
    const isRoom = !!room;
    
    if (!isRoom) {
      await this.sendReply(message, '❌ 一起聊功能只能在群聊中使用！');
      return;
    }
    
    const roomId = room.id;
    const roomName = await room.topic();
    
    // 启用一起聊功能
    this.groupChatEnabled = true;
    this.groupChatRooms.add(roomId);
    this.groupChatContext = [];
    this.groupChatMessageCount = 0;
    
    // 记录日志
    logger.info(`用户 ${contact.name()} 在群聊 "${roomName}" 中开启了一起聊功能`);
    
    // 回复确认消息
    await message.say('🎉 一起聊功能已开启！\n\n现在所有用户的聊天都会作为共享上下文，我会每隔3条消息主动参与讨论。\n\n发送 "/停止一起聊" 可以关闭此功能。');
  }

  /**
   * 处理关闭一起聊命令
   */
  async handleGroupChatStop(message) {
    const contact = message.talker();
    const room = message.room();
    const isRoom = !!room;
    
    if (!isRoom) {
      await this.sendReply(message, '❌ 一起聊功能只能在群聊中使用！');
      return;
    }
    
    const roomId = room.id;
    const roomName = await room.topic();
    
    // 关闭一起聊功能
    this.groupChatRooms.delete(roomId);
    
    // 如果没有群聊启用一起聊功能，则完全关闭
    if (this.groupChatRooms.size === 0) {
      this.groupChatEnabled = false;
      this.groupChatContext = [];
      this.groupChatMessageCount = 0;
    }
    
    // 记录日志
    logger.info(`用户 ${contact.name()} 在群聊 "${roomName}" 中关闭了一起聊功能`);
    
    // 回复确认消息
    await message.say('✅ 一起聊功能已关闭，回复正常模式。');
  }

  /**
   * 处理一起聊模式下的消息
   */
  async handleGroupChatMessage(message) {
    const contact = message.talker();
    const room = message.room();
    const text = message.text();
    const userName = contact.name();
    
    // 添加消息到共享上下文
    this.groupChatContext.push({
      role: 'user',
      content: `${userName}: ${text}`
    });
    
    // 限制上下文长度
    if (this.groupChatContext.length > config.groupChat.maxContextLength) {
      this.groupChatContext = this.groupChatContext.slice(-config.groupChat.maxContextLength);
    }
    
    // 增加消息计数
    this.groupChatMessageCount++;
    
    // 记录日志
    logger.room(await room.topic(), `一起聊模式 - ${userName}: ${text}`);
    
    // 每隔指定条数消息，机器人主动发言
    if (this.groupChatMessageCount >= config.groupChat.messageInterval) {
      await this.generateGroupChatResponse(message);
      this.groupChatMessageCount = 0; // 重置计数器
    }
  }

  /**
   * 生成一起聊模式下的回复
   */
  async generateGroupChatResponse(message) {
    const room = message.room();
    
    try {
      // 构建提示词
      const systemPrompt = {
        role: 'system',
        content: '你是一个群聊助手，正在参与群聊讨论。请根据最近的聊天内容，自然地参与对话。你的回复应该：1. 与话题相关且有价值 2. 语气轻松友好 3. 不要太长，保持简洁 4. 可以提问、分享观点或给出建议。不需要@任何人。'
      };
      
      const messages = [systemPrompt, ...this.groupChatContext];
      
      // 使用AI生成回复
      const response = await this.doubaoService.chat('', messages);
      
      // 发送回复（不@任何人）
      await message.say(response);
      
      // 将机器人的回复也加入上下文
      this.groupChatContext.push({
        role: 'assistant',
        content: response
      });
      
      // 记录日志
      logger.room(await room.topic(), `一起聊模式 - 机器人主动发言: ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`);
      
    } catch (error) {
      logger.error('一起聊模式生成回复失败:', error);
    }
  }

  /**
   * 生成帮助文本
   */
  generateHelpText() {
    const prefix = config.commands.prefix;
    let help = `🤖 ${config.bot.name} 使用指南\n\n`;
    
    help += `📝 基础命令：\n`;
    help += `${prefix}help - 显示此帮助信息\n`;
    help += `${prefix}clear - 清除对话上下文\n`;
    help += `${prefix}重置 - 清除对话上下文\n\n`;
    
    if (config.features.knowledge) {
      help += `🧠 知识功能：\n`;
      help += `${prefix}知识 [问题] - 知识问答\n`;
      help += `${prefix}k [问题] - 知识问答（简写）\n\n`;
    }
    
    if (config.features.entertainment) {
      help += `🎮 娱乐功能：\n`;
      help += `${prefix}游戏 - 查看可用游戏\n`;
      help += `${prefix}g - 游戏功能（简写）\n\n`;
    }
    
    if (config.features.tools) {
      help += `🔧 实用工具：\n`;
      help += `${prefix}工具 - 查看可用工具\n`;
      help += `${prefix}t - 工具功能（简写）\n\n`;
    }
    
    help += `🎉 一起聊功能（仅群聊）：\n`;
    help += `${prefix}一起聊 - 开启群聊共享上下文模式\n`;
    help += `${prefix}停止一起聊 - 关闭一起聊功能\n\n`;
    
    help += `💬 直接对话：\n`;
    help += `直接发送消息即可与我对话\n`;
    help += `群聊中@我或包含我的名字即可\n\n`;
    
    help += `🔄 上下文管理：\n`;
    help += `机器人会记住最近10轮对话\n`;
    help += `使用清除命令可重新开始对话\n`;
    help += `一起聊模式下所有用户共享上下文\n\n`;
    
    help += `❓ 如有问题，请联系管理员`;
    
    return help;
  }

  /**
   * 获取用户上下文
   */
  getUserContext(userId) {
    return this.userContexts.get(userId) || [];
  }

  /**
   * 更新用户上下文
   */
  updateUserContext(userId, newMessages) {
    const context = this.getUserContext(userId);
    context.push(...newMessages);
    
    // 限制上下文长度
    const maxContextLength = 10;
    if (context.length > maxContextLength) {
      context.splice(0, context.length - maxContextLength);
    }
    
    this.userContexts.set(userId, context);
  }

  /**
   * 清除用户上下文
   */
  clearUserContext(userId) {
    this.userContexts.delete(userId);
  }

  /**
   * 发送回复（支持@用户和并发处理）
   */
  async sendReply(message, content) {
    const contact = message.talker();
    const room = message.room();
    const isRoom = !!room;
    
    try {
      if (isRoom) {
        // 群聊中@用户回复
        const atMessage = `@${contact.name()} ${content}`;
        await message.say(atMessage, contact);
        
        // 记录群聊回复日志
        logger.room(await room.topic(), `机器人回复 @${contact.name()}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      } else {
        // 私聊直接回复
        await message.say(content);
        
        // 记录私聊回复日志
        logger.user(`回复给 ${contact.name()}`, content.substring(0, 50) + (content.length > 50 ? '...' : ''));
      }
    } catch (error) {
      logger.error('发送回复失败:', error);
      // 如果@回复失败，尝试普通回复
      try {
        await message.say(content);
      } catch (fallbackError) {
        logger.error('普通回复也失败:', fallbackError);
        throw fallbackError;
      }
    }
  }



  /**
   * 获取统计信息
   */
  getStats() {
    return {
      activeUsers: this.userContexts.size,
      totalContexts: Array.from(this.userContexts.values())
        .reduce((sum, context) => sum + context.messages.length, 0)
    };
  }
}

module.exports = MessageHandler;