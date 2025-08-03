const cron = require('node-cron');
const moment = require('moment');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * 定时任务服务
 */
class SchedulerService {
  constructor(bot, doubaoService) {
    this.bot = bot;
    this.doubaoService = doubaoService;
    this.tasks = new Map();
    this.stats = {
      tasksCreated: 0,
      tasksExecuted: 0,
      tasksFailed: 0
    };
  }

  /**
   * 初始化定时任务
   */
  async initialize() {
    try {
      // 每日问候
      if (config.scheduler.dailyGreeting.enabled) {
        this.createDailyGreeting();
      }
      
      // 天气提醒
      if (config.scheduler.weatherReminder.enabled) {
        this.createWeatherReminder();
      }
      
      // 每日一句
      if (config.scheduler.dailyQuote.enabled) {
        this.createDailyQuote();
      }
      
      // 健康提醒
      if (config.scheduler.healthReminder.enabled) {
        this.createHealthReminder();
      }
      
      // 系统维护
      this.createMaintenanceTasks();
      
      logger.info(`定时任务服务初始化完成，共创建 ${this.tasks.size} 个任务`);
      
    } catch (error) {
      logger.error('定时任务初始化失败:', error);
    }
  }

  /**
   * 创建每日问候任务
   */
  createDailyGreeting() {
    const schedule = config.scheduler.dailyGreeting.schedule;
    const targetRooms = config.scheduler.dailyGreeting.targetRooms;
    
    const task = cron.schedule(schedule, async () => {
      try {
        const greeting = await this.generateDailyGreeting();
        await this.sendToRooms(targetRooms, greeting);
        
        this.stats.tasksExecuted++;
        logger.info('每日问候任务执行完成');
        
      } catch (error) {
        this.stats.tasksFailed++;
        logger.error('每日问候任务执行失败:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('dailyGreeting', task);
    task.start();
    this.stats.tasksCreated++;
  }

  /**
   * 创建天气提醒任务
   */
  createWeatherReminder() {
    const schedule = config.scheduler.weatherReminder.schedule;
    const targetRooms = config.scheduler.weatherReminder.targetRooms;
    
    const task = cron.schedule(schedule, async () => {
      try {
        const weather = await this.generateWeatherReminder();
        await this.sendToRooms(targetRooms, weather);
        
        this.stats.tasksExecuted++;
        logger.info('天气提醒任务执行完成');
        
      } catch (error) {
        this.stats.tasksFailed++;
        logger.error('天气提醒任务执行失败:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('weatherReminder', task);
    task.start();
    this.stats.tasksCreated++;
  }

  /**
   * 创建每日一句任务
   */
  createDailyQuote() {
    const schedule = config.scheduler.dailyQuote.schedule;
    const targetRooms = config.scheduler.dailyQuote.targetRooms;
    
    const task = cron.schedule(schedule, async () => {
      try {
        const quote = await this.generateDailyQuote();
        await this.sendToRooms(targetRooms, quote);
        
        this.stats.tasksExecuted++;
        logger.info('每日一句任务执行完成');
        
      } catch (error) {
        this.stats.tasksFailed++;
        logger.error('每日一句任务执行失败:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('dailyQuote', task);
    task.start();
    this.stats.tasksCreated++;
  }

  /**
   * 创建健康提醒任务
   */
  createHealthReminder() {
    const schedule = config.scheduler.healthReminder.schedule;
    const targetRooms = config.scheduler.healthReminder.targetRooms;
    
    const task = cron.schedule(schedule, async () => {
      try {
        const reminder = await this.generateHealthReminder();
        await this.sendToRooms(targetRooms, reminder);
        
        this.stats.tasksExecuted++;
        logger.info('健康提醒任务执行完成');
        
      } catch (error) {
        this.stats.tasksFailed++;
        logger.error('健康提醒任务执行失败:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    
    this.tasks.set('healthReminder', task);
    task.start();
    this.stats.tasksCreated++;
  }

  /**
   * 创建系统维护任务
   */
  createMaintenanceTasks() {
    // 每日缓存清理
    const cleanupTask = cron.schedule('0 2 * * *', async () => {
      try {
        const cache = require('../utils/cache');
        cache.cleanup();
        
        this.stats.tasksExecuted++;
        logger.info('缓存清理任务执行完成');
        
      } catch (error) {
        this.stats.tasksFailed++;
        logger.error('缓存清理任务执行失败:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('cacheCleanup', cleanupTask);
    cleanupTask.start();
    this.stats.tasksCreated++;
    
    // 每周统计报告
    const statsTask = cron.schedule('0 9 * * 1', async () => {
      try {
        const report = await this.generateWeeklyReport();
        const adminRooms = config.scheduler.adminNotification.targetRooms;
        await this.sendToRooms(adminRooms, report);
        
        this.stats.tasksExecuted++;
        logger.info('周统计报告任务执行完成');
        
      } catch (error) {
        this.stats.tasksFailed++;
        logger.error('周统计报告任务执行失败:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('weeklyStats', statsTask);
    statsTask.start();
    this.stats.tasksCreated++;
  }

  /**
   * 生成每日问候
   */
  async generateDailyGreeting() {
    try {
      const now = moment();
      const dayOfWeek = now.format('dddd');
      const date = now.format('YYYY年MM月DD日');
      
      const prompt = `生成一条温馨的每日问候消息，今天是${date}，${dayOfWeek}。要求积极向上，简洁温暖。`;
      
      const greeting = await this.doubaoService.sendMessage([
        { role: 'user', content: prompt }
      ]);
      
      return `🌅 早安问候\n\n${greeting}\n\n📅 ${date} ${dayOfWeek}`;
      
    } catch (error) {
      logger.error('生成每日问候失败:', error);
      return `🌅 早安！新的一天开始了，愿你今天充满活力！\n\n📅 ${moment().format('YYYY年MM月DD日 dddd')}`;
    }
  }

  /**
   * 生成天气提醒
   */
  async generateWeatherReminder() {
    try {
      const prompt = '生成今日天气提醒，包括温度、天气状况和出行建议，要简洁实用。';
      
      const weather = await this.doubaoService.sendMessage([
        { role: 'user', content: prompt }
      ]);
      
      return `🌤️ 天气提醒\n\n${weather}\n\n💡 记得关注天气变化，合理安排出行`;
      
    } catch (error) {
      logger.error('生成天气提醒失败:', error);
      return `🌤️ 天气提醒\n\n今日天气信息获取失败，请注意关注天气变化，合理安排出行。`;
    }
  }

  /**
   * 生成每日一句
   */
  async generateDailyQuote() {
    try {
      const categories = ['励志', '哲理', '生活', '成长', '智慧'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      const quote = await this.doubaoService.generateCreative('quote', 
        `请提供一句${category}类型的名言警句，包含作者信息。`);
      
      return `💭 每日一句\n\n${quote}\n\n🌟 愿这句话为你的一天带来启发`;
      
    } catch (error) {
      logger.error('生成每日一句失败:', error);
      return `💭 每日一句\n\n"成功不是终点，失败不是末日，继续前进的勇气才最可贵。" - 温斯顿·丘吉尔\n\n🌟 愿这句话为你的一天带来启发`;
    }
  }

  /**
   * 生成健康提醒
   */
  async generateHealthReminder() {
    try {
      const reminders = [
        '记得多喝水，保持身体水分充足',
        '适当休息，避免长时间工作',
        '做做眼保健操，保护视力',
        '站起来活动活动，舒展筋骨',
        '深呼吸几次，放松身心',
        '保持良好坐姿，关爱脊椎健康'
      ];
      
      const reminder = reminders[Math.floor(Math.random() * reminders.length)];
      
      return `💚 健康提醒\n\n${reminder}\n\n🏃‍♂️ 健康是最大的财富，记得关爱自己`;
      
    } catch (error) {
      logger.error('生成健康提醒失败:', error);
      return `💚 健康提醒\n\n记得多喝水，适当休息，保持良好的工作习惯。\n\n🏃‍♂️ 健康是最大的财富，记得关爱自己`;
    }
  }

  /**
   * 生成周统计报告
   */
  async generateWeeklyReport() {
    try {
      const stats = this.getStats();
      const weekStart = moment().startOf('week').format('MM月DD日');
      const weekEnd = moment().endOf('week').format('MM月DD日');
      
      const report = [
        `📊 机器人周报告`,
        ``,
        `📅 统计周期: ${weekStart} - ${weekEnd}`,
        ``,
        `⏰ 定时任务统计:`,
        `  • 创建任务: ${stats.tasksCreated}`,
        `  • 执行成功: ${stats.tasksExecuted}`,
        `  • 执行失败: ${stats.tasksFailed}`,
        `  • 成功率: ${stats.tasksExecuted > 0 ? ((stats.tasksExecuted / (stats.tasksExecuted + stats.tasksFailed)) * 100).toFixed(1) : 0}%`,
        ``,
        `🤖 系统状态: 正常运行`,
        `📈 活跃任务: ${this.getActiveTasks().length}`,
        ``,
        `💡 本周机器人为大家提供了贴心的定时服务`
      ].join('\n');
      
      return report;
      
    } catch (error) {
      logger.error('生成周统计报告失败:', error);
      return `📊 机器人周报告\n\n报告生成失败，请联系管理员检查。`;
    }
  }

  /**
   * 发送消息到指定群组
   */
  async sendToRooms(roomNames, message) {
    if (!roomNames || roomNames.length === 0) return;
    
    try {
      for (const roomName of roomNames) {
        const room = await this.bot.Room.find({ topic: roomName });
        if (room) {
          await room.say(message);
          logger.room(`定时消息发送成功`, roomName);
        } else {
          logger.warn(`未找到群聊: ${roomName}`);
        }
      }
    } catch (error) {
      logger.error('发送定时消息失败:', error);
    }
  }

  /**
   * 创建自定义任务
   */
  createCustomTask(name, schedule, callback) {
    try {
      if (this.tasks.has(name)) {
        throw new Error(`任务 ${name} 已存在`);
      }
      
      const task = cron.schedule(schedule, callback, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });
      
      this.tasks.set(name, task);
      task.start();
      this.stats.tasksCreated++;
      
      logger.info(`自定义任务创建成功: ${name}`);
      return true;
      
    } catch (error) {
      logger.error(`创建自定义任务失败: ${name}`, error);
      return false;
    }
  }

  /**
   * 停止任务
   */
  stopTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      logger.info(`任务已停止: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * 启动任务
   */
  startTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.start();
      logger.info(`任务已启动: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * 删除任务
   */
  deleteTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.destroy();
      this.tasks.delete(name);
      logger.info(`任务已删除: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * 获取活跃任务列表
   */
  getActiveTasks() {
    const activeTasks = [];
    for (const [name, task] of this.tasks) {
      if (task.running) {
        activeTasks.push(name);
      }
    }
    return activeTasks;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 停止所有任务
   */
  stopAll() {
    for (const [name, task] of this.tasks) {
      task.stop();
    }
    logger.info('所有定时任务已停止');
  }

  /**
   * 销毁所有任务
   */
  destroy() {
    for (const [name, task] of this.tasks) {
      task.destroy();
    }
    this.tasks.clear();
    logger.info('定时任务服务已销毁');
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return {
      status: 'healthy',
      stats: this.getStats(),
      activeTasks: this.getActiveTasks(),
      totalTasks: this.tasks.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SchedulerService;