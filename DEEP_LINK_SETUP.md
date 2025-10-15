# Deep Link 配置指南

## 概述

实现 `meme://import?share_id=xxx` 协议,允许从浏览器唤起应用导入分享的表情包。

## 1. Tauri 配置

### 1.1 注册 URL Scheme

在 `src-tauri/Cargo.toml` 中添加依赖:

```toml
[dependencies]
tauri-plugin-deep-link = "2.0.0"
```

### 1.2 在 `src-tauri/src/main.rs` 中注册

```rust
use tauri_plugin_deep_link;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // 注册 URL scheme
            #[cfg(target_os = "macos")]
            {
                app.handle().plugin(
                    tauri_plugin_deep_link::Builder::new()
                        .with_scheme("meme")
                        .build(),
                )?;
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 1.3 macOS Info.plist 配置

在 `src-tauri/Info.plist` 中添加:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>Meme Manager</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>meme</string>
    </array>
  </dict>
</array>
```

## 2. 前端处理

### 2.1 监听 Deep Link 事件

在 `src/App.tsx` 中添加:

```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  // 监听 Deep Link 事件
  const unlisten = listen('deep-link://new-url', (event) => {
    const url = event.payload as string;
    console.log('收到 Deep Link:', url);
    
    // 解析 URL
    if (url.startsWith('meme://import')) {
      const params = new URLSearchParams(url.split('?')[1]);
      const shareId = params.get('share_id');
      
      if (shareId) {
        handleImportShare(shareId);
      }
    }
  });
  
  return () => {
    unlisten.then(fn => fn());
  };
}, []);

async function handleImportShare(shareId: string) {
  try {
    // 1. 调用导入 API
    const result = await apiClient.importShare(shareId);
    
    // 2. 下载所有图片
    for (const asset of result.assets) {
      const response = await fetch(asset.download_url);
      const blob = await response.blob();
      
      // 3. 保存到本地
      await importAssetFromBlob(blob, {
        source_platform: 'share',
        share_id: shareId,
      });
    }
    
    // 4. 显示成功提示
    toast.success(`成功导入 ${result.imported_count} 张表情包`);
    
  } catch (error) {
    console.error('导入失败:', error);
    toast.error('导入失败');
  }
}
```

### 2.2 添加导入 API

在 `src/lib/api/client.ts` 中添加:

```typescript
/**
 * 导入分享
 */
async importShare(shareId: string): Promise<{
  success: boolean;
  imported_count: number;
  assets: Array<{
    id: string;
    download_url: string;
  }>;
}> {
  console.log(`${LOG_PREFIX} 导入分享: ${shareId}`);
  return this.request(`/share/${shareId}/import`, {
    method: 'POST',
  });
}
```

## 3. 测试

### 3.1 本地测试

1. 启动应用: `pnpm dev`
2. 在浏览器中打开: `meme://import?share_id=test123`
3. 应该会唤起应用并触发导入流程

### 3.2 生产测试

1. 构建应用: `pnpm tauri build`
2. 安装应用
3. 在浏览器中点击分享链接的"导入到应用"按钮
4. 验证应用被唤起并成功导入

## 4. 跨平台支持

### Windows

在 `src-tauri/tauri.conf.json` 中添加:

```json
{
  "bundle": {
    "windows": {
      "wix": {
        "protocol": {
          "schemes": ["meme"]
        }
      }
    }
  }
}
```

### Linux

需要创建 `.desktop` 文件并注册 MIME type。

## 5. 安全考虑

1. **验证 URL 格式**: 确保 URL 符合预期格式
2. **验证 share_id**: 调用 API 前验证 share_id 格式
3. **用户确认**: 导入前显示确认对话框
4. **错误处理**: 处理网络错误、无效分享等情况

## 6. 注意事项

- Deep Link 只在打包后的应用中生效,开发模式下可能无法测试
- macOS 需要签名才能正常工作
- 首次使用需要用户授权

## 参考资料

- [Tauri Deep Link Plugin](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/deep-link)
- [macOS URL Scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)
