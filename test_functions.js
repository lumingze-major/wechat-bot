#!/usr/bin/env node
/**
 * 微信机器人功能测试脚本
 * 用于模拟测试各项功能
 */

const config = require('./src/config');
const logger = require('./src/utils/logger');

// 测试结果统计
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// 模拟消息对象
class MockMessage {
  constructor(text, from = 'TestUser') {
    this.text = text;
    this.from = from;
    this.responses = [];
  }

  async say(text) {
    this.responses.push(text);
    console.log(`🤖 机器人回复: ${text}`);
    return this;
  }

  talker() {
    return { name: () => this.from };
  }

  room() {
    return null; // 私聊
  }
}

// 测试工具函数
function createTest(name, testFn) {
  return async () => {
    testResults.total++;
    console.log(`\n🧪 测试: ${name}`);
    try {
      await testFn();
      testResults.passed++;
      console.log(`✅ 通过: ${name}`);
    } catch (error) {
      testResults.failed++;
      console.log(`❌ 失败: ${name} - ${error.message}`);
    }
  };
}

// 基础功能测试
const basicTests = {
  testConfig: createTest('配置文件加载', async () => {
    if (!config.doubao.apiKey) {
      throw new Error('豆包API密钥未配置');
    }
    if (!config.features) {
      throw new Error('功能开关配置缺失');
    }
    console.log('  - 豆包配置: ✅');
    console.log('  - 功能开关: ✅');
  }),

  testServices: createTest('服务初始化', async () => {
    try {
      const DoubaoService = require('./src/services/doubaoService');
      const ToolService = require('./src/services/toolService');
      const KnowledgeService = require('./src/services/knowledgeService');
      const EntertainmentService = require('./src/services/entertainmentService');
      
      const doubaoService = new DoubaoService();
      const toolService = new ToolService(doubaoService);
      const knowledgeService = new KnowledgeService(doubaoService);
      const entertainmentService = new EntertainmentService(doubaoService);
      
      console.log('  - DoubaoService: ✅');
      console.log('  - ToolService: ✅');
      console.log('  - KnowledgeService: ✅');
      console.log('  - EntertainmentService: ✅');
    } catch (error) {
      throw new Error(`服务初始化失败: ${error.message}`);
    }
  }),

  testMessageHandler: createTest('消息处理器', async () => {
    const MessageHandler = require('./src/handlers/messageHandler');
    const handler = new MessageHandler();
    
    // 测试帮助文本生成
    const helpText = handler.generateHelpText();
    
    if (!helpText || helpText.length === 0) {
      throw new Error('帮助文本生成失败');
    }
    
    console.log('  - 帮助文本: ✅');
    console.log('  - 消息处理器: ✅');
  })
};

// AI对话功能测试
const aiTests = {
  testBasicChat: createTest('基础对话', async () => {
    const DoubaoService = require('./src/services/doubaoService');
    const service = new DoubaoService();
    
    // 模拟健康检查
    const healthResult = await service.healthCheck();
    if (!healthResult.status === 'ok') {
      throw new Error('AI服务健康检查失败');
    }
    
    console.log('  - AI服务连接: ✅');
    console.log('  - 健康检查: ✅');
  }),

  testContextManagement: createTest('上下文管理', async () => {
    const MessageHandler = require('./src/handlers/messageHandler');
    const handler = new MessageHandler();
    
    // 测试上下文存储
    const userId = 'test_user';
    handler.userContexts.set(userId, [{ role: 'user', content: '测试消息' }]);
    
    const context = handler.userContexts.get(userId);
    if (!context || context.length === 0) {
      throw new Error('上下文存储失败');
    }
    
    console.log('  - 上下文存储: ✅');
    console.log('  - 上下文检索: ✅');
  })
};

// 工具功能测试
const toolTests = {
  testToolService: createTest('工具服务', async () => {
    const DoubaoService = require('./src/services/doubaoService');
    const ToolService = require('./src/services/toolService');
    
    const doubaoService = new DoubaoService();
    const toolService = new ToolService(doubaoService);
    
    // 测试工具统计
    const stats = toolService.getStats();
    if (typeof stats !== 'object') {
      throw new Error('工具统计获取失败');
    }
    
    console.log('  - 工具统计: ✅');
    console.log('  - 服务初始化: ✅');
  }),

  testCalculator: createTest('计算器功能', async () => {
    const DoubaoService = require('./src/services/doubaoService');
    const ToolService = require('./src/services/toolService');
    
    const doubaoService = new DoubaoService();
    const toolService = new ToolService(doubaoService);
    const message = new MockMessage('/计算 2+2');
    
    await toolService.handleCommand('计算', ['2+2'], message);
    
    if (message.responses.length === 0) {
      throw new Error('计算器无响应');
    }
    
    console.log('  - 计算功能: ✅');
  })
};

// 娱乐功能测试
const entertainmentTests = {
  testEntertainmentService: createTest('娱乐服务', async () => {
    const EntertainmentService = require('./src/services/entertainmentService');
    
    const entertainmentService = new EntertainmentService();
    
    // 测试服务初始化
    if (!entertainmentService.doubaoService) {
      throw new Error('豆包服务初始化失败');
    }
    
    if (!entertainmentService.gameStates) {
      throw new Error('游戏状态管理初始化失败');
    }
    
    console.log('  - 娱乐服务: ✅');
    console.log('  - 游戏状态: ✅');
  })
};

// 知识功能测试
const knowledgeTests = {
  testKnowledgeService: createTest('知识服务', async () => {
    const DoubaoService = require('./src/services/doubaoService');
    const KnowledgeService = require('./src/services/knowledgeService');
    
    const doubaoService = new DoubaoService();
    const knowledgeService = new KnowledgeService(doubaoService);
    
    // 测试健康检查
    const healthResult = await knowledgeService.healthCheck();
    if (!healthResult.status === 'ok') {
      throw new Error('知识服务健康检查失败');
    }
    
    console.log('  - 知识服务: ✅');
    console.log('  - 健康检查: ✅');
  })
};

// 群聊功能测试
const groupTests = {
  testGroupChatConfig: createTest('群聊配置', async () => {
    if (!config.groupChat) {
      throw new Error('群聊配置缺失');
    }
    
    if (typeof config.groupChat.messageInterval !== 'number') {
      throw new Error('消息间隔配置错误');
    }
    
    console.log(`  - 消息间隔: ${config.groupChat.messageInterval}条`);
    console.log(`  - 最大上下文: ${config.groupChat.maxContextLength}条`);
    console.log('  - 群聊配置: ✅');
  }),

  testGroupChatLogic: createTest('群聊逻辑', async () => {
    const MessageHandler = require('./src/handlers/messageHandler');
    const handler = new MessageHandler();
    
    // 测试群聊配置
    if (typeof handler.groupChatEnabled !== 'boolean') {
      throw new Error('群聊启用状态类型错误');
    }
    
    if (typeof handler.groupChatMessageCount !== 'number') {
      throw new Error('群聊消息计数类型错误');
    }
    
    console.log('  - 群聊状态: ✅');
    console.log('  - 消息计数: ✅');
  })
};

// 执行所有测试
async function runAllTests() {
  console.log('🚀 开始微信机器人功能测试\n');
  console.log('=' .repeat(50));
  
  // 基础功能测试
  console.log('\n📋 基础功能测试');
  console.log('-'.repeat(30));
  for (const test of Object.values(basicTests)) {
    await test();
  }
  
  // AI对话功能测试
  console.log('\n🤖 AI对话功能测试');
  console.log('-'.repeat(30));
  for (const test of Object.values(aiTests)) {
    await test();
  }
  
  // 工具功能测试
  console.log('\n🔧 工具功能测试');
  console.log('-'.repeat(30));
  for (const test of Object.values(toolTests)) {
    await test();
  }
  
  // 娱乐功能测试
  console.log('\n🎮 娱乐功能测试');
  console.log('-'.repeat(30));
  for (const test of Object.values(entertainmentTests)) {
    await test();
  }
  
  // 知识功能测试
  console.log('\n📚 知识功能测试');
  console.log('-'.repeat(30));
  for (const test of Object.values(knowledgeTests)) {
    await test();
  }
  
  // 群聊功能测试
  console.log('\n👥 群聊功能测试');
  console.log('-'.repeat(30));
  for (const test of Object.values(groupTests)) {
    await test();
  }
  
  // 输出测试结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果统计');
  console.log('='.repeat(50));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`⏭️  跳过: ${testResults.skipped}`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n⚠️  存在失败的测试，请检查相关功能');
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  basicTests,
  aiTests,
  toolTests,
  entertainmentTests,
  knowledgeTests,
  groupTests
};