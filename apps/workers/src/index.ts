import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { corsPreflightResponse } from './utils/response';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

// 导入路由
import auth from './routes/auth';
import sync from './routes/sync';
import share from './routes/share';
import quota from './routes/quota';
import r2 from './routes/r2';

const app = new Hono<{ Bindings: Env }>();

// CORS 中间件
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// 处理 OPTIONS 请求
app.options('/*', (c) => corsPreflightResponse());

// 健康检查
app.get('/', (c) => {
  return c.json({
    name: 'Meme Manager API',
    version: '1.0.0',
    status: 'ok',
    timestamp: Date.now(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// 公开路由（不需要认证）
app.route('/auth', auth);
app.route('/s', share); // 分享查看（部分需要认证）
app.route('/r2', r2); // R2 文件访问

// 需要认证的路由
app.use('/sync/*', authMiddleware);
app.use('/share/create', authMiddleware);
app.use('/share/list', authMiddleware);
app.use('/share/:shareId', authMiddleware); // DELETE 需要认证
app.use('/quota/*', authMiddleware);

// 限流中间件（应用到所有路由）
app.use('/*', rateLimitMiddleware);

// 注册路由
app.route('/sync', sync);
app.route('/share', share);
app.route('/quota', quota);

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: '接口不存在',
    path: c.req.path,
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('[Error]', err);
  
  return c.json({
    success: false,
    error: err.message || '服务器错误',
  }, 500);
});

export default app;
