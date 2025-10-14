/**
 * KV 缓存服务 - Task 2.5
 * 提供缓存功能和命中率监控
 */

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
}

export class CacheService {
  private kv: KVNamespace;
  private metrics: CacheMetrics = { hits: 0, misses: 0, hitRate: 0 };

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * 获取缓存值
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'json');
      if (value !== null) {
        this.metrics.hits++;
        console.log(`Cache HIT: ${key}`);
        return value as T;
      } else {
        this.metrics.misses++;
        console.log(`Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      this.metrics.misses++;
      return null;
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const options: KVNamespacePutOptions = {};
      if (ttl) {
        options.expirationTtl = ttl;
      }
      
      await this.kv.put(key, JSON.stringify(value), options);
      console.log(`Cache SET: ${key} (TTL: ${ttl || 'none'})`);
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      console.log(`Cache DELETE: ${key}`);
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 批量获取缓存
   */
  async getBatch<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get<T>(key);
      })
    );

    return results;
  }

  /**
   * 批量设置缓存
   */
  async setBatch(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    await Promise.all(
      items.map(async (item) => {
        await this.set(item.key, item.value, item.ttl);
      })
    );
  }

  /**
   * 清除匹配前缀的缓存
   */
  async clearByPrefix(prefix: string): Promise<void> {
    try {
      // KV 不支持前缀删除，需要列出所有键然后删除
      // 这是一个简化实现，生产环境可能需要更复杂的策略
      const list = await this.kv.list({ prefix });
      
      await Promise.all(
        list.keys.map(async (key) => {
          await this.kv.delete(key.name);
        })
      );
      
      console.log(`Cache CLEAR PREFIX: ${prefix} (${list.keys.length} keys)`);
    } catch (error) {
      console.error(`Cache CLEAR PREFIX error for ${prefix}:`, error);
    }
  }

  /**
   * 获取缓存指标
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置缓存指标
   */
  resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0, hitRate: 0 };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }
}

/**
 * 缓存键生成器
 */
export class CacheKeys {
  static nextClock(deviceId?: string): string {
    return deviceId ? `nextClock:${deviceId}` : 'nextClock:global';
  }

  static indexQuery(query: string, params: Record<string, any>): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `indexQuery:${Buffer.from(query + paramStr).toString('base64')}`;
  }

  static assetMeta(assetId: string): string {
    return `assetMeta:${assetId}`;
  }

  static deviceInfo(deviceId: string): string {
    return `deviceInfo:${deviceId}`;
  }

  static popularQueries(): string {
    return 'popularQueries';
  }
}

/**
 * 缓存 TTL 常量（秒）
 */
export const CacheTTL = {
  NEXT_CLOCK: 300,        // 5 分钟
  INDEX_QUERY: 600,       // 10 分钟
  ASSET_META: 3600,       // 1 小时
  DEVICE_INFO: 1800,      // 30 分钟
  POPULAR_QUERIES: 7200,  // 2 小时
} as const;