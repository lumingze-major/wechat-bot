#!/usr/bin/env node

const WechatBot = require('./src/index');
const logger = require('./src/utils/logger');
const config = require('./src/config');

/**
 * 启动脚本
 */
class BotStarter {
  constructor() {
    this.bot = null;
    this.isShuttingDown = false;
  }

  /**
   * 启动机器人
   */
  async start() {
    try {
      logger.info('='.repeat(50));
      logger.info('🤖 微信机器人启动中...');
      logger.info('='.repeat(50));
      
      // 显示配置信息
      this.showConfig();
      
      // 创建机器人实例
      this.bot = new WechatBot();
      
      // 设置错误处理
      this.setupErrorHandlers();
      
      // 设置优雅退出
      this.setupGracefulShutdown();
      
      // 启动机器人
      await this.bot.start();
      
      logger.info('✅ 机器人启动成功！');
      
    } catch (error) {
      logger.error('❌ 机器人启动失败:', error);
      process.exit(1);
    }
  }

  /**
   * 显示配置信息
   */
  showConfig() {
    logger.info('📋 当前配置:');
    logger.info(`   机器人名称: ${config.bot.name}`);
    logger.info(`   日志级别: ${config.log.level}`);
    logger.info(`   功能状态:`);
    logger.info(`     - 智能对话: ${config.doubao.apiKey ? '✅' : '❌'}`);
    logger.info(`     - 知识问答: ${config.features.knowledge ? '✅' : '❌'}`);
    logger.info(`     - 娱乐功能: ${config.features.entertainment ? '✅' : '❌'}`);
    logger.info(`     - 实用工具: ${config.features.tools ? '✅' : '❌'}`);
    logger.info(`     - 群组管理: ${config.features.groupManage ? '✅' : '❌'}`);
    logger.info(`   AI服务: ${config.doubao.baseUrl ? '已配置' : '未配置'}`);
    logger.info('');
  }

  /**
   * 设置错误处理
   */
  setupErrorHandlers() {
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      this.gracefulShutdown('uncaughtException');
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
      logger.error('Promise:', promise);
    });

    // 内存警告
    process.on('warning', (warning) => {
      logger.warn('进程警告:', warning);
    });
  }

  /**
   * 设置优雅退出
   */
  setupGracefulShutdown() {
    // SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('收到 SIGINT 信号');
      this.gracefulShutdown('SIGINT');
    });

    // SIGTERM
    process.on('SIGTERM', () => {
      logger.info('收到 SIGTERM 信号');
      this.gracefulShutdown('SIGTERM');
    });

    // Windows 下的退出信号
    if (process.platform === 'win32') {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on('SIGINT', () => {
        process.emit('SIGINT');
      });
    }
  }

  /**
   * 优雅退出
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('正在关闭中，请稍候...');
      return;
    }

    this.isShuttingDown = true;
    
    logger.info('='.repeat(50));
    logger.info(`🛑 收到退出信号: ${signal}`);
    logger.info('🔄 开始优雅关闭...');
    logger.info('='.repeat(50));

    try {
      // 设置超时，防止无限等待
      const shutdownTimeout = setTimeout(() => {
        logger.error('⏰ 关闭超时，强制退出');
        process.exit(1);
      }, 30000); // 30秒超时

      // 停止机器人
      if (this.bot) {
        logger.info('🤖 正在停止机器人...');
        await this.bot.stop();
        logger.info('✅ 机器人已停止');
      }

      // 清除超时
      clearTimeout(shutdownTimeout);

      logger.info('✅ 优雅关闭完成');
      process.exit(0);

    } catch (error) {
      logger.error('❌ 优雅关闭失败:', error);
      process.exit(1);
    }
  }

  /**
   * 重启机器人
   */
  async restart() {
    try {
      logger.info('🔄 重启机器人...');
      
      if (this.bot) {
        await this.bot.stop();
      }
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 重新启动
      await this.start();
      
    } catch (error) {
      logger.error('❌ 重启失败:', error);
      process.exit(1);
    }
  }
}

// 检查Node.js版本
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    console.error('❌ 需要 Node.js 14.0.0 或更高版本');
    console.error(`   当前版本: ${nodeVersion}`);
    process.exit(1);
  }
}

// 检查环境变量
function checkEnvironment() {
  const requiredEnvVars = ['DOUBAO_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 请检查 .env 文件或设置环境变量');
    process.exit(1);
  }
}

// 主函数
async function main() {
  try {
    // 环境检查
    checkNodeVersion();
    checkEnvironment();
    
    // 创建启动器
    const starter = new BotStarter();
    
    // 处理命令行参数
    const args = process.argv.slice(2);
    
    if (args.includes('--restart')) {
      await starter.restart();
    } else {
      await starter.start();
    }
    
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = BotStarter;