// 简单的 WebSocket 测试脚本
import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3014/ws';

console.log('🔗 连接到:', WS_URL);
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket 已连接！');
  
  // 1. 订阅 default 会话
  const subscribeMsg = JSON.stringify({ type: 'subscribe', chatId: 'default' });
  console.log('📤 发送订阅消息:', subscribeMsg);
  ws.send(subscribeMsg);
  
  // 2. 发送测试消息
  setTimeout(() => {
    const testMsg = JSON.stringify({ 
      type: 'chat', 
      chatId: 'default', 
      content: '你好，请介绍一下你能做什么？' 
    });
    console.log('📤 发送测试消息:', testMsg);
    ws.send(testMsg);
  }, 1000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('📥 收到消息:', msg.type);
  
  if (msg.type === 'assistant_message') {
    console.log('💬 AI 回复:', msg.content);
  } else if (msg.type === 'tool_use') {
    console.log('🔧 使用工具:', msg.toolName);
  } else if (msg.type === 'result') {
    console.log('✅ 结果:', msg.success ? '成功' : '失败', '费用:', msg.cost);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket 已关闭');
});

// 20 秒后退出
setTimeout(() => {
  console.log('⌛ 测试超时，关闭连接...');
  ws.close();
  process.exit(0);
}, 20000);
