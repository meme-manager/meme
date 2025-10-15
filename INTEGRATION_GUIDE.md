# 云同步和分享功能集成指南

## 概述

本指南说明如何在桌面应用中集成云同步和分享功能。已完成的模块包括:

1. **API 客户端** - 封装所有与 Cloudflare Workers 的通信
2. **同步管理器** - 处理本地和云端的数据同步
3. **同步状态管理** - Zustand Store 管理同步状态
4. **分享管理器** - 处理表情包分享功能
5. **UI 组件** - 云同步设置、分享对话框、分享管理

## 文件结构

```
apps/desktop/src/
├── lib/
│   ├── api/
│   │   ├── client.ts          # API 客户端
│   │   └── index.ts           # 导出
│   ├── sync/
│   │   ├── syncManager.ts     # 同步管理器
│   │   └── index.ts           # 导出
│   └── share/
│       ├── shareManager.ts    # 分享管理器
│       └── index.ts           # 导出
├── stores/
│   └── syncStore.ts           # 同步状态 Store
├── components/
│   ├── settings/
│   │   └── CloudSyncSettings.tsx  # 云同步设置组件
│   └── share/
│       ├── ShareDialog.tsx        # 分享对话框
│       └── ShareManagement.tsx    # 分享管理
└── types/
    └── sync.ts                # 同步相关类型定义
```

## 集成步骤

### 1. 配置环境变量

创建 `.env.local` 文件:

```bash
# 开发环境
VITE_API_BASE_URL=http://localhost:8787

# 生产环境
# VITE_API_BASE_URL=https://your-worker.your-subdomain.workers.dev
```

### 2. 在设置页面集成云同步

在你的设置页面中导入并使用 `CloudSyncSettings` 组件:

```tsx
import { CloudSyncSettings } from '@/components/settings/CloudSyncSettings';

function SettingsPage() {
  return (
    <div className="settings-page">
      <CloudSyncSettings />
    </div>
  );
}
```

### 3. 在主界面添加分享功能

#### 3.1 添加分享按钮

在资产列表的工具栏添加分享按钮:

```tsx
import { useState } from 'react';
import { ShareDialog } from '@/components/share/ShareDialog';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

function AssetToolbar({ selectedAssetIds }: { selectedAssetIds: string[] }) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <div className="toolbar">
      <Button
        onClick={() => setShareDialogOpen(true)}
        disabled={selectedAssetIds.length === 0}
      >
        <Share2 className="w-4 h-4 mr-2" />
        分享 ({selectedAssetIds.length})
      </Button>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        selectedAssetIds={selectedAssetIds}
      />
    </div>
  );
}
```

#### 3.2 添加分享管理页面

创建一个分享管理页面或标签:

```tsx
import { ShareManagement } from '@/components/share/ShareManagement';

function SharePage() {
  return (
    <div className="share-page">
      <ShareManagement />
    </div>
  );
}
```

### 4. 初始化同步功能

在应用启动时初始化同步:

```tsx
import { useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';

function App() {
  const { initialize } = useSyncStore();

  useEffect(() => {
    // 初始化同步管理器
    initialize();
  }, []);

  return (
    <div className="app">
      {/* 你的应用内容 */}
    </div>
  );
}
```

### 5. 添加自动同步

可选:在应用中添加定时自动同步:

```tsx
import { useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';

function useAutoSync(intervalMinutes: number = 30) {
  const { enabled, syncing, performSync } = useSyncStore();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (!syncing) {
        performSync().catch(console.error);
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, syncing, performSync, intervalMinutes]);
}

// 在主组件中使用
function App() {
  useAutoSync(30); // 每30分钟自动同步
  
  return <div>...</div>;
}
```

## API 使用示例

### 手动调用 API

```typescript
import { apiClient } from '@/lib/api';

// 健康检查
const health = await apiClient.healthCheck();
console.log('API 状态:', health.status);

// 获取配额信息
const quota = await apiClient.getQuota();
console.log('存储使用:', quota.storage.used, '/', quota.storage.limit);
```

### 手动触发同步

```typescript
import { syncManager } from '@/lib/sync';
import { useSyncStore } from '@/stores/syncStore';

// 通过 Store 触发(推荐)
const { performSync } = useSyncStore();
await performSync();

// 或直接使用 syncManager
const result = await syncManager.sync();
if (result.success) {
  console.log('同步成功:', result.pulledCount, '拉取', result.pushedCount, '推送');
}
```

### 创建分享

```typescript
import { shareManager } from '@/lib/share';

// 创建分享
const share = await shareManager.createShare({
  asset_ids: ['asset-1', 'asset-2'],
  title: '我的表情包',
  description: '分享给朋友',
  expires_in: 7 * 24 * 60 * 60, // 7天
});

console.log('分享链接:', share.share_url);

// 复制到剪贴板
await shareManager.copyShareLink(share.share_url);
```

## 数据流说明

### 同步流程

```
1. 用户登录
   ↓
2. 初始化 syncManager
   ↓
3. 执行同步
   ├─ Pull: 从云端拉取更新
   ├─ Merge: 合并到本地(LWW策略)
   ├─ Collect: 收集本地更改
   ├─ Upload: 上传新增图片到R2
   └─ Push: 推送更改到云端
   ↓
4. 更新同步时间戳
```

### 分享流程

```
1. 选择图片
   ↓
2. 打开分享对话框
   ↓
3. 填写分享选项
   ↓
4. 创建分享
   ├─ 上传图片到R2
   ├─ 创建分享记录
   └─ 生成分享链接
   ↓
5. 复制链接分享
```

## 状态管理

### SyncStore 状态

```typescript
interface SyncState {
  // 同步状态
  enabled: boolean;              // 是否启用同步
  syncing: boolean;              // 是否正在同步
  lastSyncTime: number | null;   // 最后同步时间
  lastSyncSuccess: boolean;      // 最后同步是否成功
  error: string | null;          // 错误信息
  
  // 认证信息
  isAuthenticated: boolean;      // 是否已登录
  userId: string | null;         // 用户ID
  deviceId: string | null;       // 设备ID
  token: string | null;          // JWT Token
  
  // 配额信息
  quota: QuotaInfo | null;       // 配额使用情况
}
```

### 使用 Store

```tsx
import { useSyncStore } from '@/stores/syncStore';

function MyComponent() {
  const {
    enabled,
    syncing,
    isAuthenticated,
    performSync,
    enableSync,
  } = useSyncStore();

  return (
    <div>
      <p>同步状态: {enabled ? '已启用' : '未启用'}</p>
      <p>认证状态: {isAuthenticated ? '已登录' : '未登录'}</p>
      <button onClick={performSync} disabled={syncing}>
        {syncing ? '同步中...' : '立即同步'}
      </button>
    </div>
  );
}
```

## 错误处理

所有 API 调用都会抛出 `ApiError`:

```typescript
import { ApiError } from '@/lib/api';

try {
  await apiClient.syncPull({ since: 0, tables: ['assets'] });
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API 错误:', error.message);
    console.error('状态码:', error.statusCode);
    console.error('响应:', error.response);
  } else {
    console.error('未知错误:', error);
  }
}
```

## 待完成的集成工作

以下功能需要与现有的数据库操作集成:

### 1. 数据库操作集成

在 `syncManager.ts` 中需要实现:

- `mergeAsset()` - 合并资产到本地数据库
- `mergeTag()` - 合并标签到本地数据库
- `collectLocalChanges()` - 从数据库收集本地更改
- `uploadNewAssets()` - 读取本地文件并上传

参考现有的 `lib/database/operations.ts` 实现这些方法。

### 2. 文件操作集成

需要使用 Tauri 的文件系统 API:

```typescript
import { readBinaryFile } from '@tauri-apps/api/fs';

// 读取文件用于上传
const fileData = await readBinaryFile(asset.file_path);
const blob = new Blob([fileData], { type: asset.mime_type });
```

### 3. UI 集成

将创建的组件集成到现有的 UI 结构中:

- 在设置页面添加 `CloudSyncSettings`
- 在工具栏添加分享按钮
- 添加分享管理页面或标签

## 测试建议

### 1. 本地测试

启动本地 Workers:

```bash
cd apps/workers
npm run dev
```

### 2. 测试流程

1. **登录测试**
   - 打开云同步设置
   - 输入设备名称并登录
   - 验证 Token 是否保存

2. **同步测试**
   - 启用同步
   - 点击"立即同步"
   - 检查控制台日志

3. **分享测试**
   - 选择图片
   - 创建分享
   - 复制链接
   - 在浏览器中打开链接

### 3. 调试技巧

所有模块都有详细的日志输出:

```typescript
// 查看 API 请求日志
console.log('[API Client] ...');

// 查看同步日志
console.log('[Sync Manager] ...');

// 查看分享日志
console.log('[Share Manager] ...');
```

## 性能优化建议

1. **节流同步请求** - 避免频繁同步
2. **批量上传** - 多个文件一起上传
3. **增量同步** - 只同步变更的数据
4. **缓存配额信息** - 减少配额查询频率
5. **后台同步** - 使用 Web Worker 或后台任务

## 安全注意事项

1. **Token 存储** - 使用 localStorage,考虑加密
2. **HTTPS** - 生产环境必须使用 HTTPS
3. **输入验证** - 验证所有用户输入
4. **错误处理** - 不要暴露敏感信息
5. **速率限制** - 客户端也应该限制请求频率

## 下一步

1. 完成数据库操作集成
2. 实现文件上传功能
3. 添加更多的错误处理
4. 编写单元测试
5. 性能优化和调试

## 参考文档

- [CLOUD_SYNC_DESIGN_v2.md](./CLOUD_SYNC_DESIGN_v2.md) - 云同步设计
- [SHARE_FEATURE_DESIGN.md](./SHARE_FEATURE_DESIGN.md) - 分享功能设计
- [QUOTA_MANAGEMENT.md](./QUOTA_MANAGEMENT.md) - 配额管理
- [ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md) - 整体架构

## 问题排查

### 常见问题

**Q: API 请求失败,显示 CORS 错误**
A: 检查 Workers 的 CORS 配置,确保允许你的域名

**Q: Token 过期怎么办?**
A: Token 有效期 30 天,过期后需要重新登录

**Q: 同步冲突如何处理?**
A: 使用 LWW(Last Write Wins)策略,时间戳新的覆盖旧的

**Q: 如何清除所有同步数据?**
A: 点击"退出登录",本地数据不会被删除

## 联系支持

如有问题,请查看:
- GitHub Issues
- 开发文档
- API 文档
