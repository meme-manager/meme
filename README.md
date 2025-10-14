# 表情包管理工具 (Meme Manager)

> 一个现代化的本地表情包管理桌面应用
> 
> 版本: v0.1.0 MVP | 开发完成日期: 2025-01-14

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Status](https://img.shields.io/badge/status-MVP%20Ready-green.svg)

---

## ✨ 特性

### 🚀 核心功能
- **多种导入方式**: 本地文件、URL下载、拖拽导入
- **智能搜索**: 支持中文和拼音搜索，实时结果
- **高级筛选**: 按文件类型、标签、大小等多维度筛选
- **标签管理**: 创建标签、给图片打标签、按标签筛选
- **图片操作**: 查看详情、复制到剪贴板、删除

### 🎨 用户体验
- **现代化UI**: 优雅的卡片设计和流畅动画
- **实时反馈**: 导入进度、Toast通知、加载状态
- **直观交互**: 拖拽、点击、快捷键
- **响应式布局**: 自适应窗口大小

### ⚡ 性能优化
- **缩略图**: 自动生成3种尺寸缩略图
- **去重**: SHA-256哈希自动去重
- **防抖**: 搜索防抖优化性能
- **本地存储**: SQLite数据库，快速查询

---

## 📸 截图

> 待添加实际截图

---

## 🛠️ 技术栈

### 前端
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Zustand** - 状态管理
- **CSS Modules** - 样式隔离
- **pinyin-pro** - 拼音搜索

### 后端
- **Tauri v2** - 桌面应用框架
- **Rust** - 系统编程语言
- **SQLite** - 本地数据库
- **FTS5** - 全文搜索引擎

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- Rust >= 1.70
- Tauri CLI

### 安装依赖
```bash
# 安装pnpm（如果没有）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 开发模式
```bash
cd apps/desktop
pnpm run tauri dev
```

### 构建应用
```bash
cd apps/desktop
pnpm run tauri build
```

---

## 📖 使用指南

### 导入图片

#### 方式1: 本地文件
1. 点击Header的📁按钮
2. 选择一张或多张图片
3. 等待导入完成

#### 方式2: URL导入
1. 点击Header的🔗按钮
2. 输入图片URL或批量粘贴
3. 点击"导入"按钮

#### 方式3: 拖拽导入
1. 从文件管理器拖拽图片
2. 释放到窗口任意位置
3. 自动开始导入

### 搜索图片

#### 基础搜索
- 在Header搜索框输入关键词
- 支持文件名搜索
- 支持拼音搜索（如"测试" → "ceshi"）

#### 高级筛选
1. 点击搜索框右侧的🔍按钮
2. 选择筛选条件：
   - 文件类型（PNG/JPEG/GIF/WebP）
   - 标签
   - 文件大小
3. 点击"应用"

### 管理标签

#### 创建标签
1. 点击Sidebar标签区域的+按钮
2. 输入标签名称
3. 选择颜色（16种预设）
4. 点击"创建"

#### 给图片添加标签
1. 点击图片打开详情
2. 在"添加标签"区域选择标签
3. 标签会出现在"当前标签"中

#### 按标签筛选
- 在Sidebar点击标签
- 只显示有该标签的图片
- 再次点击取消筛选

### 图片操作

#### 查看详情
- 点击图片卡片
- 查看完整图片和信息

#### 复制到剪贴板
1. 打开图片详情
2. 点击"📋 复制"按钮
3. 在其他应用中粘贴（Cmd/Ctrl + V）

#### 删除图片
1. 打开图片详情
2. 点击"🗑️ 删除"按钮
3. 确认删除

---

## 📁 项目结构

```
meme/
├── apps/
│   ├── desktop/              # 桌面应用
│   │   ├── src/              # 前端源码
│   │   │   ├── components/   # React组件
│   │   │   ├── lib/          # 工具库
│   │   │   ├── stores/       # 状态管理
│   │   │   └── types/        # 类型定义
│   │   └── src-tauri/        # Tauri后端
│   │       ├── src/          # Rust源码
│   │       └── capabilities/ # 权限配置
│   └── worker/               # Cloudflare Worker（未来）
├── packages/
│   └── shared/               # 共享代码
├── docs/                     # 文档
│   ├── ARCHITECTURE*.md      # 架构文档
│   ├── DEVELOPMENT_SUMMARY.md # 开发总结
│   ├── FEATURES.md           # 功能清单
│   ├── TODO.md               # 任务清单
│   └── TESTING_GUIDE.md      # 测试指南
└── README.md                 # 本文件
```

---

## 📚 文档

- [开发总结](./DEVELOPMENT_SUMMARY.md) - 已完成功能和技术要点
- [功能清单](./FEATURES.md) - 详细的功能状态
- [测试指南](./TESTING_GUIDE.md) - 完整的测试清单
- [任务清单](./TODO.md) - 开发任务和进度
- [架构文档](./ARCHITECTURE_INDEX.md) - 系统架构设计

---

## 🎯 功能完成度

### ✅ 已完成（80%）
- [x] 图片导入（本地、URL、拖拽）
- [x] 图片展示和详情
- [x] 搜索功能（基础、拼音、筛选）
- [x] 标签管理和筛选
- [x] 复制和删除
- [x] 导入进度和通知
- [x] UI优化

### 🚧 进行中（10%）
- [ ] 集合管理
- [ ] 收藏功能
- [ ] 最近使用

### 📋 计划中（10%）
- [ ] 云同步
- [ ] OCR识别
- [ ] 批量操作
- [ ] 快捷键
- [ ] 主题切换

---

## 🐛 已知问题

### 待优化
- 大文件导入性能
- 搜索性能（数据量大时）
- 拖拽遮罩可能闪烁

### 未实现
- 剪贴板监听
- 跨应用拖拽
- 虚拟滚动

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

### 开发流程
1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 提交规范
遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 🙏 致谢

感谢以下开源项目：
- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://react.dev/) - UI框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) - 拼音转换
- [SQLite](https://www.sqlite.org/) - 数据库

---

## 📞 联系方式

- 问题反馈: [GitHub Issues](https://github.com/yourusername/meme/issues)
- 功能建议: [GitHub Discussions](https://github.com/yourusername/meme/discussions)

---

## 🗺️ 路线图

### v0.2.0 - 集合管理（2周）
- 创建和管理集合
- 添加图片到集合
- 集合筛选

### v0.3.0 - 增强功能（1个月）
- 收藏和最近使用
- 批量操作
- 快捷键支持
- 主题切换

### v0.4.0 - 云同步（2个月）
- 用户认证
- 云端存储
- 多设备同步

### v1.0.0 - 正式版（3个月）
- OCR识别
- AI分类
- 插件系统
- 移动端支持

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个Star！⭐**

Made with ❤️ by [Your Name]

</div>
