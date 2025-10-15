# 🎨 表情包管理工具

一个现代化的桌面表情包管理工具,支持云同步、智能搜索和便捷分享。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/meme-manager/meme)

## ✨ 特性

### 核心功能
- 🖼️ **智能管理** - 拖拽导入、URL 导入、剪贴板导入
- 🏷️ **标签系统** - 灵活的标签管理和分类
- 🔍 **快速搜索** - 支持标签、关键词、文件名搜索
- 📋 **一键复制** - 快速复制到剪贴板
- 🎯 **批量操作** - 批量添加标签、导出、删除

### 云同步功能 ☁️
- 🔄 **自动同步** - 多设备间自动同步表情包
- 📤 **分享功能** - 创建分享链接,支持密码保护
- 📊 **配额管理** - 实时查看存储和使用情况
- 🔐 **安全可靠** - JWT 认证,数据加密传输

### 技术特性
- ⚡ **高性能** - 基于 Tauri + React 构建
- 🎨 **现代 UI** - 简洁美观的用户界面
- 🌙 **深色模式** - 支持浅色/深色主题切换
- 💾 **本地存储** - SQLite 数据库,快速可靠

## 🚀 快速开始

### 安装应用

#### macOS
```bash
# 下载最新版本
# 或从 Releases 页面下载
```

#### Windows
```bash
# 下载最新版本
# 或从 Releases 页面下载
```

#### Linux
```bash
# 下载最新版本
# 或从 Releases 页面下载
```

### 一键部署云端 API

点击下面的按钮,一键部署到 Cloudflare:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/meme-manager/meme)

或者使用命令行:

```bash
cd apps/workers
./deploy.sh
```

详细说明请查看: [快速部署指南](./QUICK_DEPLOY.md)

## 📖 使用指南

### 基本使用

1. **导入表情包**
   - 拖拽图片到窗口
   - 点击导入按钮选择文件
   - 从 URL 导入
   - 从剪贴板粘贴

2. **添加标签**
   - 选择图片
   - 点击"添加标签"
   - 输入标签名称

3. **搜索表情包**
   - 在搜索框输入关键词
   - 点击标签筛选
   - 支持多标签组合搜索

4. **使用表情包**
   - 单击复制到剪贴板
   - 双击在文件管理器中打开
   - 右键查看更多操作

### 云同步设置

1. **部署 Workers**
   ```bash
   cd apps/workers
   ./deploy.sh
   ```

2. **配置应用**
   - 打开设置 → 云同步
   - 输入 Workers URL
   - 输入设备名称
   - 点击"登录并启用云同步"

3. **开始同步**
   - 点击"立即同步"
   - 查看同步状态和配额

### 创建分享

1. 选择要分享的图片
2. 点击"创建分享"按钮
3. 设置分享选项:
   - 标题和描述
   - 有效期
   - 下载次数限制
   - 密码保护(可选)
4. 复制分享链接

## 🏗️ 项目结构

```
meme/
├── apps/
│   ├── desktop/          # Tauri 桌面应用
│   │   ├── src/
│   │   │   ├── components/  # React 组件
│   │   │   ├── stores/      # Zustand 状态管理
│   │   │   ├── lib/         # 工具库
│   │   │   └── types/       # TypeScript 类型
│   │   └── src-tauri/       # Rust 后端
│   │
│   └── workers/          # Cloudflare Workers API
│       ├── src/
│       │   ├── routes/      # API 路由
│       │   ├── utils/       # 工具函数
│       │   └── types.ts     # 类型定义
│       ├── migrations/      # 数据库迁移
│       └── deploy.sh        # 一键部署脚本
│
├── packages/
│   └── shared/           # 共享代码
│
└── docs/                 # 文档
```

## 🛠️ 开发指南

### 前置要求

- Node.js 18+
- pnpm 8+
- Rust 1.70+ (用于 Tauri)
- Cloudflare 账号 (用于云同步)

### 安装依赖

```bash
# 安装所有依赖
pnpm install

# 安装 Rust 依赖
cd apps/desktop/src-tauri
cargo build
```

### 开发模式

```bash
# 启动桌面应用
cd apps/desktop
pnpm dev

# 启动 Workers 开发服务器
cd apps/workers
pnpm dev
```

### 构建

```bash
# 构建桌面应用
cd apps/desktop
pnpm build

# 部署 Workers
cd apps/workers
./deploy.sh
```

## 📚 文档

- [快速部署指南](./QUICK_DEPLOY.md) - 一键部署到 Cloudflare
- [云同步设计](./CLOUD_SYNC_DESIGN_v2.md) - 云同步架构设计
- [集成指南](./INTEGRATION_GUIDE.md) - 功能集成说明
- [部署指南](./DEPLOYMENT_GUIDE.md) - 详细部署步骤
- [Deep Link 配置](./DEEP_LINK_SETUP.md) - 分享链接配置

## 🌟 技术栈

### 桌面应用
- **Tauri** - 跨平台桌面框架
- **React** - UI 框架
- **TypeScript** - 类型安全
- **Zustand** - 状态管理
- **SQLite** - 本地数据库
- **TailwindCSS** - 样式框架

### 云端 API
- **Cloudflare Workers** - 边缘计算
- **D1** - SQLite 数据库
- **R2** - 对象存储
- **KV** - 键值存储
- **Hono** - Web 框架
- **jose** - JWT 认证

## 💰 成本说明

### 完全免费!

使用 Cloudflare 免费额度,个人使用完全免费:

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| Workers | 100,000 请求/天 | 边缘计算 |
| D1 | 5GB + 500万读/天 | 数据库 |
| R2 | 10GB + 1000万读/月 | 文件存储 |

预估使用量:
- 1000 张图片 ≈ 500MB
- 每天同步 10 次 ≈ 100 请求
- **完全在免费额度内** ✅

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议!

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发计划

- [ ] 移动端应用
- [ ] 浏览器插件
- [ ] AI 标签推荐
- [ ] OCR 文字识别
- [ ] 表情包制作工具
- [ ] 社区分享平台

## 🐛 问题反馈

遇到问题? 请在 [Issues](https://github.com/meme-manager/meme/issues) 中反馈。

## 📄 许可证

[MIT License](./LICENSE)

## 🙏 致谢

感谢所有贡献者和开源项目!

---

**Made with ❤️ by Meme Manager Team**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/meme-manager/meme)
