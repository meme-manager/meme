# 全文搜索功能实现

## 1. 搜索架构

### 1.1 技术选型
- **SQLite FTS5**: 全文搜索引擎
- **pinyin-pro**: 拼音支持库
- **防抖**: 减少搜索频率
- **虚拟滚动**: 大量结果性能优化

### 1.2 搜索流程

```
用户输入 → 防抖(300ms) → 预处理查询
    ↓
生成拼音变体 → 构建FTS5查询 → 执行搜索
    ↓
应用筛选器 → 排序 → 分页
    ↓
返回结果 → 更新UI
```

## 2. 拼音搜索实现

### 2.1 查询预处理

```typescript
import { pinyin } from 'pinyin-pro';

function preprocessQuery(query: string): string {
  const tokens = query.trim().split(/\s+/);
  
  const expanded = tokens.flatMap(token => {
    const variants = [token];
    
    // 中文支持拼音
    if (/[\u4e00-\u9fa5]/.test(token)) {
      // 全拼: "哈哈" -> "haha"
      const full = pinyin(token, { 
        toneType: 'none',
        type: 'array' 
      }).join('');
      
      // 首字母: "哈哈" -> "hh"
      const first = pinyin(token, { 
        pattern: 'first',
        toneType: 'none'
      });
      
      variants.push(full, first);
    }
    
    // 前缀匹配: "搞笑" -> "搞笑*"
    variants.push(token + '*');
    
    return variants;
  });
  
  // FTS5查询: "哈哈" OR "haha" OR "hh" OR "哈哈*"
  return expanded.map(v => `"${v}"`).join(' OR ');
}
```

### 2.2 FTS5索引设计

```sql
-- 创建FTS5虚拟表
CREATE VIRTUAL TABLE assets_fts USING fts5(
    asset_id UNINDEXED,
    file_name,
    keywords,           -- 关键词（空格分隔）
    keywords_pinyin,    -- 关键词拼音
    tags,               -- 标签
    tags_pinyin,        -- 标签拼音
    tokenize='unicode61'
);

-- 自动更新触发器
CREATE TRIGGER assets_fts_insert 
AFTER INSERT ON assets 
BEGIN
    INSERT INTO assets_fts(asset_id, file_name, keywords, keywords_pinyin, tags, tags_pinyin)
    SELECT 
        NEW.id,
        NEW.file_name,
        (SELECT GROUP_CONCAT(k.text, ' ') 
         FROM asset_keywords ak
         JOIN keywords k ON ak.keyword_id = k.id
         WHERE ak.asset_id = NEW.id),
        '', -- 由应用层填充
        (SELECT GROUP_CONCAT(t.name, ' ')
         FROM asset_tags at
         JOIN tags t ON at.tag_id = t.id
         WHERE at.asset_id = NEW.id),
        ''  -- 由应用层填充
    WHERE NEW.deleted = 0;
END;
```

## 3. 搜索API

### 3.1 接口定义

```typescript
interface SearchOptions {
  query: string;
  filters?: {
    mimeTypes?: string[];      // ['image/gif', 'image/png']
    tags?: string[];           // ['搞笑', '猫咪']
    collections?: string[];    // [collection_id]
    sizeRange?: [number, number];
    dateRange?: [number, number];
  };
  sort?: 'relevance' | 'created_at' | 'last_used' | 'use_count';
  limit?: number;
  offset?: number;
}

interface SearchResult {
  assets: Asset[];
  total: number;
  hasMore: boolean;
  took: number;  // 搜索耗时(ms)
}
```

### 3.2 核心实现

```typescript
export class SearchEngine {
  async search(options: SearchOptions): Promise<SearchResult> {
    const start = performance.now();
    const { query, filters = {}, sort = 'relevance', limit = 50, offset = 0 } = options;
    
    // 构建查询
    let sql = `
      SELECT a.*, bm25(assets_fts) as rank
      FROM assets a
      JOIN assets_fts fts ON fts.asset_id = a.id
      WHERE fts MATCH ?
        AND a.deleted = 0
    `;
    
    const params = [preprocessQuery(query)];
    
    // 应用筛选器
    if (filters.mimeTypes?.length) {
      sql += ` AND a.mime_type IN (${filters.mimeTypes.map(() => '?').join(',')})`;
      params.push(...filters.mimeTypes);
    }
    
    if (filters.tags?.length) {
      sql += ` AND EXISTS (
        SELECT 1 FROM asset_tags at
        JOIN tags t ON at.tag_id = t.id
        WHERE at.asset_id = a.id
          AND t.name IN (${filters.tags.map(() => '?').join(',')})
      )`;
      params.push(...filters.tags);
    }
    
    // 排序
    sql += sort === 'relevance' 
      ? ` ORDER BY rank` 
      : ` ORDER BY a.${sort} DESC`;
    
    // 分页
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // 执行查询
    const assets = await db.select(sql, params);
    
    // 获取总数
    const total = await this.getTotal(query, filters);
    
    return {
      assets,
      total,
      hasMore: offset + assets.length < total,
      took: performance.now() - start
    };
  }
}
```

## 4. 搜索UI

### 4.1 搜索框组件

```typescript
export function SearchBar() {
  const [query, setQuery] = useState('');
  const { search, results, loading } = useSearch();
  
  // 防抖
  const debouncedSearch = useMemo(
    () => debounce((q: string) => search({ query: q }), 300),
    [search]
  );
  
  useEffect(() => {
    if (query) {
      debouncedSearch(query);
    }
  }, [query, debouncedSearch]);
  
  return (
    <div className="search-bar">
      <SearchIcon className="search-icon" />
      <input
        type="text"
        placeholder="搜索表情包... (支持拼音)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
      {loading && <Spinner className="search-spinner" />}
    </div>
  );
}
```

### 4.2 高级筛选

```typescript
export function SearchFilters() {
  const { filters, setFilters } = useSearchStore();
  
  return (
    <div className="filters">
      {/* 文件类型 */}
      <FilterGroup label="类型">
        <Checkbox checked={filters.mimeTypes?.includes('image/gif')}
                  onChange={() => toggleMimeType('image/gif')}>
          GIF动图
        </Checkbox>
        <Checkbox checked={filters.mimeTypes?.includes('image/png')}
                  onChange={() => toggleMimeType('image/png')}>
          PNG静图
        </Checkbox>
      </FilterGroup>
      
      {/* 标签 */}
      <FilterGroup label="标签">
        <TagSelector 
          selected={filters.tags || []}
          onChange={(tags) => setFilters({ ...filters, tags })}
        />
      </FilterGroup>
      
      {/* 文件大小 */}
      <FilterGroup label="大小">
        <SizeRangeSlider
          value={filters.sizeRange || [0, 10 * 1024 * 1024]}
          onChange={(range) => setFilters({ ...filters, sizeRange: range })}
        />
      </FilterGroup>
    </div>
  );
}
```

## 5. 搜索优化

### 5.1 性能优化

```typescript
// 1. 索引优化
CREATE INDEX idx_assets_updated ON assets(updated_at DESC);
CREATE INDEX idx_assets_use_count ON assets(use_count DESC);

// 2. 查询优化
// 使用EXPLAIN QUERY PLAN分析查询
EXPLAIN QUERY PLAN
SELECT * FROM assets WHERE ...

// 3. 结果缓存
const cache = new Map<string, SearchResult>();

function searchWithCache(options: SearchOptions) {
  const key = JSON.stringify(options);
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = await search(options);
  cache.set(key, result);
  return result;
}
```

### 5.2 搜索建议

```typescript
// 搜索历史
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage('search_history', []);
  
  const addHistory = (query: string) => {
    const updated = [query, ...history.filter(q => q !== query)].slice(0, 10);
    setHistory(updated);
  };
  
  return { history, addHistory };
}

// 热门搜索
export function usePopularSearches() {
  return useQuery('popular_searches', async () => {
    return await db.select(`
      SELECT keywords.text, COUNT(*) as count
      FROM asset_keywords
      JOIN keywords ON asset_keywords.keyword_id = keywords.id
      GROUP BY keywords.text
      ORDER BY count DESC
      LIMIT 10
    `);
  });
}
```

## 6. 搜索示例

### 6.1 基础搜索

```typescript
// 搜索 "哈哈"
search({ query: '哈哈' });
// 匹配: "哈哈.gif", 标签包含"哈哈"的图片, 关键词"haha"的图片

// 搜索 "hh"（拼音首字母）
search({ query: 'hh' });
// 匹配: 所有拼音首字母包含"hh"的标签/关键词
```

### 6.2 高级搜索

```typescript
// 搜索GIF动图，标签为"搞笑"，按使用次数排序
search({
  query: '表情',
  filters: {
    mimeTypes: ['image/gif'],
    tags: ['搞笑']
  },
  sort: 'use_count'
});
```

### 6.3 组合筛选

```typescript
// 搜索最近7天内，大于1MB的PNG图片
search({
  query: '',
  filters: {
    mimeTypes: ['image/png'],
    sizeRange: [1024 * 1024, Infinity],
    dateRange: [Date.now() - 7 * 24 * 3600 * 1000, Date.now()]
  }
});
```

## 7. 搜索统计

```typescript
// 记录搜索行为
async function logSearch(query: string, resultCount: number) {
  await db.execute(`
    INSERT INTO search_logs (query, result_count, timestamp)
    VALUES (?, ?, ?)
  `, [query, resultCount, Date.now()]);
}

// 搜索分析
async function getSearchAnalytics() {
  return await db.select(`
    SELECT 
      query,
      COUNT(*) as search_count,
      AVG(result_count) as avg_results
    FROM search_logs
    WHERE timestamp > ?
    GROUP BY query
    ORDER BY search_count DESC
    LIMIT 20
  `, [Date.now() - 30 * 24 * 3600 * 1000]);
}
```

## 8. 搜索快捷键

```typescript
// 全局搜索快捷键
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // Cmd+K / Ctrl+K 唤起搜索
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      focusSearch();
    }
    
    // ESC 清空搜索
    if (e.key === 'Escape') {
      clearSearch();
    }
  };
  
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```
