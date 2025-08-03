const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('./logger');

class Cache {
  constructor() {
    this.data = new Map();
    this.cacheFile = path.join(config.paths.cache, 'cache.json');
    this.loadFromFile();
    
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 设置缓存
   */
  set(key, value, ttl = config.cache.ttl) {
    const expireTime = Date.now() + (ttl * 1000);
    this.data.set(key, {
      value,
      expireTime
    });
    
    // 限制缓存大小
    if (this.data.size > config.cache.maxSize) {
      const firstKey = this.data.keys().next().value;
      this.data.delete(firstKey);
    }
    
    this.saveToFile();
  }

  /**
   * 获取缓存
   */
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expireTime) {
      this.data.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * 删除缓存
   */
  delete(key) {
    const result = this.data.delete(key);
    this.saveToFile();
    return result;
  }

  /**
   * 检查缓存是否存在
   */
  has(key) {
    const item = this.data.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expireTime) {
      this.data.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.data.clear();
    this.saveToFile();
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.data.entries()) {
      if (now > item.expireTime) {
        this.data.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`清理了 ${cleaned} 个过期缓存项`);
      this.saveToFile();
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.data.values()) {
      if (now > item.expireTime) {
        expired++;
      }
    }
    
    return {
      total: this.data.size,
      active: this.data.size - expired,
      expired
    };
  }

  /**
   * 从文件加载缓存
   */
  loadFromFile() {
    try {
      if (!fs.existsSync(config.paths.cache)) {
        fs.mkdirSync(config.paths.cache, { recursive: true });
      }
      
      if (fs.existsSync(this.cacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        this.data = new Map(data);
        logger.debug(`从文件加载了 ${this.data.size} 个缓存项`);
      }
    } catch (error) {
      logger.error('加载缓存文件失败:', error);
      this.data = new Map();
    }
  }

  /**
   * 保存缓存到文件
   */
  saveToFile() {
    try {
      const data = Array.from(this.data.entries());
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('保存缓存文件失败:', error);
    }
  }

  /**
   * 生成缓存键
   */
  static generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }
}

// 创建全局缓存实例
const cache = new Cache();

// 导出实例和类
module.exports = cache;
module.exports.Cache = Cache;