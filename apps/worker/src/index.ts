import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  // DB: D1Database;
  // R2: R2Bucket;
  // KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 中间件
app.use('*', cors());

// Hello 接口 - 用于验证 Workers 正常工作
app.get('/hello', c => {
  return c.json({
    message: 'Hello from Meme Manager Worker!',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// 健康检查
app.get('/health', c => {
  return c.json({ status: 'ok', service: 'meme-manager-worker' });
});

// API 路由组
const api = new Hono<{ Bindings: Bindings }>();

// 设备注册 (占位符)
api.post('/auth/device-begin', async c => {
  return c.json({
    message: 'Device registration endpoint - to be implemented',
    deviceId: `dev_${Date.now()}`,
    token: 'placeholder-token',
  });
});

// 索引同步 (占位符)
api.get('/index', async c => {
  const since = c.req.query('since') || '0';
  const limit = c.req.query('limit') || '100';

  return c.json({
    events: [],
    nextClock: parseInt(since) + 1,
    message: 'Index sync endpoint - to be implemented',
  });
});

api.post('/index/batch', async c => {
  return c.json({
    accepted: [],
    conflicts: [],
    message: 'Batch sync endpoint - to be implemented',
  });
});

// R2 预签名上传 (占位符)
api.post('/r2/presign-upload', async c => {
  return c.json({
    url: 'https://placeholder-upload-url.com',
    headers: {},
    key: 'placeholder-key',
    message: 'Presign upload endpoint - to be implemented',
  });
});

// 快照下载 (占位符)
api.get('/snapshot/latest', async c => {
  return c.json({
    url: 'https://placeholder-snapshot-url.com',
    snapshotClock: 0,
    message: 'Snapshot endpoint - to be implemented',
  });
});

// 资产缩略图访问 (占位符)
api.get('/asset/:id/thumb', async c => {
  const id = c.req.param('id');
  return c.json({
    message: `Thumbnail for asset ${id} - to be implemented`,
  });
});

// 挂载 API 路由
app.route('/api', api);

// 404 处理
app.notFound(c => {
  return c.json({ error: 'Not Found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
