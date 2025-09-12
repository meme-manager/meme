/**
 * 错误处理中间件
 */

import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Unhandled error:', err);

  // 开发环境返回详细错误信息
  const isDev = c.env?.ENVIRONMENT === 'development';

  return c.json({
    error: 'Internal Server Error',
    message: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && { stack: err.stack }),
    timestamp: Date.now()
  }, 500);
};