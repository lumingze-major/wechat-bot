const axios = require('axios');
const moment = require('moment');
const cache = require('../utils/cache');
const { Cache } = require('../utils/cache');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * 工具服务
 */
class ToolService {
  constructor(doubaoService) {
    this.doubaoService = doubaoService;
    this.stats = {
      weatherQueries: 0,
      translations: 0,
      calculations: 0,
      timeQueries: 0
    };
  }

  /**
   * 处理工具命令
   */
  async handleCommand(command, args, message) {
    try {
      switch (command) {
        case '天气':
          return await this.handleWeather(message, args[0]);
        case '翻译':
          return await this.handleTranslation(message, args.join(' '));
        case '计算':
          return await this.handleCalculation(message, args.join(' '));
        case '时间':
          return await this.handleTime(message, args[0]);
        case '汇率':
          return await this.handleExchangeRate(message, args[0], args[1]);
        case '短链':
          return await this.handleShortUrl(message, args[0]);
        case '二维码':
          return await this.handleQRCode(message, args.join(' '));
        default:
          await message.say('❓ 未知的工具命令');
      }
    } catch (error) {
      logger.error('工具服务错误:', error);
      await message.say('❌ 工具服务暂时不可用');
    }
  }

  /**
   * 处理天气查询
   */
  async handleWeather(message, city = '北京') {
    const cacheKey = Cache.generateKey('weather', city);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      this.stats.weatherQueries++;
      return;
    }

    try {
      // 使用AI生成模拟天气信息（实际项目中应接入真实天气API）
      const prompt = `请生成${city}的当前天气信息，包括温度、天气状况、湿度、风力等，格式要简洁清晰。`;
      
      const weatherInfo = await this.doubaoService.sendMessage([
        { role: 'user', content: prompt }
      ]);

      const response = `🌤️ ${city}天气\n\n${weatherInfo}\n\n📅 查询时间: ${moment().format('YYYY-MM-DD HH:mm')}`;
      
      cache.set(cacheKey, response, 1800); // 缓存30分钟
      await message.say(response);
      this.stats.weatherQueries++;
      
    } catch (error) {
      logger.error('天气查询失败:', error);
      await message.say('❌ 天气查询失败，请稍后重试');
    }
  }

  /**
   * 处理翻译
   */
  async handleTranslation(message, text) {
    if (!text) {
      await message.say('❓ 请提供要翻译的文本\n例如: /翻译 Hello World');
      return;
    }

    const cacheKey = Cache.generateKey('translation', text);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      this.stats.translations++;
      return;
    }

    try {
      const translation = await this.doubaoService.translateText(text);
      const response = `🌐 翻译结果\n\n原文: ${text}\n译文: ${translation}`;
      
      cache.set(cacheKey, response, 3600); // 缓存1小时
      await message.say(response);
      this.stats.translations++;
      
    } catch (error) {
      logger.error('翻译失败:', error);
      await message.say('❌ 翻译失败，请稍后重试');
    }
  }

  /**
   * 处理计算
   */
  async handleCalculation(message, expression) {
    if (!expression) {
      await message.say('❓ 请提供要计算的表达式\n例如: /计算 2+3*4');
      return;
    }

    try {
      // 安全的数学表达式计算
      const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
      
      if (!safeExpression) {
        await message.say('❌ 无效的数学表达式');
        return;
      }

      // 使用AI进行计算和解释
      const prompt = `请计算数学表达式: ${safeExpression}，并简要解释计算过程。`;
      
      const result = await this.doubaoService.sendMessage([
        { role: 'user', content: prompt }
      ]);

      await message.say(`🧮 计算结果\n\n表达式: ${expression}\n${result}`);
      this.stats.calculations++;
      
    } catch (error) {
      logger.error('计算失败:', error);
      await message.say('❌ 计算失败，请检查表达式格式');
    }
  }

  /**
   * 处理时间查询
   */
  async handleTime(message, timezone = 'Asia/Shanghai') {
    try {
      const now = moment();
      const timeInfo = [
        `🕐 当前时间`,
        ``,
        `📅 日期: ${now.format('YYYY年MM月DD日')}`,
        `⏰ 时间: ${now.format('HH:mm:ss')}`,
        `📆 星期: ${now.format('dddd')}`,
        `🌍 时区: ${timezone}`,
        ``,
        `📊 今年第${now.dayOfYear()}天`,
        `📈 本年进度: ${(now.dayOfYear() / 365 * 100).toFixed(1)}%`
      ].join('\n');

      await message.say(timeInfo);
      this.stats.timeQueries++;
      
    } catch (error) {
      logger.error('时间查询失败:', error);
      await message.say('❌ 时间查询失败');
    }
  }

  /**
   * 处理汇率查询
   */
  async handleExchangeRate(message, from = 'USD', to = 'CNY') {
    const cacheKey = Cache.generateKey('exchange', `${from}_${to}`);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      return;
    }

    try {
      // 使用AI生成模拟汇率信息（实际项目中应接入真实汇率API）
      const prompt = `请提供${from}到${to}的当前汇率信息，包括汇率数值和简要分析。`;
      
      const rateInfo = await this.doubaoService.sendMessage([
        { role: 'user', content: prompt }
      ]);

      const response = `💱 汇率查询\n\n${from} → ${to}\n\n${rateInfo}\n\n📅 查询时间: ${moment().format('YYYY-MM-DD HH:mm')}`;
      
      cache.set(cacheKey, response, 1800); // 缓存30分钟
      await message.say(response);
      
    } catch (error) {
      logger.error('汇率查询失败:', error);
      await message.say('❌ 汇率查询失败，请稍后重试');
    }
  }

  /**
   * 处理短链生成
   */
  async handleShortUrl(message, url) {
    if (!url) {
      await message.say('❓ 请提供要缩短的URL\n例如: /短链 https://www.example.com');
      return;
    }

    try {
      // 简单的URL验证
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(url)) {
        await message.say('❌ 请提供有效的URL（需要包含http://或https://）');
        return;
      }

      // 生成简单的短链（实际项目中应使用专业的短链服务）
      const shortId = Math.random().toString(36).substr(2, 8);
      const shortUrl = `https://short.ly/${shortId}`;
      
      const response = [
        `🔗 短链生成成功`,
        ``,
        `原链接: ${url}`,
        `短链接: ${shortUrl}`,
        ``,
        `💡 注意: 这是演示短链，实际使用请接入专业服务`
      ].join('\n');

      await message.say(response);
      
    } catch (error) {
      logger.error('短链生成失败:', error);
      await message.say('❌ 短链生成失败');
    }
  }

  /**
   * 处理二维码生成
   */
  async handleQRCode(message, text) {
    if (!text) {
      await message.say('❓ 请提供要生成二维码的内容\n例如: /二维码 Hello World');
      return;
    }

    try {
      // 生成二维码URL（使用在线服务）
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
      
      const response = [
        `📱 二维码生成成功`,
        ``,
        `内容: ${text}`,
        `二维码: ${qrUrl}`,
        ``,
        `💡 扫描上方链接查看二维码`
      ].join('\n');

      await message.say(response);
      
    } catch (error) {
      logger.error('二维码生成失败:', error);
      await message.say('❌ 二维码生成失败');
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      totalQueries: Object.values(this.stats).reduce((a, b) => a + b, 0)
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

module.exports = ToolService;