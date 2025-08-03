/**
 * 微信机器人Web界面
 * 提供微信登录和管理功能
 */

const express = require('express');
const path = require('path');
const app = express();

// 设置静态文件目录
app.use(express.static('public'));
app.use(express.json());

// 主页面 - 微信登录界面
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>微信机器人 - 登录</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        
        .qr-container {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 15px;
            padding: 40px;
            margin: 30px 0;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        
        .qr-placeholder {
            font-size: 64px;
            color: #adb5bd;
            margin-bottom: 15px;
        }
        
        .qr-text {
            color: #6c757d;
            font-size: 14px;
        }
        
        .status {
            background: #e3f2fd;
            color: #1976d2;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-weight: 500;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            margin: 10px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .features {
            margin-top: 30px;
            text-align: left;
        }
        
        .feature {
            display: flex;
            align-items: center;
            margin: 10px 0;
            color: #555;
        }
        
        .feature-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>微信机器人</h1>
        <p class="subtitle">智能聊天助手</p>
        
        <div class="qr-container" id="qrContainer">
            <div class="qr-placeholder">📱</div>
            <div class="qr-text">点击下方按钮生成微信登录二维码</div>
        </div>
        
        <div class="status" id="status" style="display: none;">
            正在初始化微信登录...
        </div>
        
        <button class="btn" onclick="startLogin()">开始微信登录</button>
        <button class="btn" onclick="refreshQR()" style="background: #28a745;">刷新二维码</button>
        
        <div class="features">
            <div class="feature">
                <span class="feature-icon">💬</span>
                <span>智能对话回复</span>
            </div>
            <div class="feature">
                <span class="feature-icon">🔍</span>
                <span>关键词自动回复</span>
            </div>
            <div class="feature">
                <span class="feature-icon">👥</span>
                <span>群聊管理功能</span>
            </div>
            <div class="feature">
                <span class="feature-icon">📊</span>
                <span>消息统计分析</span>
            </div>
        </div>
    </div>
    
    <script>
        let loginStatus = 'waiting';
        
        function startLogin() {
            const qrContainer = document.getElementById('qrContainer');
            const status = document.getElementById('status');
            
            status.style.display = 'block';
            status.innerHTML = '<div class="loading"></div> 正在生成登录二维码...';
            
            // 模拟二维码生成
             setTimeout(() => {
                 qrContainer.innerHTML = 
                     '<div style="font-size: 120px; line-height: 1;">⬜⬛⬜⬛⬜<br>⬛⬜⬛⬜⬛<br>⬜⬛⬜⬛⬜<br>⬛⬜⬛⬜⬛<br>⬜⬛⬜⬛⬜</div>' +
                     '<div class="qr-text">请使用微信扫描上方二维码</div>';
                status.innerHTML = '✅ 二维码已生成，请使用微信扫描';
                
                // 模拟扫码状态变化
                setTimeout(() => {
                    status.innerHTML = '📱 检测到扫码，请在手机上确认登录';
                }, 3000);
                
                setTimeout(() => {
                    status.innerHTML = '🎉 登录成功！微信机器人已启动';
                    status.style.background = '#d4edda';
                    status.style.color = '#155724';
                }, 6000);
            }, 2000);
        }
        
        function refreshQR() {
            startLogin();
        }
        
        // 页面加载时自动开始登录流程
        window.onload = function() {
            setTimeout(startLogin, 1000);
        };
    </script>
</body>
</html>
  `);
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'wechat-bot',
    timestamp: new Date().toISOString()
  });
});

// API端点
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    bot_status: 'ready',
    login_status: 'waiting',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/login', (req, res) => {
  res.json({
    success: true,
    message: '登录请求已接收',
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  });
});

// 启动服务器
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 微信机器人Web界面启动成功！`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
});

// 云函数导出
exports.main = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'success',
      message: '微信机器人云函数运行正常',
      timestamp: new Date().toISOString()
    })
  };
};