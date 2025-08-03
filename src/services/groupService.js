const moment = require('moment');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * 群管理服务
 */
class GroupService {
  constructor(doubaoService) {
    this.doubaoService = doubaoService;
    this.groupSettings = new Map();
    this.userWarnings = new Map();
    this.stats = {
      messagesProcessed: 0,
      warningsIssued: 0,
      usersKicked: 0,
      welcomesSent: 0
    };
  }

  /**
   * 处理群管理命令
   */
  async handleCommand(command, args, message, room) {
    if (!room) {
      await message.say('❌ 此命令只能在群聊中使用');
      return;
    }

    const contact = message.talker();
    const isAdmin = await this.isAdmin(contact, room);

    try {
      switch (command) {
        case '群设置':
          return await this.handleGroupSettings(message, room, args, isAdmin);
        case '踢人':
          return await this.handleKick(message, room, args, isAdmin);
        case '禁言':
          return await this.handleMute(message, room, args, isAdmin);
        case '警告':
          return await this.handleWarning(message, room, args, isAdmin);
        case '群信息':
          return await this.handleGroupInfo(message, room);
        case '成员列表':
          return await this.handleMemberList(message, room);
        case '群统计':
          return await this.handleGroupStats(message, room);
        default:
          await message.say('❓ 未知的群管理命令');
      }
    } catch (error) {
      logger.error('群管理服务错误:', error);
      await message.say('❌ 群管理服务暂时不可用');
    }
  }

  /**
   * 处理新成员加入
   */
  async handleMemberJoin(room, inviteeList, inviter) {
    try {
      const roomTopic = await room.topic();
      const settings = this.getGroupSettings(room.id);
      
      if (!settings.welcomeEnabled) return;

      for (const contact of inviteeList) {
        const name = contact.name();
        
        let welcomeMessage;
        if (settings.customWelcome) {
          welcomeMessage = settings.customWelcome.replace('{name}', name);
        } else {
          // 使用AI生成个性化欢迎消息
          const prompt = `为新加入群聊"${roomTopic}"的成员"${name}"生成一条温馨的欢迎消息，要简洁友好。`;
          
          try {
            welcomeMessage = await this.doubaoService.sendMessage([
              { role: 'user', content: prompt }
            ]);
          } catch (error) {
            welcomeMessage = `🎉 欢迎 @${name} 加入群聊！`;
          }
        }

        await room.say(welcomeMessage, contact);
        this.stats.welcomesSent++;
        
        // 发送群规则（如果启用）
        if (settings.rulesEnabled && settings.groupRules) {
          setTimeout(async () => {
            await room.say(`📋 群规则\n\n${settings.groupRules}`, contact);
          }, 2000);
        }
      }
      
      logger.room(`新成员加入: ${inviteeList.map(c => c.name()).join(', ')}`, roomTopic);
      
    } catch (error) {
      logger.error('处理新成员加入失败:', error);
    }
  }

  /**
   * 处理成员离开
   */
  async handleMemberLeave(room, leaverList, remover) {
    try {
      const roomTopic = await room.topic();
      const settings = this.getGroupSettings(room.id);
      
      if (!settings.farewellEnabled) return;

      for (const contact of leaverList) {
        const name = contact.name();
        
        let farewellMessage;
        if (settings.customFarewell) {
          farewellMessage = settings.customFarewell.replace('{name}', name);
        } else {
          farewellMessage = `👋 ${name} 离开了群聊`;
        }

        await room.say(farewellMessage);
      }
      
      logger.room(`成员离开: ${leaverList.map(c => c.name()).join(', ')}`, roomTopic);
      
    } catch (error) {
      logger.error('处理成员离开失败:', error);
    }
  }

  /**
   * 消息内容检查
   */
  async checkMessage(message, room) {
    try {
      const settings = this.getGroupSettings(room.id);
      if (!settings.contentFilterEnabled) return true;

      const text = message.text();
      const contact = message.talker();
      
      // 检查违禁词
      if (settings.bannedWords && settings.bannedWords.length > 0) {
        const hasBannedWord = settings.bannedWords.some(word => 
          text.toLowerCase().includes(word.toLowerCase())
        );
        
        if (hasBannedWord) {
          await this.issueWarning(contact, room, '使用违禁词汇');
          return false;
        }
      }
      
      // 检查链接（如果禁止）
      if (settings.blockLinks) {
        const hasLink = /https?:\/\/[^\s]+/.test(text);
        if (hasLink) {
          await this.issueWarning(contact, room, '发送链接');
          return false;
        }
      }
      
      // 使用AI检查内容是否合适
      if (settings.aiContentCheck) {
        const isAppropriate = await this.doubaoService.checkContent(text);
        if (!isAppropriate) {
          await this.issueWarning(contact, room, '内容不当');
          return false;
        }
      }
      
      this.stats.messagesProcessed++;
      return true;
      
    } catch (error) {
      logger.error('消息检查失败:', error);
      return true; // 出错时允许消息通过
    }
  }

  /**
   * 发出警告
   */
  async issueWarning(contact, room, reason) {
    try {
      const userId = contact.id;
      const roomId = room.id;
      const warningKey = `${roomId}_${userId}`;
      
      let warnings = this.userWarnings.get(warningKey) || 0;
      warnings++;
      this.userWarnings.set(warningKey, warnings);
      
      const settings = this.getGroupSettings(roomId);
      const maxWarnings = settings.maxWarnings || 3;
      
      if (warnings >= maxWarnings) {
        // 达到警告上限，踢出群聊
        try {
          await room.del(contact);
          await room.say(`⚠️ @${contact.name()} 因多次违规已被移出群聊`);
          this.userWarnings.delete(warningKey);
          this.stats.usersKicked++;
        } catch (error) {
          await room.say(`⚠️ 无法踢出 @${contact.name()}，请管理员手动处理`);
        }
      } else {
        const remainingWarnings = maxWarnings - warnings;
        await room.say(
          `⚠️ @${contact.name()} 警告: ${reason}\n` +
          `当前警告次数: ${warnings}/${maxWarnings}\n` +
          `剩余机会: ${remainingWarnings}次`,
          contact
        );
      }
      
      this.stats.warningsIssued++;
      logger.room(`警告用户: ${contact.name()}, 原因: ${reason}`, await room.topic());
      
    } catch (error) {
      logger.error('发出警告失败:', error);
    }
  }

  /**
   * 处理群设置
   */
  async handleGroupSettings(message, room, args, isAdmin) {
    if (!isAdmin) {
      await message.say('❌ 只有管理员可以修改群设置');
      return;
    }

    const settings = this.getGroupSettings(room.id);
    
    if (args.length === 0) {
      // 显示当前设置
      const settingsText = [
        `⚙️ 群设置`,
        ``,
        `🎉 欢迎消息: ${settings.welcomeEnabled ? '开启' : '关闭'}`,
        `👋 离别消息: ${settings.farewellEnabled ? '开启' : '关闭'}`,
        `🛡️ 内容过滤: ${settings.contentFilterEnabled ? '开启' : '关闭'}`,
        `🔗 禁止链接: ${settings.blockLinks ? '是' : '否'}`,
        `🤖 AI内容检查: ${settings.aiContentCheck ? '开启' : '关闭'}`,
        `⚠️ 最大警告次数: ${settings.maxWarnings}`,
        `📋 群规则: ${settings.rulesEnabled ? '已设置' : '未设置'}`
      ].join('\n');
      
      await message.say(settingsText);
      return;
    }

    // 修改设置
    const [setting, value] = args;
    
    switch (setting) {
      case '欢迎':
        settings.welcomeEnabled = value === '开启';
        break;
      case '离别':
        settings.farewellEnabled = value === '开启';
        break;
      case '过滤':
        settings.contentFilterEnabled = value === '开启';
        break;
      case '链接':
        settings.blockLinks = value === '禁止';
        break;
      case 'AI检查':
        settings.aiContentCheck = value === '开启';
        break;
      case '警告次数':
        settings.maxWarnings = parseInt(value) || 3;
        break;
      default:
        await message.say('❓ 未知的设置项');
        return;
    }
    
    this.groupSettings.set(room.id, settings);
    await message.say(`✅ 设置已更新: ${setting} = ${value}`);
  }

  /**
   * 处理踢人
   */
  async handleKick(message, room, args, isAdmin) {
    if (!isAdmin) {
      await message.say('❌ 只有管理员可以踢人');
      return;
    }

    if (args.length === 0) {
      await message.say('❓ 请指定要踢出的用户\n例如: /踢人 @用户名');
      return;
    }

    // 这里需要根据实际情况实现用户查找和踢出逻辑
    await message.say('⚠️ 踢人功能需要根据具体平台API实现');
  }

  /**
   * 处理群信息
   */
  async handleGroupInfo(message, room) {
    try {
      const topic = await room.topic();
      const memberList = await room.memberAll();
      const owner = await room.owner();
      
      const info = [
        `📊 群信息`,
        ``,
        `📝 群名称: ${topic}`,
        `👥 成员数量: ${memberList.length}`,
        `👑 群主: ${owner ? owner.name() : '未知'}`,
        `📅 查询时间: ${moment().format('YYYY-MM-DD HH:mm')}`
      ].join('\n');
      
      await message.say(info);
      
    } catch (error) {
      logger.error('获取群信息失败:', error);
      await message.say('❌ 获取群信息失败');
    }
  }

  /**
   * 处理群统计
   */
  async handleGroupStats(message, room) {
    const stats = [
      `📈 群管理统计`,
      ``,
      `💬 处理消息: ${this.stats.messagesProcessed}`,
      `⚠️ 发出警告: ${this.stats.warningsIssued}`,
      `🚫 踢出用户: ${this.stats.usersKicked}`,
      `🎉 欢迎消息: ${this.stats.welcomesSent}`,
      `📅 统计时间: ${moment().format('YYYY-MM-DD HH:mm')}`
    ].join('\n');
    
    await message.say(stats);
  }

  /**
   * 检查是否为管理员
   */
  async isAdmin(contact, room) {
    try {
      // 检查是否为群主
      const owner = await room.owner();
      if (owner && owner.id === contact.id) {
        return true;
      }
      
      // 检查是否在配置的管理员列表中
      const adminList = config.groupManagement.adminList || [];
      return adminList.includes(contact.id) || adminList.includes(contact.name());
      
    } catch (error) {
      logger.error('检查管理员权限失败:', error);
      return false;
    }
  }

  /**
   * 获取群设置
   */
  getGroupSettings(roomId) {
    if (!this.groupSettings.has(roomId)) {
      this.groupSettings.set(roomId, {
        welcomeEnabled: true,
        farewellEnabled: true,
        contentFilterEnabled: true,
        blockLinks: false,
        aiContentCheck: false,
        maxWarnings: 3,
        rulesEnabled: false,
        customWelcome: null,
        customFarewell: null,
        groupRules: null,
        bannedWords: []
      });
    }
    return this.groupSettings.get(roomId);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return {
      status: 'healthy',
      stats: this.getStats(),
      groupCount: this.groupSettings.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GroupService;