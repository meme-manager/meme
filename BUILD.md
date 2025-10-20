# 构建和打包指南

## 🚀 开发环境

### 启动开发服务器

```bash
cd apps/desktop
pnpm tauri dev
```

或在根目录：

```bash
pnpm dev
```

## 📦 生产环境打包

### macOS 打包

1. **安装依赖**（首次）
   ```bash
   cd apps/desktop
   pnpm install
   ```

2. **构建应用**
   ```bash
   pnpm tauri build
   ```

3. **输出位置**
   ```
   apps/desktop/src-tauri/target/release/bundle/
   ├── dmg/
   │   ├── Meme Manager_0.1.0_aarch64.dmg  (Apple Silicon)
   │   └── Meme Manager_0.1.0_x64.dmg      (Intel Mac)
   └── macos/
       └── Meme Manager.app
   ```

### 指定架构打包

**仅 Apple Silicon:**
```bash
pnpm tauri build -- --target aarch64-apple-darwin
```

**仅 Intel Mac:**
```bash
pnpm tauri build -- --target x86_64-apple-darwin
```

**通用二进制（推荐）:**
```bash
pnpm tauri build -- --target universal-apple-darwin
```

## 🔧 构建选项

### 调试模式（更快，但未优化）
```bash
pnpm tauri build --debug
```

### 跳过前端构建
```bash
pnpm tauri build --no-bundle
```

### 指定输出格式
```bash
pnpm tauri build --bundles dmg      # 仅 DMG
pnpm tauri build --bundles app      # 仅 .app
pnpm tauri build --bundles updater  # 仅更新包
```

## 📝 打包前检查清单

- [ ] 更新版本号 `tauri.conf.json` 中的 `version`
- [ ] 更新应用图标 `src-tauri/icons/`
- [ ] 检查环境变量 `.env.production`
- [ ] 测试开发模式 `pnpm tauri dev`
- [ ] 清理缓存 `rm -rf target dist node_modules/.vite`

## 🎯 首次打包可能的问题

### 1. Rust 工具链
```bash
# 检查 Rust 版本
rustc --version

# 更新 Rust
rustup update
```

### 2. Xcode Command Line Tools
```bash
xcode-select --install
```

### 3. 依赖缓存问题
```bash
# 清理并重新构建
cd apps/desktop
rm -rf target dist node_modules
pnpm install
pnpm tauri build
```

## 📊 构建时间参考

- **首次构建**: 5-10 分钟（需要编译 Rust 依赖）
- **增量构建**: 1-3 分钟
- **仅前端变更**: 30 秒 - 1 分钟

## 🔐 代码签名（可选）

如果需要分发到 App Store 或公证：

1. 在 `tauri.conf.json` 添加：
   ```json
   "bundle": {
     "macOS": {
       "signingIdentity": "Developer ID Application: Your Name",
       "entitlements": "entitlements.plist"
     }
   }
   ```

2. 构建时自动签名：
   ```bash
   pnpm tauri build
   ```

## 📤 分发

### 本地测试
直接运行 `.app` 文件或安装 `.dmg`

### 公开分发
1. 上传到 GitHub Releases
2. 提供 DMG 下载链接
3. 可选：配置自动更新（Tauri Updater）
