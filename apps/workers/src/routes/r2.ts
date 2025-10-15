import { Hono } from 'hono';
import type { Env } from '../types';
import { notFound } from '../utils/response';

const r2 = new Hono<{ Bindings: Env }>();

/**
 * 获取 R2 文件
 * GET /r2/*
 */
r2.get('/*', async (c) => {
  const key = c.req.param('*');
  
  if (!key) {
    return notFound('文件路径无效');
  }
  
  try {
    console.log(`[R2] 获取文件: ${key}`);
    
    const object = await c.env.R2.get(key);
    
    if (!object) {
      console.log(`[R2] 文件不存在: ${key}`);
      return notFound('文件不存在');
    }
    
    // 设置缓存头
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 缓存 1 年
    headers.set('Access-Control-Allow-Origin', '*');
    
    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag);
    }
    
    return new Response(object.body, {
      headers,
    });
    
  } catch (err) {
    console.error('[R2] 获取文件失败:', err);
    return notFound('获取文件失败');
  }
});

export default r2;
