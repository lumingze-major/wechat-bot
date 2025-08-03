const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { Cache } = require('../utils/cache');

class DoubaoService {
  constructor() {
    this.apiKey = config.doubao.apiKey;
    this.baseUrl = config.doubao.baseUrl;
    this.model = config.doubao.model;
    this.visionModel = config.doubao.visionModel;
    this.videoModel = config.doubao.videoModel;
    this.maxTokens = config.doubao.maxTokens;
    this.temperature = config.doubao.temperature;
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
  }

  /**
   * 发送消息到豆包
   */
  async sendMessage(messages, options = {}) {
    try {
      const {
        model = this.model,
        maxTokens = this.maxTokens,
        temperature = this.temperature,
        useCache = true,
        thinking = null // 新增thinking参数控制
      } = options;
      
      // 生成缓存键
      const cacheKey = Cache.generateKey('doubao', JSON.stringify(messages), model, thinking);
      
      // 检查缓存
      if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
          logger.api('豆包', '使用缓存响应');
          return cached;
        }
      }
      
      // 构建请求参数
      const requestParams = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      };
      
      // 添加thinking参数（如果提供）
      if (thinking !== null) {
        requestParams.thinking = thinking;
      }
      
      const response = await this.client.chat.completions.create(requestParams);
      
      const result = response.choices[0].message.content;
      
      // 缓存结果
      if (useCache) {
        cache.set(cacheKey, result, 3600); // 缓存1小时
      }
      
      logger.api('豆包', `响应长度: ${result.length}`);
      return result;
      
    } catch (error) {
      const errorDetails = error.error || error.message;
      logger.error('豆包服务调用失败:', errorDetails);
      console.error('详细错误信息:', {
        status: error.status,
        message: error.message,
        error: error.error
      });
      throw new Error(`豆包服务调用失败: ${JSON.stringify(errorDetails)}`);
    }
  }

  /**
   * 智能判断是否需要深度思考
   */
  shouldUseDeepThinking(message) {
    const text = message.trim();
    
    // 简单问候和日常对话，不需要深度思考
    const simplePatterns = [
      /^(你好|hi|hello|嗨|早上好|晚上好|再见|拜拜)$/i,
      /^(谢谢|感谢|不客气|没关系)$/i,
      /^(是的|好的|不是|没有|可以|不可以)$/i,
      /^(哈哈|呵呵|笑死|好笑)$/i,
      /^(今天|明天|昨天).*(天气|怎么样)$/i,  // 简单天气询问
      /^.*(天气|怎么样)$/i  // 简单的怎么样问题
    ];
    
    // 检查是否为简单对话
    if (simplePatterns.some(pattern => pattern.test(text))) {
      return false;
    }
    
    // 复杂问题关键词，需要深度思考
    const complexKeywords = [
      '分析', '比较', '评价', '解释', '原理', '机制', '算法',
      '策略', '方案', '设计', '架构', '优化', '问题解决',
      '为什么', '如何', '区别', '联系', '影响', '后果', 
      '建议', '推荐', '选择', '判断', '请分析', '请比较',
      '请解释', '请评价'
    ];
    
    // 知识问答关键词
    const knowledgeKeywords = [
      '什么是', '什么叫', '是什么', '介绍一下', '告诉我',
      '什么意思', '定义', '概念'
    ];
    
    // 检查是否包含复杂关键词
    if (complexKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }
    
    // 检查是否包含知识问答关键词
    if (knowledgeKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }
    
    // 根据消息长度判断（提高阈值）
    if (text.length > 30) {
      return true;
    }
    
    // 默认不使用深度思考（提高响应速度）
    return false;
  }

  /**
   * 智能对话
   */
  async chat(userMessage, context = [], options = {}) {
    const messages = [
      {
        role: 'system',
        content: '你是一个友善、有趣、博学的微信机器人助手。请用简洁、自然的语言回复用户，保持对话的连贯性和趣味性。'
      },
      ...context,
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    // 智能判断是否需要深度思考
    const needsDeepThinking = this.shouldUseDeepThinking(userMessage);
    
    // 设置thinking参数
    const finalOptions = {
      ...options,
      thinking: needsDeepThinking ? { type: "enabled" } : { type: "disabled" }
    };
    
    logger.info(`智能判断: ${needsDeepThinking ? '启用' : '禁用'}深度思考模式`);
    
    return await this.sendMessage(messages, finalOptions);
  }

  /**
   * 知识问答
   */
  async askKnowledge(question, context = '', options = {}) {
    const messages = [
      {
        role: 'system',
        content: '你是一个知识渊博的助手，请准确、详细地回答用户的问题。如果不确定答案，请诚实说明。'
      },
      {
        role: 'user',
        content: context ? `背景信息：${context}\n\n问题：${question}` : question
      }
    ];
    
    // 智能判断是否需要深度思考
    const needsDeepThinking = this.shouldUseDeepThinking(question);
    
    // 设置thinking参数
    const finalOptions = {
      ...options,
      thinking: needsDeepThinking ? { type: "enabled" } : { type: "disabled" }
    };
    
    logger.info(`知识问答智能判断: ${needsDeepThinking ? '启用' : '禁用'}深度思考模式`);
    
    return await this.sendMessage(messages, finalOptions);
  }

  /**
   * 图像识别和理解
   */
  async analyzeImage(imageUrl, question = '请描述这张图片的内容', context = [], options = {}) {
    try {
      let processedImageUrl = imageUrl;
      
      // 如果是本地文件路径，转换为base64
      if (imageUrl.startsWith('file://')) {
        const fs = require('fs');
        const path = require('path');
        const filePath = imageUrl.replace('file://', '');
        
        if (fs.existsSync(filePath)) {
          const imageBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          let mimeType = 'image/jpeg';
          
          if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.webp') mimeType = 'image/webp';
          
          processedImageUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          logger.info(`已将本地图片转换为base64格式: ${filePath}`);
        } else {
          throw new Error(`本地图片文件不存在: ${filePath}`);
        }
      }
      
      const messages = [
        {
          role: 'system',
          content: '你是一个专业的图像识别助手。请仔细观察图片，提供准确、详细的描述和分析。'
        },
        ...context,
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: processedImageUrl
              }
            },
            {
              type: 'text',
              text: question
            }
          ]
        }
      ];
      
      // 图像识别通常需要深度思考
      const finalOptions = {
        ...options,
        model: this.visionModel,
        thinking: { type: "enabled" }
      };
      
      logger.info('开始图像识别分析');
      return await this.sendMessage(messages, finalOptions);
      
    } catch (error) {
      logger.error('图像识别失败:', error.message);
      throw new Error(`图像识别失败: ${error.message}`);
    }
  }

  /**
   * 视频识别和理解
   */
  async analyzeVideo(videoUrl, question = '请描述这个视频的内容', context = [], options = {}) {
    try {
      let processedVideoUrl = videoUrl;
      
      // 如果是本地文件路径，转换为base64
      if (videoUrl.startsWith('file://')) {
        const fs = require('fs');
        const path = require('path');
        const filePath = videoUrl.replace('file://', '');
        
        if (fs.existsSync(filePath)) {
          const videoBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          let mimeType = 'video/mp4';
          
          if (ext === '.avi') mimeType = 'video/avi';
          else if (ext === '.mov') mimeType = 'video/quicktime';
          else if (ext === '.wmv') mimeType = 'video/x-ms-wmv';
          else if (ext === '.flv') mimeType = 'video/x-flv';
          
          processedVideoUrl = `data:${mimeType};base64,${videoBuffer.toString('base64')}`;
          logger.info(`已将本地视频转换为base64格式: ${filePath}`);
        } else {
          throw new Error(`本地视频文件不存在: ${filePath}`);
        }
      }
      
      const messages = [
        {
          role: 'system',
          content: '你是一个专业的视频识别助手。请仔细观察视频，提供准确、详细的描述和分析。'
        },
        ...context,
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: processedVideoUrl
              }
            },
            {
              type: 'text',
              text: question
            }
          ]
        }
      ];
      
      // 视频识别通常需要深度思考
      const finalOptions = {
        ...options,
        model: this.videoModel,
        thinking: { type: "enabled" }
      };
      
      logger.info('开始视频识别分析');
      return await this.sendMessage(messages, finalOptions);
      
    } catch (error) {
      logger.error('视频识别失败:', error.message);
      throw new Error(`视频识别失败: ${error.message}`);
    }
  }

  /**
   * 创意生成
   */
  async generateCreative(type, prompt, options = {}) {
    const prompts = {
      story: '请创作一个有趣的故事',
      poem: '请创作一首诗',
      joke: '请讲一个幽默的笑话',
      riddle: '请出一个谜语',
      quote: '请生成一句励志名言'
    };
    
    const systemPrompt = prompts[type] || '请根据用户要求进行创作';
    
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}。要求简洁有趣，适合微信聊天场景。`
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    return await this.sendMessage(messages, options);
  }

  /**
   * 文本总结
   */
  async summarize(text, maxLength = 200) {
    const messages = [
      {
        role: 'system',
        content: `请将以下内容总结为不超过${maxLength}字的简洁摘要。`
      },
      {
        role: 'user',
        content: text
      }
    ];
    
    return await this.sendMessage(messages);
  }

  /**
   * 情感分析
   */
  async analyzeSentiment(text) {
    const messages = [
      {
        role: 'system',
        content: '请分析以下文本的情感倾向，返回：积极、消极或中性，并简要说明原因。'
      },
      {
        role: 'user',
        content: text
      }
    ];
    
    return await this.sendMessage(messages);
  }

  /**
   * 翻译文本
   */
  async translate(text, targetLang = '中文') {
    const messages = [
      {
        role: 'system',
        content: `请将以下内容翻译为${targetLang}，保持原意和语调。`
      },
      {
        role: 'user',
        content: text
      }
    ];
    
    return await this.sendMessage(messages);
  }

  /**
   * 代码解释
   */
  async explainCode(code, language = '') {
    const messages = [
      {
        role: 'system',
        content: '请解释以下代码的功能和逻辑，用简洁易懂的语言说明。'
      },
      {
        role: 'user',
        content: language ? `语言：${language}\n\n代码：\n${code}` : code
      }
    ];
    
    return await this.sendMessage(messages);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.sendMessage([
        { role: 'user', content: 'ping' }
      ], { useCache: false });
      
      return {
        status: 'healthy',
        response: response.substring(0, 50)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = DoubaoService;