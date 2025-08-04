#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const logger = require('./src/utils/logger');

/**
 * 进程管理器 - 优化进程释放和管理
 */
class ProcessManager {
  constructor() {
    this.pidFile = path.join(__dirname, 'bot.pid');
    this.logFile = path.join(__dirname, 'bot.log');
    this.processName = 'wechat-bot';
  }

  /**
   * 启动机器人
   */
  async start(daemon = false) {
    try {
      // 检查是否已经在运行
      if (await this.isRunning()) {
        const pid = this.getPid();
        logger.warn(`机器人已在运行中 (PID: ${pid})`);
        return false;
      }

      logger.info('🚀 启动微信机器人...');

      if (daemon) {
        // 后台模式启动
        await this.startDaemon();
      } else {
        // 前台模式启动
        await this.startForeground();
      }

      return true;
    } catch (error) {
      logger.error('启动失败:', error);
      return false;
    }
  }

  /**
   * 后台启动
   */
  async startDaemon() {
    const child = spawn('node', ['start.js'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: __dirname
    });

    // 保存PID
    this.savePid(child.pid);

    // 重定向输出到日志文件
    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    // 分离进程
    child.unref();

    logger.info(`✅ 机器人已在后台启动 (PID: ${child.pid})`);
    logger.info(`📝 日志文件: ${this.logFile}`);

    // 等待一段时间确认启动成功
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (await this.isRunning()) {
      logger.info('🎉 机器人启动成功！');
    } else {
      logger.error('❌ 机器人启动失败，请检查日志');
      this.cleanup();
    }
  }

  /**
   * 前台启动
   */
  async startForeground() {
    const child = spawn('node', ['start.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    // 保存PID
    this.savePid(child.pid);

    // 设置退出处理
    child.on('exit', (code) => {
      this.cleanup();
      process.exit(code);
    });

    // 设置信号处理
    process.on('SIGINT', () => {
      logger.info('收到退出信号，正在关闭...');
      this.stop();
    });

    process.on('SIGTERM', () => {
      logger.info('收到终止信号，正在关闭...');
      this.stop();
    });
  }

  /**
   * 停止机器人
   */
  async stop() {
    try {
      const pid = this.getPid();
      if (!pid) {
        logger.warn('没有找到运行中的机器人进程');
        return false;
      }

      logger.info(`🛑 正在停止机器人 (PID: ${pid})...`);

      // 优雅关闭
      if (await this.gracefulStop(pid)) {
        logger.info('✅ 机器人已优雅停止');
      } else {
        // 强制关闭
        logger.warn('优雅停止失败，尝试强制关闭...');
        if (await this.forceStop(pid)) {
          logger.info('✅ 机器人已强制停止');
        } else {
          logger.error('❌ 无法停止机器人进程');
          return false;
        }
      }

      this.cleanup();
      return true;
    } catch (error) {
      logger.error('停止失败:', error);
      return false;
    }
  }

  /**
   * 优雅停止
   */
  async gracefulStop(pid) {
    try {
      process.kill(pid, 'SIGTERM');
      
      // 等待进程退出
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.isProcessRunning(pid)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 强制停止
   */
  async forceStop(pid) {
    try {
      process.kill(pid, 'SIGKILL');
      
      // 等待进程退出
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!this.isProcessRunning(pid)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 重启机器人
   */
  async restart(daemon = false) {
    logger.info('🔄 重启机器人...');
    
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.start(daemon);
  }

  /**
   * 获取状态
   */
  async status() {
    const pid = this.getPid();
    if (!pid) {
      logger.info('❌ 机器人未运行');
      return false;
    }

    if (this.isProcessRunning(pid)) {
      logger.info(`✅ 机器人正在运行 (PID: ${pid})`);
      logger.info(`📝 日志文件: ${this.logFile}`);
      return true;
    } else {
      logger.warn('⚠️  PID文件存在但进程未运行，清理中...');
      this.cleanup();
      return false;
    }
  }

  /**
   * 清理所有相关进程
   */
  async cleanAll() {
    logger.info('🧹 清理所有相关进程...');
    
    try {
      // 查找所有相关进程
      const processes = await this.findAllRelatedProcesses();
      
      if (processes.length === 0) {
        logger.info('✅ 没有找到相关进程');
        return true;
      }

      logger.info(`找到 ${processes.length} 个相关进程`);
      
      // 逐个关闭进程
      for (const pid of processes) {
        logger.info(`关闭进程 ${pid}...`);
        try {
          process.kill(pid, 'SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (this.isProcessRunning(pid)) {
            process.kill(pid, 'SIGKILL');
          }
        } catch (error) {
          // 进程可能已经不存在
        }
      }

      // 清理PID文件
      this.cleanup();
      
      logger.info('✅ 所有相关进程已清理');
      return true;
    } catch (error) {
      logger.error('清理失败:', error);
      return false;
    }
  }

  /**
   * 查找所有相关进程
   */
  async findAllRelatedProcesses() {
    return new Promise((resolve, reject) => {
      exec('pgrep -f "node.*start\.js"', (error, stdout) => {
        if (error && error.code !== 1) {
          reject(error);
          return;
        }
        
        const pids = stdout.trim().split('\n')
          .filter(line => line.trim())
          .map(pid => parseInt(pid))
          .filter(pid => !isNaN(pid));
        
        resolve(pids);
      });
    });
  }

  /**
   * 检查是否正在运行
   */
  async isRunning() {
    const pid = this.getPid();
    return pid && this.isProcessRunning(pid);
  }

  /**
   * 检查进程是否运行
   */
  isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取PID
   */
  getPid() {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8').trim());
        return isNaN(pid) ? null : pid;
      }
    } catch (error) {
      // 忽略错误
    }
    return null;
  }

  /**
   * 保存PID
   */
  savePid(pid) {
    try {
      fs.writeFileSync(this.pidFile, pid.toString());
    } catch (error) {
      logger.error('保存PID失败:', error);
    }
  }

  /**
   * 清理
   */
  cleanup() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 显示日志
   */
  showLogs(lines = 50) {
    try {
      if (fs.existsSync(this.logFile)) {
        exec(`tail -n ${lines} ${this.logFile}`, (error, stdout) => {
          if (error) {
            logger.error('读取日志失败:', error);
          } else {
            console.log(stdout);
          }
        });
      } else {
        logger.warn('日志文件不存在');
      }
    } catch (error) {
      logger.error('显示日志失败:', error);
    }
  }
}

// 命令行接口
if (require.main === module) {
  const manager = new ProcessManager();
  const command = process.argv[2];
  const isDaemon = process.argv.includes('--daemon') || process.argv.includes('-d');

  switch (command) {
    case 'start':
      manager.start(isDaemon);
      break;
    case 'stop':
      manager.stop();
      break;
    case 'restart':
      manager.restart(isDaemon);
      break;
    case 'status':
      manager.status();
      break;
    case 'clean':
      manager.cleanAll();
      break;
    case 'logs':
      const lines = parseInt(process.argv[3]) || 50;
      manager.showLogs(lines);
      break;
    default:
      console.log(`
微信机器人进程管理器

使用方法:
  node process-manager.js <command> [options]

命令:
  start [--daemon|-d]  启动机器人 (可选后台模式)
  stop                 停止机器人
  restart [--daemon|-d] 重启机器人 (可选后台模式)
  status               查看状态
  clean                清理所有相关进程
  logs [lines]         显示日志 (默认50行)

示例:
  node process-manager.js start --daemon  # 后台启动
  node process-manager.js stop            # 停止
  node process-manager.js restart -d      # 后台重启
  node process-manager.js logs 100        # 显示最近100行日志
`);
  }
}

module.exports = ProcessManager;