/**
 * Cloudflare Workers 主入口
 * 实现云端索引读写 API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { indexRouter } from './routes/index';
import { authRouter } from './routes/auth';
import { assetRouter } from './routes/asset';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { apiRateLimit, deviceRegistrationRateLimit } from './middleware/rateLimit';

// 环境变量类型定义
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV?: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>();

// 全局中间件
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://meme-manager.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
  credentials: true,
}));

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT || 'development',
    version: '1.0.0'
  });
});

// 公开路由（不需要认证，但有限流）
app.use('/api/auth/device-begin', deviceRegistrationRateLimit);
app.route('/api/auth', authRouter);

// 受保护的路由（需要认证和限流）
app.use('/api/index/*', apiRateLimit);
app.use('/api/asset/*', apiRateLimit);
app.use('/api/index/*', authMiddleware);
app.use('/api/asset/*', authMiddleware);
app.route('/api/index', indexRouter);
app.route('/api/asset', assetRouter);

// 错误处理
app.onError(errorHandler);

// 404 处理
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: c.req.path,
    timestamp: Date.now()
  }, 404);
});

export default app;