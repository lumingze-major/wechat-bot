const logger = require('../utils/logger');
const config = require('../config');

/**
 * 群组处理器
 */
class RoomHandler {
  constructor(doubaoService, groupService) {
    this.doubaoService = doubaoService;
    this.groupService = groupService;
    this.stats = {
      roomsJoined: 0,
      roomsLeft: 0,
      invitationsReceived: 0,
      invitationsAccepted: 0
    };
  }

  /**
   * 处理群邀请
   */
  async handleRoomInvite(roomInvitation) {
    try {
      const inviter = roomInvitation.inviter();
      const topic = roomInvitation.topic();
      
      logger.room(`收到群邀请: ${topic}, 邀请人: ${inviter.name()}`);
      this.stats.invitationsReceived++;
      
      // 判断是否接受群邀请
      if (await this.shouldAcceptInvite(inviter, topic)) {
        await roomInvitation.accept();
        this.stats.invitationsAccepted++;
        logger.room(`已接受群邀请: ${topic}`);
        
        // 延迟发送入群消息
        setTimeout(async () => {
          const room = await roomInvitation.room();
          if (room) {
            await this.sendJoinMessage(room);
          }
        }, 3000);
      } else {
        logger.room(`已拒绝群邀请: ${topic}`);
      }
      
    } catch (error) {
      logger.error('处理群邀请失败:', error);
    }
  }

  /**
   * 判断是否应该接受群邀请
   */
  async shouldAcceptInvite(inviter, topic) {
    try {
      // 检查邀请人是否在白名单中
      const whitelist = config.room.inviterWhitelist || [];
      if (whitelist.length > 0) {
        const isWhitelisted = whitelist.includes(inviter.name()) || 
                             whitelist.includes(inviter.id);
        if (!isWhitelisted) {
          return false;
        }
      }
      
      // 检查群名称关键词
      const keywords = config.room.topicKeywords || [];
      if (keywords.length > 0) {
        const hasKeyword = keywords.some(keyword => 
          topic.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }
      
      // 检查群名称黑名单
      const blacklist = config.room.topicBlacklist || [];
      const isBlacklisted = blacklist.some(keyword => 
        topic.toLowerCase().includes(keyword.toLowerCase())
      );
      if (isBlacklisted) {
        return false;
      }
      
      return config.room.autoAcceptInvite;
      
    } catch (error) {
      logger.error('判断群邀请失败:', error);
      return false;
    }
  }

  /**
   * 发送入群消息
   */
  async sendJoinMessage(room) {
    try {
      const topic = await room.topic();
      
      let joinMessage;
      
      if (config.room.customJoinMessage) {
        joinMessage = config.room.customJoinMessage.replace('{topic}', topic);
      } else {
        // 使用AI生成入群消息
        const prompt = `为加入群聊"${topic}"生成一条简洁友好的自我介绍消息。`;
        
        try {
          joinMessage = await this.doubaoService.sendMessage([
            { role: 'user', content: prompt }
          ]);
        } catch (error) {
          joinMessage = `🤖 大家好！我是智能助手，很高兴加入这个群聊。有什么需要帮助的可以随时找我哦~`;
        }
      }
      
      await room.say(joinMessage);
      
      // 发送功能介绍（如果启用）
      if (config.room.sendIntroduction) {
        setTimeout(async () => {
          const introduction = await this.generateRoomIntroduction();
          await room.say(introduction);
        }, 5000);
      }
      
      logger.room(`已发送入群消息`, topic);
      
    } catch (error) {
      logger.error('发送入群消息失败:', error);
    }
  }

  /**
   * 生成群聊功能介绍
   */
  async generateRoomIntroduction() {
    const features = [];
    
    if (config.features.chat) features.push('💬 智能对话 - 直接@我聊天');
    if (config.features.knowledge) features.push('📚 知识问答 - /问 你的问题');
    if (config.features.entertainment) features.push('🎮 娱乐游戏 - /游戏 查看可用游戏');
    if (config.features.tools) features.push('🔧 实用工具 - /工具 查看可用工具');
    if (config.features.groupManagement) features.push('👥 群管理 - /群设置 查看管理功能');
    
    const introduction = [
      `🤖 功能介绍`,
      ``,
      `我可以为群聊提供以下服务:`,
      ``,
      ...features,
      ``,
      `💡 发送 "/帮助" 查看详细命令列表`,
      `🔇 如需关闭某些功能，管理员可使用群设置命令`
    ].join('\n');
    
    return introduction;
  }

  /**
   * 处理加入群聊事件
   */
  async handleRoomJoin(room, inviteeList, inviter) {
    try {
      const topic = await room.topic();
      logger.room(`机器人加入群聊: ${topic}`);
      this.stats.roomsJoined++;
      
      // 如果是机器人自己加入，发送入群消息
      const bot = room.wechaty;
      const self = bot.userSelf();
      
      if (inviteeList.some(contact => contact.id === self.id)) {
        await this.sendJoinMessage(room);
      }
      
      // 委托给群管理服务处理其他成员加入
      if (this.groupService) {
        await this.groupService.handleMemberJoin(room, inviteeList, inviter);
      }
      
    } catch (error) {
      logger.error('处理群聊加入事件失败:', error);
    }
  }

  /**
   * 处理离开群聊事件
   */
  async handleRoomLeave(room, leaverList, remover) {
    try {
      const topic = await room.topic();
      logger.room(`群聊成员变动: ${topic}`);
      
      // 检查是否是机器人被移除
      const bot = room.wechaty;
      const self = bot.userSelf();
      
      if (leaverList.some(contact => contact.id === self.id)) {
        logger.room(`机器人被移出群聊: ${topic}`);
        this.stats.roomsLeft++;
        
        // 清理该群的相关数据
        if (this.groupService) {
          this.groupService.groupSettings.delete(room.id);
        }
      } else {
        // 委托给群管理服务处理其他成员离开
        if (this.groupService) {
          await this.groupService.handleMemberLeave(room, leaverList, remover);
        }
      }
      
    } catch (error) {
      logger.error('处理群聊离开事件失败:', error);
    }
  }

  /**
   * 处理群话题变更
   */
  async handleRoomTopicChange(room, newTopic, oldTopic, changer) {
    try {
      logger.room(`群名称变更: ${oldTopic} -> ${newTopic}, 修改人: ${changer.name()}`);
      
      // 可以在这里添加群名称变更的处理逻辑
      // 比如通知、记录等
      
    } catch (error) {
      logger.error('处理群话题变更失败:', error);
    }
  }

  /**
   * 获取群聊列表
   */
  async getRoomList(bot) {
    try {
      const rooms = await bot.Room.findAll();
      
      const roomList = [];
      for (const room of rooms) {
        try {
          const topic = await room.topic();
          const memberList = await room.memberAll();
          const owner = await room.owner();
          
          roomList.push({
            id: room.id,
            topic: topic,
            memberCount: memberList.length,
            owner: owner ? owner.name() : '未知'
          });
        } catch (error) {
          // 跳过无法获取信息的群聊
          continue;
        }
      }
      
      return roomList;
      
    } catch (error) {
      logger.error('获取群聊列表失败:', error);
      return [];
    }
  }

  /**
   * 搜索群聊
   */
  async searchRoom(bot, query) {
    try {
      const rooms = await this.getRoomList(bot);
      
      return rooms.filter(room => 
        room.topic.includes(query)
      );
      
    } catch (error) {
      logger.error('搜索群聊失败:', error);
      return [];
    }
  }

  /**
   * 批量发送群消息
   */
  async broadcastToRooms(bot, message, targetList = []) {
    try {
      let targets;
      
      if (targetList.length > 0) {
        // 发送给指定群聊
        targets = [];
        for (const target of targetList) {
          const room = await bot.Room.find({ topic: target });
          if (room) {
            targets.push(room);
          }
        }
      } else {
        // 发送给所有群聊
        targets = await bot.Room.findAll();
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const room of targets) {
        try {
          const topic = await room.topic();
          await room.say(message);
          successCount++;
          
          logger.room(`批量消息发送成功`, topic);
          
          // 添加延迟避免发送过快
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          failCount++;
          logger.error(`发送群消息失败:`, error);
        }
      }
      
      logger.info(`批量群消息发送完成: 成功 ${successCount}, 失败 ${failCount}`);
      
      return {
        total: targets.length,
        success: successCount,
        failed: failCount
      };
      
    } catch (error) {
      logger.error('批量发送群消息失败:', error);
      return { total: 0, success: 0, failed: 0 };
    }
  }

  /**
   * 主动退出群聊
   */
  async leaveRoom(bot, roomTopic, reason = '') {
    try {
      const room = await bot.Room.find({ topic: roomTopic });
      if (!room) {
        return { success: false, message: '未找到指定群聊' };
      }
      
      // 发送退群消息（如果有原因）
      if (reason) {
        await room.say(`🤖 机器人即将退出群聊\n原因: ${reason}\n感谢大家的使用！`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await room.quit();
      this.stats.roomsLeft++;
      
      logger.room(`主动退出群聊: ${roomTopic}`);
      
      return { success: true, message: '已成功退出群聊' };
      
    } catch (error) {
      logger.error('退出群聊失败:', error);
      return { success: false, message: '退出群聊失败' };
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
      roomsJoined: 0,
      roomsLeft: 0,
      invitationsReceived: 0,
      invitationsAccepted: 0
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

module.exports = RoomHandler;