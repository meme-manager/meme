/**
 * 资产路由 - R2 存储集成（为后续任务准备）
 */

import { Hono } from 'hono';
import type { Env } from '../index';

const assetRouter = new Hono<{ Bindings: Env }>();

// GET /asset/{id}/thumb - 获取缩略图（占位符实现）
assetRouter.get('/:id/thumb', async (c) => {
  const id = c.req.param('id');
  
  return c.json({
    message: 'Asset thumbnail endpoint - to be implemented in Task 2.4',
    assetId: id
  }, 501);
});

// POST /asset/upload - 预签名上传（占位符实现）
assetRouter.post('/upload', async (c) => {
  return c.json({
    message: 'Asset upload endpoint - to be implemented in Task 2.4'
  }, 501);
});

export { assetRouter };