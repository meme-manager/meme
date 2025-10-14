# 跨应用拖拽和UI设计

## 1. 跨应用拖拽实现

### 1.1 技术方案

**目标**: 将表情包直接拖拽到微信、QQ、钉钉等聊天软件

**实现方式**:
- macOS: NSPasteboard API
- Windows: IDataObject + FORMATETC
- Linux: X11 Drag and Drop

### 1.2 Tauri实现（Rust）

```rust
// src-tauri/src/drag.rs

#[cfg(target_os = "macos")]
use cocoa::{
    appkit::{NSPasteboard, NSPasteboardTypeFileURL},
    base::id,
    foundation::{NSArray, NSString, NSURL},
};

#[tauri::command]
pub async fn start_drag(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        unsafe {
            let pasteboard: id = NSPasteboard::generalPasteboard(cocoa::base::nil);
            pasteboard.clearContents();
            
            let file_url: id = NSURL::fileURLWithPath_(
                cocoa::base::nil,
                NSString::alloc(cocoa::base::nil).init_str(&file_path)
            );
            
            let objects = NSArray::arrayWithObject(cocoa::base::nil, file_url);
            pasteboard.writeObjects(objects);
        }
        Ok(())
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows 实现
        use windows::Win32::System::DataExchange::*;
        // ... Windows特定代码
        Ok(())
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux X11实现
        Ok(())
    }
}

#[tauri::command]
pub async fn copy_to_clipboard(file_path: String) -> Result<(), String> {
    // 复制文件到剪贴板
    let img = image::open(&file_path)
        .map_err(|e| format!("打开图片失败: {}", e))?;
    
    let mut buf = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| format!("编码失败: {}", e))?;
    
    // 平台特定的剪贴板操作
    #[cfg(target_os = "macos")]
    {
        use clipboard::{ClipboardContext, ClipboardProvider};
        use clipboard::osx_clipboard::OSXClipboardContext;
        
        let mut ctx: OSXClipboardContext = ClipboardProvider::new().unwrap();
        ctx.set_contents(String::from("image")).unwrap();
    }
    
    Ok(())
}
```

### 1.3 前端实现

```typescript
// AssetCard.tsx
import { invoke } from '@tauri-apps/api';
import { useAssetStore } from '@/stores/assetStore';

export function AssetCard({ asset }: { asset: Asset }) {
  const { incrementUseCount } = useAssetStore();
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = async (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    
    try {
      // 调用Tauri后端开始拖拽
      await invoke('start_drag', {
        filePath: asset.file_path
      });
      
      // 更新使用统计
      await incrementUseCount(asset.id);
      
    } catch (error) {
      console.error('拖拽失败:', error);
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const handleDoubleClick = async () => {
    // 双击复制到剪贴板
    await invoke('copy_to_clipboard', {
      filePath: asset.file_path
    });
    toast.success('已复制到剪贴板');
    await incrementUseCount(asset.id);
  };
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={handleDoubleClick}
      className={`asset-card ${isDragging ? 'dragging' : ''}`}
    >
      <img 
        src={asset.thumb_medium} 
        alt={asset.file_name}
        className="asset-image"
      />
      <div className="asset-info">
        <span className="asset-name">{asset.file_name}</span>
        {asset.use_count > 0 && (
          <span className="use-count">{asset.use_count}次</span>
        )}
      </div>
    </div>
  );
}
```

### 1.4 拖拽视觉反馈

```css
/* AssetCard.css */
.asset-card {
  position: relative;
  cursor: grab;
  transition: transform 0.2s, box-shadow 0.2s;
}

.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.asset-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

/* 拖拽时的幽灵图像 */
.asset-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px dashed #3b82f6;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.asset-card.dragging::after {
  opacity: 1;
}
```

## 2. UI设计

### 2.1 整体布局

```
┌────────────────────────────────────────────────────────┐
│  顶部栏: Logo | 搜索框 | 导入按钮 | 设置                  │
├────────┬───────────────────────────────────────────────┤
│        │                                                 │
│  侧边  │             主内容区域                          │
│  栏    │         (网格/列表视图)                        │
│        │                                                 │
│  - 全部│  ┌───┬───┬───┬───┐                            │
│  - 最近│  │ 😊│ 😂│ 🤣│ 😭│                            │
│  - 收藏│  └───┴───┴───┴───┘                            │
│  - GIF │  ┌───┬───┬───┬───┐                            │
│  - PNG │  │ 🎉│ 👍│ ❤️│ 🔥│                            │
│        │  └───┴───┴───┴───┘                            │
│  标签: │                                                 │
│  - 搞笑│  [加载更多...]                                 │
│  - 可爱│                                                 │
│  - 工作│                                                 │
│        │                                                 │
│  集合: │                                                 │
│  - 常用│                                                 │
│  - 工作│                                                 │
└────────┴───────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 主布局组件

```typescript
// Layout.tsx
export function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
}

// Header.tsx
export function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <Logo />
        <SearchBar />
      </div>
      <div className="header-right">
        <ImportButton />
        <SyncStatus />
        <SettingsButton />
      </div>
    </header>
  );
}

// Sidebar.tsx
export function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavSection title="视图">
          <NavItem icon={<GridIcon />} label="全部" count={120} />
          <NavItem icon={<ClockIcon />} label="最近使用" />
          <NavItem icon={<StarIcon />} label="收藏" count={15} />
        </NavSection>
        
        <NavSection title="类型">
          <NavItem icon={<ImageIcon />} label="GIF动图" count={45} />
          <NavItem icon={<FileImageIcon />} label="PNG静图" count={75} />
        </NavSection>
        
        <NavSection title="标签" actions={<AddTagButton />}>
          <TagList />
        </NavSection>
        
        <NavSection title="集合" actions={<AddCollectionButton />}>
          <CollectionList />
        </NavSection>
      </nav>
    </aside>
  );
}
```

#### 网格视图

```typescript
// AssetGrid.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function AssetGrid() {
  const { assets, loading } = useAssetStore();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 虚拟滚动优化性能
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(assets.length / 4), // 4列
    getScrollElement: () => containerRef.current,
    estimateSize: () => 200, // 预估行高
    overscan: 3
  });
  
  return (
    <div ref={containerRef} className="asset-grid-container">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const startIndex = virtualRow.index * 4;
          const endIndex = Math.min(startIndex + 4, assets.length);
          const rowAssets = assets.slice(startIndex, endIndex);
          
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="asset-grid-row"
            >
              {rowAssets.map(asset => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          );
        })}
      </div>
      
      {loading && <LoadingSpinner />}
      {!loading && assets.length === 0 && <EmptyState />}
    </div>
  );
}
```

#### 资产卡片

```typescript
// AssetCard.tsx
export function AssetCard({ asset }: { asset: Asset }) {
  const [showActions, setShowActions] = useState(false);
  const { deleteAsset, toggleFavorite } = useAssetStore();
  
  return (
    <div
      className="asset-card"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 缩略图 */}
      <div className="asset-thumbnail">
        <img 
          src={asset.thumb_medium} 
          alt={asset.file_name}
          loading="lazy"
        />
        
        {/* 动图标识 */}
        {asset.mime_type === 'image/gif' && (
          <Badge className="gif-badge">GIF</Badge>
        )}
      </div>
      
      {/* 悬浮操作栏 */}
      {showActions && (
        <div className="asset-actions">
          <IconButton 
            icon={<CopyIcon />} 
            tooltip="复制"
            onClick={() => copyToClipboard(asset)}
          />
          <IconButton 
            icon={<StarIcon />} 
            tooltip="收藏"
            onClick={() => toggleFavorite(asset.id)}
          />
          <IconButton 
            icon={<TagIcon />} 
            tooltip="添加标签"
            onClick={() => openTagDialog(asset)}
          />
          <IconButton 
            icon={<TrashIcon />} 
            tooltip="删除"
            onClick={() => deleteAsset(asset.id)}
            variant="danger"
          />
        </div>
      )}
      
      {/* 底部信息 */}
      <div className="asset-footer">
        <span className="asset-name" title={asset.file_name}>
          {truncate(asset.file_name, 20)}
        </span>
        {asset.use_count > 0 && (
          <span className="use-count">
            {asset.use_count}次
          </span>
        )}
      </div>
    </div>
  );
}
```

### 2.3 主题配置

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  }
};
```

### 2.4 响应式设计

```css
/* 网格响应式 */
.asset-grid {
  display: grid;
  gap: 16px;
  padding: 16px;
}

/* 大屏：4列 */
@media (min-width: 1280px) {
  .asset-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 中屏：3列 */
@media (min-width: 768px) and (max-width: 1279px) {
  .asset-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 小屏：2列 */
@media (max-width: 767px) {
  .asset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .sidebar {
    display: none; /* 移动端隐藏侧边栏 */
  }
}
```

## 3. 交互细节

### 3.1 快捷键

```typescript
// useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { metaKey, ctrlKey, key, shiftKey } = e;
      const mod = metaKey || ctrlKey;
      
      // Cmd/Ctrl + K: 搜索
      if (mod && key === 'k') {
        e.preventDefault();
        focusSearch();
      }
      
      // Cmd/Ctrl + N: 新建集合
      if (mod && key === 'n') {
        e.preventDefault();
        createCollection();
      }
      
      // Cmd/Ctrl + I: 导入
      if (mod && key === 'i') {
        e.preventDefault();
        openImportDialog();
      }
      
      // Delete: 删除选中
      if (key === 'Delete' || key === 'Backspace') {
        if (hasSelection()) {
          e.preventDefault();
          deleteSelected();
        }
      }
      
      // Cmd/Ctrl + A: 全选
      if (mod && key === 'a') {
        e.preventDefault();
        selectAll();
      }
      
      // ESC: 取消选择
      if (key === 'Escape') {
        clearSelection();
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

### 3.2 右键菜单

```typescript
// ContextMenu.tsx
import { ContextMenu, ContextMenuItem } from '@/components/ui/context-menu';

export function AssetContextMenu({ asset }: { asset: Asset }) {
  return (
    <ContextMenu>
      <ContextMenuItem icon={<CopyIcon />} onClick={() => copy(asset)}>
        复制
      </ContextMenuItem>
      <ContextMenuItem icon={<StarIcon />} onClick={() => favorite(asset)}>
        添加到收藏
      </ContextMenuItem>
      <ContextMenuItem icon={<TagIcon />} onClick={() => addTag(asset)}>
        添加标签
      </ContextMenuItem>
      <ContextMenuItem icon={<FolderIcon />} onClick={() => addToCollection(asset)}>
        添加到集合
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem icon={<InfoIcon />} onClick={() => showInfo(asset)}>
        查看信息
      </ContextMenuItem>
      <ContextMenuItem icon={<ExternalLinkIcon />} onClick={() => openFolder(asset)}>
        在文件夹中显示
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem 
        icon={<TrashIcon />} 
        onClick={() => deleteAsset(asset)}
        className="text-red-600"
      >
        删除
      </ContextMenuItem>
    </ContextMenu>
  );
}
```

### 3.3 拖拽导入区域

```typescript
// DropZone.tsx
export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  
  return (
    <div 
      className={`drop-zone ${isDragging ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="drop-zone-active">
          <UploadCloudIcon className="w-20 h-20 text-blue-500" />
          <p className="text-xl font-semibold">松开以导入</p>
        </div>
      ) : (
        <div className="drop-zone-idle">
          <ImagePlusIcon className="w-16 h-16 text-gray-400" />
          <p className="text-lg text-gray-600">拖拽图片到这里</p>
          <p className="text-sm text-gray-400">或点击选择文件</p>
          <Button onClick={openFilePicker} className="mt-4">
            选择文件
          </Button>
        </div>
      )}
    </div>
  );
}
```

## 4. 性能优化

### 4.1 虚拟滚动
- 使用 `@tanstack/react-virtual`
- 只渲染可见区域的资产
- 大幅提升大量数据性能

### 4.2 图片懒加载
- `loading="lazy"` 属性
- Intersection Observer API
- 占位符渐进式加载

### 4.3 缓存策略
- 缩略图内存缓存
- 搜索结果缓存
- 组件级别memo优化
