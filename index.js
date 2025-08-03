/**
 * 云函数入口文件
 * 适配腾讯云 CloudBase 云函数环境
 */

const express = require('express');
const app = express();

// 健康检查端点
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '微信机器人云函数运行中',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'wechat-bot',
    timestamp: new Date().toISOString()
  });
});

// 启动 HTTP 服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`微信机器人云函数服务启动，端口: ${PORT}`);
});

// 云函数主函数
exports.main = async (event, context) => {
  console.log('云函数被调用:', event);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'success',
      message: '微信机器人云函数运行正常',
      timestamp: new Date().toISOString(),
      event: event
    })
  };
};

// 导出 Express 应用（云函数需要）
module.exports = app;
module.exports.main = exports.main;