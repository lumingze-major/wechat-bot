const config = require('../config');
const logger = require('../utils/logger');
const DoubaoService = require('./doubaoService');
const cache = require('../utils/cache');
const { Cache } = require('../utils/cache');

class EntertainmentService {
  constructor() {
    this.doubaoService = new DoubaoService();
    this.gameStates = new Map(); // 存储游戏状态
  }

  /**
   * 处理娱乐功能
   */
  async handle(message, command) {
    const contact = message.talker();
    const userId = contact.id;
    
    if (!command) {
      await this.showMenu(message);
      return;
    }

    const [action, ...args] = command.split(' ');
    
    try {
      switch (action.toLowerCase()) {
        case 'quiz':
        case '知识竞赛':
          await this.handleQuiz(message, userId, args.join(' '));
          break;
        case 'story':
        case '故事':
          await this.handleStory(message, args.join(' '));
          break;
        case 'joke':
        case '笑话':
          await this.handleJoke(message);
          break;
        case 'poem':
        case '诗词':
          await this.handlePoem(message, args.join(' '));
          break;
        case 'riddle':
        case '谜语':
          await this.handleRiddle(message, userId, args.join(' '));
          break;
        case 'chain':
        case '接龙':
          await this.handleWordChain(message, userId, args.join(' '));
          break;
        case 'quote':
        case '名言':
          await this.handleQuote(message, args.join(' '));
          break;
        default:
          await this.showMenu(message);
      }
    } catch (error) {
      logger.error('娱乐功能处理失败:', error);
      await message.say('抱歉，功能暂时不可用，请稍后重试。');
    }
  }

  /**
   * 显示娱乐功能菜单
   */
  async showMenu(message) {
    const menu = `🎮 娱乐功能菜单\n\n` +
      `🧠 /游戏 quiz - 知识竞赛\n` +
      `📖 /游戏 story [主题] - 创作故事\n` +
      `😄 /游戏 joke - 随机笑话\n` +
      `🎭 /游戏 poem [主题] - 创作诗词\n` +
      `🤔 /游戏 riddle - 猜谜游戏\n` +
      `🔗 /游戏 chain [词语] - 文字接龙\n` +
      `💭 /游戏 quote [类型] - 励志名言\n\n` +
      `💡 示例：/游戏 story 科幻`;
    
    await message.say(menu);
  }

  /**
   * 处理知识竞赛
   */
  async handleQuiz(message, userId, difficulty = 'medium') {
    const gameState = this.gameStates.get(userId);
    
    if (gameState && gameState.type === 'quiz') {
      // 继续当前游戏
      await this.continueQuiz(message, userId, difficulty);
    } else {
      // 开始新游戏
      await this.startQuiz(message, userId, difficulty);
    }
  }

  /**
   * 开始知识竞赛
   */
  async startQuiz(message, userId, difficulty) {
    const question = await this.generateQuizQuestion(difficulty);
    
    this.gameStates.set(userId, {
      type: 'quiz',
      question,
      score: 0,
      questionCount: 1,
      startTime: Date.now()
    });
    
    const questionText = `🧠 知识竞赛开始！\n\n` +
      `第1题：${question.question}\n\n` +
      question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n') +
      `\n\n回复选项字母（A/B/C/D）或"退出"结束游戏`;
    
    await message.say(questionText);
  }

  /**
   * 继续知识竞赛
   */
  async continueQuiz(message, userId, answer) {
    const gameState = this.gameStates.get(userId);
    if (!gameState) return;
    
    const { question, score, questionCount } = gameState;
    
    if (answer.toLowerCase() === '退出') {
      await this.endQuiz(message, userId);
      return;
    }
    
    // 检查答案
    const isCorrect = answer.toUpperCase() === question.answer;
    let response = isCorrect ? '✅ 回答正确！' : `❌ 回答错误，正确答案是 ${question.answer}`;
    response += `\n${question.explanation}\n\n`;
    
    if (isCorrect) {
      gameState.score += 10;
    }
    
    // 生成下一题
    if (questionCount < 5) {
      const nextQuestion = await this.generateQuizQuestion();
      gameState.question = nextQuestion;
      gameState.questionCount += 1;
      
      response += `第${gameState.questionCount}题：${nextQuestion.question}\n\n` +
        nextQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n') +
        `\n\n当前得分：${gameState.score}`;
    } else {
      response += await this.endQuiz(message, userId, false);
    }
    
    await message.say(response);
  }

  /**
   * 结束知识竞赛
   */
  async endQuiz(message, userId, sendMessage = true) {
    const gameState = this.gameStates.get(userId);
    if (!gameState) return;
    
    const { score, questionCount, startTime } = gameState;
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    this.gameStates.delete(userId);
    
    const result = `🎯 知识竞赛结束！\n\n` +
      `📊 最终得分：${score}/${(questionCount - 1) * 10}\n` +
      `⏱️ 用时：${duration}秒\n` +
      `🏆 ${this.getQuizRank(score)}\n\n` +
      `发送 "/游戏 quiz" 开始新一轮挑战！`;
    
    if (sendMessage) {
      await message.say(result);
    }
    
    return result;
  }

  /**
   * 生成竞赛题目
   */
  async generateQuizQuestion(difficulty = 'medium') {
    const prompt = `请生成一道${difficulty}难度的知识竞赛题目，包含：
1. 题目描述
2. 4个选项（A、B、C、D）
3. 正确答案（A、B、C、D中的一个）
4. 答案解释

请按以下JSON格式返回：
{
  "question": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": "A",
  "explanation": "答案解释"
}`;
    
    const response = await this.doubaoService.sendMessage([
      { role: 'user', content: prompt }
    ]);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('题目解析失败，使用默认题目');
    }
    
    // 默认题目
    return {
      question: "中国的首都是哪里？",
      options: ["北京", "上海", "广州", "深圳"],
      answer: "A",
      explanation: "北京是中华人民共和国的首都和政治中心。"
    };
  }

  /**
   * 获取竞赛等级
   */
  getQuizRank(score) {
    if (score >= 40) return '🥇 知识大师';
    if (score >= 30) return '🥈 博学之士';
    if (score >= 20) return '🥉 学识渊博';
    if (score >= 10) return '📚 好学青年';
    return '🌱 继续努力';
  }

  /**
   * 处理故事创作
   */
  async handleStory(message, theme = '随机') {
    const cacheKey = Cache.generateKey('story', theme);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      return;
    }
    
    const story = await this.doubaoService.generateCreative('story', 
      `请创作一个${theme}主题的有趣故事，长度适中，情节完整。`);
    
    cache.set(cacheKey, story, 1800); // 缓存30分钟
    await message.say(`📖 ${theme}故事\n\n${story}`);
  }

  /**
   * 处理笑话
   */
  async handleJoke(message) {
    const cacheKey = Cache.generateKey('joke', Date.now().toString().slice(0, -4));
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      return;
    }
    
    const joke = await this.doubaoService.generateCreative('joke', '请讲一个健康有趣的笑话');
    
    cache.set(cacheKey, joke, 600); // 缓存10分钟
    await message.say(`😄 ${joke}`);
  }

  /**
   * 处理诗词创作
   */
  async handlePoem(message, theme = '自然') {
    const cacheKey = Cache.generateKey('poem', theme);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      return;
    }
    
    const poem = await this.doubaoService.generateCreative('poem', 
      `请创作一首关于${theme}的诗，要求意境优美，朗朗上口。`);
    
    cache.set(cacheKey, poem, 1800);
    await message.say(`🎭 ${theme}诗词\n\n${poem}`);
  }

  /**
   * 处理谜语
   */
  async handleRiddle(message, userId, answer = '') {
    const gameState = this.gameStates.get(userId);
    
    if (gameState && gameState.type === 'riddle') {
      // 检查答案
      if (answer.toLowerCase() === '提示') {
        await message.say(`💡 提示：${gameState.riddle.hint}`);
        return;
      }
      
      if (answer && answer.includes(gameState.riddle.answer)) {
        await message.say(`🎉 恭喜答对了！答案就是：${gameState.riddle.answer}\n\n发送 "/游戏 riddle" 来挑战新谜语！`);
        this.gameStates.delete(userId);
      } else if (answer) {
        await message.say(`❌ 不对哦，再想想吧！\n发送"提示"获取提示，或发送 "/游戏 riddle" 换一个谜语。`);
      }
    } else {
      // 生成新谜语
      const riddle = await this.generateRiddle();
      
      this.gameStates.set(userId, {
        type: 'riddle',
        riddle,
        startTime: Date.now()
      });
      
      await message.say(`🤔 猜谜时间！\n\n${riddle.question}\n\n请直接回复答案，或发送"提示"获取提示`);
    }
  }

  /**
   * 生成谜语
   */
  async generateRiddle() {
    const prompt = `请生成一个有趣的谜语，包含：
1. 谜面（生动有趣的描述）
2. 谜底（常见事物）
3. 提示（简单提示）

请按以下JSON格式返回：
{
  "question": "谜面内容",
  "answer": "谜底",
  "hint": "提示内容"
}`;
    
    const response = await this.doubaoService.sendMessage([
      { role: 'user', content: prompt }
    ]);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('谜语解析失败，使用默认谜语');
    }
    
    return {
      question: "身穿绿衣裳，肚里水汪汪，生的子儿多，个个黑脸膛。",
      answer: "西瓜",
      hint: "夏天的水果"
    };
  }

  /**
   * 处理文字接龙
   */
  async handleWordChain(message, userId, word = '') {
    const gameState = this.gameStates.get(userId);
    
    if (!gameState || gameState.type !== 'chain') {
      // 开始新游戏
      const startWord = word || await this.generateStartWord();
      
      this.gameStates.set(userId, {
        type: 'chain',
        currentWord: startWord,
        usedWords: [startWord],
        score: 0
      });
      
      await message.say(`🔗 文字接龙开始！\n\n起始词：${startWord}\n\n请接龙（用最后一个字开头的词语）`);
    } else {
      // 继续接龙
      if (!word) {
        await message.say(`请提供接龙词语，当前词语：${gameState.currentWord}`);
        return;
      }
      
      const isValid = await this.validateWordChain(gameState.currentWord, word);
      
      if (isValid) {
        gameState.currentWord = word;
        gameState.usedWords.push(word);
        gameState.score += 1;
        
        const nextWord = await this.generateNextWord(word);
        
        await message.say(`✅ 接龙成功！\n\n你：${word}\n我：${nextWord}\n\n当前得分：${gameState.score}\n请继续接龙！`);
        
        gameState.currentWord = nextWord;
        gameState.usedWords.push(nextWord);
      } else {
        await message.say(`❌ 接龙失败！请用"${gameState.currentWord.slice(-1)}"开头的词语。`);
      }
    }
  }

  /**
   * 验证接龙
   */
  async validateWordChain(currentWord, nextWord) {
    const lastChar = currentWord.slice(-1);
    const firstChar = nextWord.charAt(0);
    return lastChar === firstChar && nextWord.length >= 2;
  }

  /**
   * 生成起始词
   */
  async generateStartWord() {
    const words = ['苹果', '电脑', '音乐', '阳光', '快乐', '友谊', '梦想', '希望'];
    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * 生成下一个词
   */
  async generateNextWord(word) {
    const lastChar = word.slice(-1);
    const prompt = `请提供一个以"${lastChar}"开头的常用词语，只返回词语本身。`;
    
    try {
      const response = await this.doubaoService.sendMessage([
        { role: 'user', content: prompt }
      ]);
      
      const nextWord = response.trim().replace(/[^\u4e00-\u9fa5]/g, '');
      return nextWord || `${lastChar}好`;
    } catch (error) {
      return `${lastChar}好`;
    }
  }

  /**
   * 处理名言
   */
  async handleQuote(message, category = '励志') {
    const cacheKey = Cache.generateKey('quote', category);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      await message.say(cached);
      return;
    }
    
    const quote = await this.doubaoService.generateCreative('quote', 
      `请提供一句${category}类型的名言警句，包含作者信息。`);
    
    cache.set(cacheKey, quote, 1800);
    await message.say(`💭 ${category}名言\n\n${quote}`);
  }
}

module.exports = EntertainmentService;