/**
 * 基础限流中间件
 * 使用内存存储实现简单的限流功能
 */

import type { Context, Next } from 'hono';
import type { Env } from '../index';

// 限流配置
interface RateLimitConfig {
  windowMs: number;     // 时间窗口（毫秒）
  maxRequests: number;  // 最大请求数
  keyGenerator?: (c: Context) => string; // 键生成器
  skipSuccessfulRequests?: boolean;      // 是否跳过成功请求
  skipFailedRequests?: boolean;          // 是否跳过失败请求
}

// 内存存储的请求记录
interface RequestRecord {
  count: number;
  resetTime: number;
}

// 全局限流存储（在生产环境中应该使用 KV 或 Durable Objects）
const rateLimitStore = new Map<string, RequestRecord>();

// 清理过期记录的定时器
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

/**
 * 创建限流中间件
 */
export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    
    // 获取或创建请求记录
    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, record);
    }

    // 检查是否超过限制
    if (record.count >= maxRequests) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      
      return c.json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn
      }, 429, {
        'Retry-After': resetIn.toString(),
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString()
      });
    }

    // 增加请求计数（在请求处理前）
    if (!skipSuccessfulRequests && !skipFailedRequests) {
      record.count++;
    }

    // 处理请求
    await next();

    // 根据响应状态决定是否计数
    if (skipSuccessfulRequests && c.res.status < 400) {
      record.count--;
    } else if (skipFailedRequests && c.res.status >= 400) {
      record.count--;
    }

    // 添加限流头部信息
    const remaining = Math.max(0, maxRequests - record.count);
    c.res.headers.set('X-RateLimit-Limit', maxRequests.toString());
    c.res.headers.set('X-RateLimit-Remaining', remaining.toString());
    c.res.headers.set('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
  };
}

/**
 * 预定义的限流配置
 */
export const rateLimitConfigs = {
  // 严格限流：每分钟 10 次请求
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10
  },
  
  // 中等限流：每分钟 60 次请求
  moderate: {
    windowMs: 60 * 1000,
    maxRequests: 60
  },
  
  // 宽松限流：每分钟 300 次请求
  lenient: {
    windowMs: 60 * 1000,
    maxRequests: 300
  },
  
  // 认证限流：每 15 分钟 5 次请求
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (c: Context) => {
      // 基于 IP 和 User-Agent 的组合键
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      const userAgent = c.req.header('User-Agent') || 'unknown';
      return `auth:${ip}:${userAgent.substring(0, 50)}`;
    }
  }
};

/**
 * 设备注册专用限流
 */
export const deviceRegistrationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  maxRequests: 3,            // 最多 3 次注册尝试
  keyGenerator: (c: Context) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    return `device-reg:${ip}`;
  }
});

/**
 * API 访问限流
 */
export const apiRateLimit = createRateLimit(rateLimitConfigs.moderate);

/**
 * 认证端点限流
 */
export const authRateLimit = createRateLimit(rateLimitConfigs.auth);