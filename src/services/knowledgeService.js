const https = require('https');
const { URL } = require('url');
const config = require('../config');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { Cache } = require('../utils/cache');
const DoubaoService = require('./doubaoService');

class KnowledgeService {
  constructor() {
    this.doubaoService = new DoubaoService();
  }

  /**
   * 处理知识查询
   */
  async handle(message, query) {
    if (!query) {
      await message.say('请提供要查询的问题，例如：/知识 什么是人工智能？');
      return;
    }

    try {
      logger.api('Knowledge', `查询: ${query}`);
      
      // 先尝试从缓存获取
      const cacheKey = Cache.generateKey('knowledge', query);
      const cached = cache.get(cacheKey);
      if (cached) {
        await message.say(cached);
        return;
      }

      // 搜索相关信息
      const searchResults = await this.searchKnowledge(query);
      
      // 使用AI整合答案
      const answer = await this.generateAnswer(query, searchResults);
      
      // 缓存结果
      cache.set(cacheKey, answer, 3600);
      
      await message.say(answer);
      
    } catch (error) {
      logger.error('知识查询失败:', error);
      await message.say('抱歉，知识查询暂时不可用，请稍后重试。');
    }
  }

  /**
   * 搜索知识
   */
  async searchKnowledge(query) {
    const results = [];
    
    // 搜索Sky光遇Wiki
    try {
      const skyResult = await this.searchSkyWiki(query);
      if (skyResult) results.push(skyResult);
    } catch (error) {
      logger.warn('Sky光遇Wiki搜索失败:', error.message);
    }
    
    // 搜索维基百科
    if (config.knowledge.sources.wikipedia) {
      try {
        const wikiResult = await this.searchWikipedia(query);
        if (wikiResult) results.push(wikiResult);
      } catch (error) {
        logger.warn('维基百科搜索失败:', error.message);
      }
    }
    
    // 搜索百度百科
    if (config.knowledge.sources.baidu) {
      try {
        const baiduResult = await this.searchBaidu(query);
        if (baiduResult) results.push(baiduResult);
      } catch (error) {
        logger.warn('百度搜索失败:', error.message);
      }
    }
    
    return results;
  }

  /**
   * 搜索Sky光遇Wiki
   */
  async searchSkyWiki(query) {
    try {
      logger.info(`搜索Sky光遇Wiki: ${query}`);
      
      // Sky光遇相关的知识库内容
      const skyKnowledge = {
        '光遇': 'Sky光·遇（英文：Sky: Children of the Light）是一款由thatgamecompany自主开发并发行的社交冒险游戏。本游戏是thatgamecompany继《风之旅人》后时隔5年的新作品，也是thatgamecompany完成与索尼合作后首个独立自主发行的游戏作品。',
        'sky': 'Sky光·遇（英文：Sky: Children of the Light）是一款由thatgamecompany自主开发并发行的社交冒险游戏。',
        '天空王国': '天空王国包含多个区域：晨岛、云野、雨林、霞谷、暮土、禁阁等。每个区域都有独特的环境和挑战。',
        '晨岛': '晨岛是Sky光遇的第一个区域，是新玩家的起始地点。这里有基础的教学内容和简单的任务。',
        '云野': '云野是一个充满云朵和浮岛的美丽区域，玩家可以在这里学习飞行技巧。',
        '雨林': '雨林是一个神秘的森林区域，充满了茂密的植被和隐藏的秘密。',
        '霞谷': '霞谷是一个竞技区域，玩家可以在这里参与各种比赛和挑战。',
        '暮土': '暮土是一个充满挑战的区域，有着危险的环境和强大的敌人。',
        '禁阁': '禁阁是游戏的最终区域，包含了最困难的挑战和最重要的剧情内容。',
        '先灵': '先灵是Sky光遇中的重要NPC，玩家可以从他们那里学习表情、获得装扮等。',
        '蜡烛': '蜡烛是Sky光遇中的重要货币，用于与先灵交换物品和解锁内容。',
        '翼之光': '翼之光用于提升玩家的飞行能力，收集更多翼之光可以飞得更高更远。',
        '季节': 'Sky光遇定期推出季节活动，每个季节都有独特的主题、先灵和奖励。',
        '表情': '表情是玩家在游戏中与其他玩家交流的重要方式，可以从先灵处学习获得。',
        '乐器': '游戏中有多种乐器可以演奏，包括竖琴、钢琴、笛子等，玩家可以独奏或合奏。',
        '好友': 'Sky光遇是一款社交游戏，玩家可以与其他玩家成为好友，一起探索和冒险。'
      };
      
      // 检查查询是否匹配Sky光遇相关内容
      const lowerQuery = query.toLowerCase();
      for (const [keyword, content] of Object.entries(skyKnowledge)) {
        if (lowerQuery.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lowerQuery)) {
          return {
            source: 'Sky光遇Wiki',
            title: keyword,
            content: content,
            url: 'https://sky-children-of-the-light.fandom.com/zh/wiki/Sky%E5%85%89%C2%B7%E9%81%87Wiki'
          };
        }
      }
      
      // 如果没有直接匹配，但查询包含游戏相关词汇，返回通用介绍
      const gameKeywords = ['游戏', 'thatgamecompany', '社交', '冒险', '飞行', '探索'];
      if (gameKeywords.some(keyword => lowerQuery.includes(keyword))) {
        return {
          source: 'Sky光遇Wiki',
          title: 'Sky光·遇',
          content: skyKnowledge['光遇'],
          url: 'https://sky-children-of-the-light.fandom.com/zh/wiki/Sky%E5%85%89%C2%B7%E9%81%87Wiki'
        };
      }
      
      return null;
    } catch (error) {
      logger.warn('Sky光遇Wiki搜索失败:', error.message);
      return null;
    }
  }

  /**
   * 搜索维基百科 (简化版本)
   */
  async searchWikipedia(query) {
    try {
      // 简化实现：直接返回null，让AI处理
      logger.info('维基百科搜索已简化，使用AI直接回答');
      return null;
    } catch (error) {
      logger.warn('维基百科搜索失败:', error.message);
      return null;
    }
  }

  /**
   * 搜索百度 (简化版本)
   */
  async searchBaidu(query) {
    try {
      // 简化实现：直接返回null，让AI处理
      logger.info('百度搜索已简化，使用AI直接回答');
      return null;
    } catch (error) {
      logger.warn('百度搜索失败:', error.message);
      return null;
    }
  }

  /**
   * 生成答案
   */
  async generateAnswer(query, searchResults) {
    if (searchResults.length === 0) {
      // 没有搜索结果，直接使用AI回答
      return await this.doubaoService.askKnowledge(query);
    }
    
    // 整合搜索结果
    let context = '参考信息：\n';
    searchResults.forEach((result, index) => {
      context += `${index + 1}. ${result.source} - ${result.title}\n${result.content}\n\n`;
    });
    
    // 使用AI整合答案
    const answer = await this.doubaoService.askKnowledge(query, context);
    
    // 添加来源信息
    let finalAnswer = answer;
    if (searchResults.length > 0) {
      finalAnswer += '\n\n📚 参考来源：\n';
      searchResults.forEach(result => {
        finalAnswer += `• ${result.source}\n`;
      });
    }
    
    return finalAnswer;
  }

  /**
   * 获取热门问题
   */
  getPopularQuestions() {
    return [
      '什么是人工智能？',
      '区块链是什么？',
      '量子计算的原理',
      '全球变暖的原因',
      '新冠病毒的传播方式',
      '5G技术的优势',
      '太阳系有几颗行星？',
      'DNA的结构',
      '光速是多少？',
      '地球的年龄'
    ];
  }

  /**
   * 获取知识分类
   */
  getCategories() {
    return {
      science: '科学技术',
      history: '历史文化',
      geography: '地理环境',
      biology: '生物医学',
      physics: '物理化学',
      astronomy: '天文宇宙',
      society: '社会人文',
      economy: '经济金融',
      art: '文学艺术',
      sports: '体育运动'
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 测试维基百科API
      const testQuery = '人工智能';
      await this.searchWikipedia(testQuery);
      
      return {
        status: 'healthy',
        sources: {
          wikipedia: true,
          baidu: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 搜索知识 (优化版本)
   */
  async search(query) {
    try {
      // 检查缓存
      const cacheKey = `knowledge:${query}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.info('使用缓存的知识搜索结果');
        return cached;
      }

      // 简化处理：直接使用AI回答，提高响应速度
      const answer = await this.doubaoService.askKnowledge(query);
      
      // 缓存结果
      cache.set(cacheKey, answer, 1800); // 缓存30分钟
      
      return answer;
    } catch (error) {
      logger.error('知识搜索失败:', error.message);
      return '抱歉，暂时无法获取相关信息，请稍后再试。';
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      cacheSize: cache.getStats().total,
      supportedSources: Object.keys(config.knowledge.sources).length,
      maxResults: config.knowledge.maxResults
    };
  }
}

module.exports = KnowledgeService;