# 配额管理和成本控制方案

## 1. Cloudflare 免费额度总览

| 服务 | 免费额度 | 超出后行为 | 付费价格 |
|------|---------|-----------|---------|
| **Workers** | 100,000 请求/天 | 服务暂停 | $5/月（1000万请求） |
| **R2 存储** | 10GB | 可设置硬限制 | $0.015/GB/月 |
| **R2 读取** | 1000万次/月 | 可设置硬限制 | $0.36/百万次 |
| **R2 写入** | 100万次/月 | 可设置硬限制 | $4.50/百万次 |
| **D1 存储** | 5GB | 请求被拒绝 | $0.75/GB/月 |
| **D1 读取** | 500万次/天 | 请求被拒绝 | $0.001/1000次 |
| **D1 写入** | 10万次/天 | 请求被拒绝 | $1/百万次 |

## 2. 多层保护策略

### 2.1 Cloudflare Dashboard 设置

```yaml
# 在 Cloudflare Dashboard 中设置硬限制

R2 存储桶设置：
  - 存储上限: 9GB（留 1GB 缓冲）
  - 每月读取上限: 900万次
  - 每月写入上限: 90万次
  - 超出行为: 拒绝请求（不扣费）

Workers 设置：
  - CPU 时间限制: 50ms/请求
  - 内存限制: 128MB
  - 每日请求上限: 95,000（留缓冲）
  - 超出行为: 返回 429 Too Many Requests

D1 数据库设置：
  - 存储上限: 4.5GB
  - 每日读取上限: 450万次
  - 每日写入上限: 9万次
  - 超出行为: 拒绝请求
```

### 2.2 应用层限流

```typescript
// src/workers/middleware/rateLimit.ts

interface RateLimitConfig {
  // 用户级别限制
  maxAssetsPerUser: number;           // 每个用户最多图片数
  maxStoragePerUser: number;          // 每个用户最大存储（字节）
  maxSharesPerUser: number;           // 每个用户最多分享数
  maxSharesPerDay: number;            // 每天最多创建分享数
  
  // IP 级别限制
  maxRequestsPerIpPerHour: number;    // 每小时最多请求数
  maxShareViewsPerIpPerHour: number;  // 每小时最多查看分享数
  
  // 分享级别限制
  maxViewsPerShare: number;           // 单个分享最大查看次数
  maxDownloadsPerShare: number;       // 单个分享最大下载次数
}

const RATE_LIMITS: RateLimitConfig = {
  maxAssetsPerUser: 2000,
  maxStoragePerUser: 1024 * 1024 * 1024, // 1GB
  maxSharesPerUser: 100,
  maxSharesPerDay: 10,
  
  maxRequestsPerIpPerHour: 1000,
  maxShareViewsPerIpPerHour: 100,
  
  maxViewsPerShare: 10000,
  maxDownloadsPerShare: 1000,
};

// 检查用户配额
export async function checkUserQuota(
  userId: string,
  env: Env
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. 检查图片数量
  const assetCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM assets WHERE user_id = ? AND deleted = 0'
  ).bind(userId).first<{ count: number }>();
  
  if (assetCount && assetCount.count >= RATE_LIMITS.maxAssetsPerUser) {
    return {
      allowed: false,
      reason: `已达到最大图片数量限制（${RATE_LIMITS.maxAssetsPerUser}张）`
    };
  }
  
  // 2. 检查存储空间
  const user = await env.DB.prepare(
    'SELECT storage_used FROM users WHERE user_id = ?'
  ).bind(userId).first<{ storage_used: number }>();
  
  if (user && user.storage_used >= RATE_LIMITS.maxStoragePerUser) {
    return {
      allowed: false,
      reason: `存储空间已满（${formatBytes(RATE_LIMITS.maxStoragePerUser)}）`
    };
  }
  
  // 3. 检查分享数量
  const shareCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM shares WHERE user_id = ?'
  ).bind(userId).first<{ count: number }>();
  
  if (shareCount && shareCount.count >= RATE_LIMITS.maxSharesPerUser) {
    return {
      allowed: false,
      reason: `已达到最大分享数量限制（${RATE_LIMITS.maxSharesPerUser}个）`
    };
  }
  
  return { allowed: true };
}

// 检查每日分享创建限制
export async function checkDailyShareLimit(
  userId: string,
  env: Env
): Promise<{ allowed: boolean; reason?: string }> {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM shares 
    WHERE user_id = ? 
    AND DATE(created_at/1000, 'unixepoch') = ?
  `).bind(userId, today).first<{ count: number }>();
  
  if (result && result.count >= RATE_LIMITS.maxSharesPerDay) {
    return {
      allowed: false,
      reason: `今日分享创建次数已达上限（${RATE_LIMITS.maxSharesPerDay}次）`
    };
  }
  
  return { allowed: true };
}

// IP 级别限流（使用 KV 存储计数）
export async function checkIpRateLimit(
  ip: string,
  env: Env
): Promise<{ allowed: boolean; reason?: string }> {
  const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const key = `ip:${ip}:${hour}`;
  
  const count = await env.KV.get(key);
  const currentCount = count ? parseInt(count) : 0;
  
  if (currentCount >= RATE_LIMITS.maxRequestsPerIpPerHour) {
    return {
      allowed: false,
      reason: '请求过于频繁，请稍后再试'
    };
  }
  
  // 增加计数，1小时后过期
  await env.KV.put(key, (currentCount + 1).toString(), {
    expirationTtl: 3600
  });
  
  return { allowed: true };
}

// 工具函数
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
```

### 2.3 客户端提示

```typescript
// 在客户端显示配额使用情况

interface QuotaInfo {
  assets: {
    used: number;
    limit: number;
    percentage: number;
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
  shares: {
    used: number;
    limit: number;
    percentage: number;
  };
}

// 获取配额信息
async function getQuotaInfo(): Promise<QuotaInfo> {
  const response = await fetch('/api/user/quota', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// 在设置面板中显示
function QuotaPanel() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  
  useEffect(() => {
    getQuotaInfo().then(setQuota);
  }, []);
  
  if (!quota) return null;
  
  return (
    <div className="quota-panel">
      <h3>📊 配额使用情况</h3>
      
      <div className="quota-item">
        <div className="quota-label">图片数量</div>
        <div className="quota-bar">
          <div 
            className="quota-fill" 
            style={{ width: `${quota.assets.percentage}%` }}
          />
        </div>
        <div className="quota-text">
          {quota.assets.used} / {quota.assets.limit}
        </div>
      </div>
      
      <div className="quota-item">
        <div className="quota-label">存储空间</div>
        <div className="quota-bar">
          <div 
            className="quota-fill" 
            style={{ width: `${quota.storage.percentage}%` }}
          />
        </div>
        <div className="quota-text">
          {formatBytes(quota.storage.used)} / {formatBytes(quota.storage.limit)}
        </div>
      </div>
      
      <div className="quota-item">
        <div className="quota-label">分享数量</div>
        <div className="quota-bar">
          <div 
            className="quota-fill" 
            style={{ width: `${quota.shares.percentage}%` }}
          />
        </div>
        <div className="quota-text">
          {quota.shares.used} / {quota.shares.limit}
        </div>
      </div>
      
      {quota.storage.percentage > 80 && (
        <div className="quota-warning">
          ⚠️ 存储空间即将用完，建议删除一些不需要的图片
        </div>
      )}
    </div>
  );
}
```

## 3. 监控和告警

### 3.1 使用量监控

```typescript
// 定期检查使用量（每天运行一次）
// 使用 Cloudflare Cron Triggers

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 1. 统计总存储使用量
    const totalStorage = await env.DB.prepare(
      'SELECT SUM(storage_used) as total FROM users'
    ).first<{ total: number }>();
    
    // 2. 统计今日请求数（从 Analytics API）
    const todayRequests = await getWorkerAnalytics(env);
    
    // 3. 检查是否接近限制
    const warnings = [];
    
    if (totalStorage && totalStorage.total > 9 * 1024 * 1024 * 1024) {
      warnings.push('R2 存储使用超过 90%');
    }
    
    if (todayRequests > 90000) {
      warnings.push('Workers 请求数超过 90%');
    }
    
    // 4. 发送告警邮件
    if (warnings.length > 0) {
      await sendAlertEmail(env, warnings);
    }
  }
};

async function sendAlertEmail(env: Env, warnings: string[]) {
  // 使用 Cloudflare Email Workers 或第三方服务
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: 'admin@example.com' }]
      }],
      from: { email: 'alert@meme.app' },
      subject: '⚠️ Cloudflare 配额告警',
      content: [{
        type: 'text/plain',
        value: warnings.join('\n')
      }]
    })
  });
}
```

### 3.2 Cloudflare Analytics

在 Dashboard 中查看实时使用情况：
- Workers 请求数和错误率
- R2 存储和流量
- D1 查询统计

## 4. 成本优化建议

### 4.1 图片优化

```typescript
// 1. 压缩图片
async function optimizeImage(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // 使用 Cloudflare Images 或本地压缩
  // GIF/WebP 保持原样
  // PNG/JPG 压缩到合理大小
  
  const img = await sharp(buffer);
  const metadata = await img.metadata();
  
  if (metadata.format === 'png' || metadata.format === 'jpeg') {
    // 限制最大尺寸
    if (metadata.width! > 2000 || metadata.height! > 2000) {
      img.resize(2000, 2000, { fit: 'inside' });
    }
    
    // 压缩质量
    if (metadata.format === 'jpeg') {
      img.jpeg({ quality: 85 });
    } else {
      img.png({ compressionLevel: 9 });
    }
  }
  
  return img.toBuffer();
}

// 2. 缩略图使用 WebP 格式
async function generateThumbnail(buffer: ArrayBuffer, size: number): Promise<ArrayBuffer> {
  return sharp(buffer)
    .resize(size, size, { fit: 'inside' })
    .webp({ quality: 80 })
    .toBuffer();
}
```

### 4.2 缓存策略

```typescript
// 使用 Cloudflare Cache API 减少 R2 读取

async function getAssetWithCache(key: string, env: Env): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.meme.app/${key}`);
  
  // 1. 尝试从缓存获取
  let response = await cache.match(cacheKey);
  
  if (!response) {
    // 2. 缓存未命中，从 R2 读取
    const object = await env.R2.get(key);
    
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }
    
    response = new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000', // 缓存 1 年
        'ETag': object.etag
      }
    });
    
    // 3. 存入缓存
    await cache.put(cacheKey, response.clone());
  }
  
  return response;
}
```

### 4.3 批量操作

```typescript
// 同步时批量操作，减少请求数

async function syncPush(changes: SyncChanges, env: Env) {
  // 使用 D1 batch API
  const statements = [];
  
  // 批量插入资产
  for (const asset of changes.assets) {
    statements.push(
      env.DB.prepare(`
        INSERT OR REPLACE INTO assets (...) VALUES (...)
      `).bind(...assetValues)
    );
  }
  
  // 批量插入标签
  for (const tag of changes.tags) {
    statements.push(
      env.DB.prepare(`
        INSERT OR REPLACE INTO tags (...) VALUES (...)
      `).bind(...tagValues)
    );
  }
  
  // 一次性执行所有语句
  await env.DB.batch(statements);
}
```

## 5. 付费计划对比

如果真的需要升级（极少数情况）：

| 项目 | 免费版 | 付费版 ($5/月) | 差异 |
|------|--------|---------------|------|
| Workers 请求 | 10万/天 | 1000万/月 | 100倍 |
| R2 存储 | 10GB | 10GB + 超出按量 | 可扩展 |
| R2 读取 | 1000万/月 | 1000万/月 + 超出按量 | 可扩展 |
| D1 存储 | 5GB | 5GB + 超出按量 | 可扩展 |

**结论**：对于个人使用，免费版完全够用！

## 6. 实施清单

- [ ] 在 Cloudflare Dashboard 设置硬限制
- [ ] 实现应用层限流中间件
- [ ] 添加配额显示界面
- [ ] 设置使用量监控和告警
- [ ] 优化图片压缩和缓存
- [ ] 编写配额相关文档

---

**总结**：通过多层保护，可以完全避免意外扣费，同时确保服务稳定运行！
