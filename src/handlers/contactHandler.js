const logger = require('../utils/logger');
const config = require('../config');

/**
 * 联系人处理器
 */
class ContactHandler {
  constructor(doubaoService) {
    this.doubaoService = doubaoService;
    this.stats = {
      friendRequests: 0,
      friendsAdded: 0,
      friendsRemoved: 0
    };
  }

  /**
   * 处理好友请求
   */
  async handleFriendRequest(friendship) {
    try {
      const contact = friendship.contact();
      const hello = friendship.hello();
      
      logger.user(`收到好友请求: ${contact.name()}, 验证消息: ${hello}`);
      this.stats.friendRequests++;
      
      // 自动接受好友请求的条件检查
      if (await this.shouldAcceptFriend(contact, hello)) {
        await friendship.accept();
        
        // 发送欢迎消息
        setTimeout(async () => {
          await this.sendWelcomeMessage(contact);
        }, 2000);
        
        this.stats.friendsAdded++;
        logger.user(`已接受好友请求: ${contact.name()}`);
      } else {
        logger.user(`已拒绝好友请求: ${contact.name()}`);
      }
      
    } catch (error) {
      logger.error('处理好友请求失败:', error);
    }
  }

  /**
   * 判断是否应该接受好友请求
   */
  async shouldAcceptFriend(contact, hello) {
    try {
      // 检查是否在黑名单中
      const blacklist = config.contact.blacklist || [];
      if (blacklist.includes(contact.name()) || blacklist.includes(contact.id)) {
        return false;
      }
      
      // 检查验证消息关键词
      const keywords = config.contact.acceptKeywords || [];
      if (keywords.length > 0) {
        const hasKeyword = keywords.some(keyword => 
          hello.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }
      
      // 使用AI分析验证消息
      if (config.contact.aiVerification) {
        const isValid = await this.doubaoService.analyzeFriendRequest(hello);
        if (!isValid) {
          return false;
        }
      }
      
      return config.contact.autoAccept;
      
    } catch (error) {
      logger.error('判断好友请求失败:', error);
      return false;
    }
  }

  /**
   * 发送欢迎消息
   */
  async sendWelcomeMessage(contact) {
    try {
      let welcomeMessage;
      
      if (config.contact.customWelcome) {
        welcomeMessage = config.contact.customWelcome.replace('{name}', contact.name());
      } else {
        // 使用AI生成个性化欢迎消息
        const prompt = `为新添加的好友"${contact.name()}"生成一条友好的欢迎消息，要温馨自然。`;
        
        try {
          welcomeMessage = await this.doubaoService.sendMessage([
            { role: 'user', content: prompt }
          ]);
        } catch (error) {
          welcomeMessage = `🎉 欢迎 ${contact.name()}！很高兴认识你，有什么需要帮助的随时找我哦~`;
        }
      }
      
      await contact.say(welcomeMessage);
      
      // 发送功能介绍（如果启用）
      if (config.contact.sendIntroduction) {
        setTimeout(async () => {
          const introduction = await this.generateIntroduction();
          await contact.say(introduction);
        }, 3000);
      }
      
      logger.user(`已发送欢迎消息给: ${contact.name()}`);
      
    } catch (error) {
      logger.error('发送欢迎消息失败:', error);
    }
  }

  /**
   * 生成功能介绍
   */
  async generateIntroduction() {
    const features = [];
    
    if (config.features.chat) features.push('💬 智能对话');
    if (config.features.knowledge) features.push('📚 知识问答');
    if (config.features.entertainment) features.push('🎮 娱乐游戏');
    if (config.features.tools) features.push('🔧 实用工具');
    
    const introduction = [
      `🤖 功能介绍`,
      ``,
      `我是一个智能微信机器人，可以为你提供以下服务:`,
      ``,
      ...features.map(f => `• ${f}`),
      ``,
      `💡 发送 "/帮助" 查看详细命令列表`,
      `🎯 直接和我聊天即可开始对话`
    ].join('\n');
    
    return introduction;
  }

  /**
   * 处理好友删除
   */
  async handleFriendRemove(contact) {
    try {
      logger.user(`好友已删除: ${contact.name()}`);
      this.stats.friendsRemoved++;
      
      // 可以在这里添加一些清理逻辑
      // 比如清除该用户的缓存数据等
      
    } catch (error) {
      logger.error('处理好友删除失败:', error);
    }
  }

  /**
   * 获取好友列表
   */
  async getFriendList(bot) {
    try {
      const contacts = await bot.Contact.findAll();
      const friends = contacts.filter(contact => 
        contact.friend() && !contact.self()
      );
      
      return friends.map(friend => ({
        id: friend.id,
        name: friend.name(),
        alias: friend.alias(),
        gender: friend.gender(),
        province: friend.province(),
        city: friend.city()
      }));
      
    } catch (error) {
      logger.error('获取好友列表失败:', error);
      return [];
    }
  }

  /**
   * 搜索好友
   */
  async searchFriend(bot, query) {
    try {
      const friends = await this.getFriendList(bot);
      
      return friends.filter(friend => 
        friend.name.includes(query) || 
        (friend.alias && friend.alias.includes(query))
      );
      
    } catch (error) {
      logger.error('搜索好友失败:', error);
      return [];
    }
  }

  /**
   * 批量发送消息
   */
  async broadcastMessage(bot, message, targetList = []) {
    try {
      let targets;
      
      if (targetList.length > 0) {
        // 发送给指定好友
        targets = [];
        for (const target of targetList) {
          const contact = await bot.Contact.find({ name: target }) || 
                         await bot.Contact.find({ alias: target });
          if (contact) {
            targets.push(contact);
          }
        }
      } else {
        // 发送给所有好友
        const contacts = await bot.Contact.findAll();
        targets = contacts.filter(contact => 
          contact.friend() && !contact.self()
        );
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const contact of targets) {
        try {
          await contact.say(message);
          successCount++;
          
          // 添加延迟避免发送过快
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failCount++;
          logger.error(`发送消息给 ${contact.name()} 失败:`, error);
        }
      }
      
      logger.info(`批量消息发送完成: 成功 ${successCount}, 失败 ${failCount}`);
      
      return {
        total: targets.length,
        success: successCount,
        failed: failCount
      };
      
    } catch (error) {
      logger.error('批量发送消息失败:', error);
      return { total: 0, success: 0, failed: 0 };
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      friendRequests: 0,
      friendsAdded: 0,
      friendsRemoved: 0
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return {
      status: 'healthy',
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ContactHandler;