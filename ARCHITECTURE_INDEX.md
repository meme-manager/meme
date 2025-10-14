# 表情包管理工具 - 架构文档索引

## 📚 文档概览

本项目采用**简化方案A**（本地优先 + 可选云同步），文档已按功能模块拆分为多个独立文件。

---

## 📖 阅读顺序

### 第一步：了解项目 (必读)

1. **[ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md)** - 核心架构文档
   - 📌 项目定位和设计原则
   - 🏗️ 技术栈选择
   - 🗂️ 完整的数据模型设计（本地 + 云端）
   - 🚀 从这里开始！

### 第二步：深入技术细节 (按需阅读)

2. **[ARCHITECTURE_sync_and_api.md](./ARCHITECTURE_sync_and_api.md)** - 同步和API
   - 🔄 简化的时间戳同步方案
   - ⚖️ LWW冲突处理策略
   - 🔌 完整的API接口设计
   - 📡 适合后端开发者

3. **[ARCHITECTURE_import.md](./ARCHITECTURE_import.md)** - 导入功能
   - 📥 三种导入方式（拖拽/URL/剪贴板）
   - 🔒 SHA-256哈希去重机制
   - 🖼️ 缩略图生成流程（128/256/512 webp）
   - 💾 完整的导入流程代码

4. **[ARCHITECTURE_search.md](./ARCHITECTURE_search.md)** - 搜索功能
   - 🔍 SQLite FTS5全文搜索
   - 🀄 拼音搜索支持（全拼+首字母）
   - 🎯 高级筛选和排序
   - ⚡ 搜索性能优化

5. **[ARCHITECTURE_drag_and_ui.md](./ARCHITECTURE_drag_and_ui.md)** - 拖拽和UI
   - 🖱️ 跨平台拖拽实现（macOS/Windows/Linux）
   - 🎨 完整的UI组件设计
   - ⌨️ 快捷键和交互细节
   - 🚀 性能优化（虚拟滚动、懒加载）

### 第三步：项目管理 (团队协作)

6. **[ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md)** - 开发路线图
   - 📅 4个开发阶段（11周计划）
   - 🎯 优先级划分（P0-P3）
   - ⚠️ 风险评估和缓解措施
   - 📊 成功指标和下一步行动

---

## 🗺️ 文档结构

```
meme/
├── ARCHITECTURE_INDEX.md              ← 📍 你在这里
├── ARCHITECTURE_simplified.md         ← ⭐ 主文档（从这里开始）
├── ARCHITECTURE_sync_and_api.md       ← 同步方案
├── ARCHITECTURE_import.md             ← 导入功能
├── ARCHITECTURE_search.md             ← 搜索功能
├── ARCHITECTURE_drag_and_ui.md        ← 拖拽和UI
└── ARCHITECTURE_roadmap.md            ← 开发计划
```

---

## 🎯 按角色推荐

### 产品经理 / 项目经理
1. ✅ [ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md) - 了解整体方案
2. ✅ [ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md) - 查看时间线和优先级

### 前端开发者
1. ✅ [ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md) - 数据模型
2. ✅ [ARCHITECTURE_import.md](./ARCHITECTURE_import.md) - 导入实现
3. ✅ [ARCHITECTURE_search.md](./ARCHITECTURE_search.md) - 搜索UI
4. ✅ [ARCHITECTURE_drag_and_ui.md](./ARCHITECTURE_drag_and_ui.md) - UI组件

### 后端开发者
1. ✅ [ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md) - 数据模型
2. ✅ [ARCHITECTURE_sync_and_api.md](./ARCHITECTURE_sync_and_api.md) - API设计

### Tauri/Rust开发者
1. ✅ [ARCHITECTURE_import.md](./ARCHITECTURE_import.md) - 文件处理
2. ✅ [ARCHITECTURE_drag_and_ui.md](./ARCHITECTURE_drag_and_ui.md) - 拖拽API

---

## 🔑 核心设计决策

### ✅ 采用的方案
- **本地优先**：核心功能离线可用
- **时间戳同步**：简单可靠，放弃事件溯源
- **LWW策略**：Last Write Wins冲突处理
- **Cloudflare**：Workers + D1 + R2全家桶
- **SQLite FTS5**：全文搜索 + 拼音支持
- **Tauri**：跨平台桌面应用

### ❌ 放弃的方案（过度设计）
- 事件溯源系统（Event Sourcing）
- CRDT复杂冲突解决
- KV缓存层
- 快照系统
- 多租户特性

### 为什么简化？
> 针对**个人使用**场景，原方案过于复杂。简化后的方案开发周期从10周缩短至5周，维护成本大幅降低，同时满足所有核心需求。

---

## 📊 技术栈总览

```
┌─────────────────────────────────────────┐
│           前端技术栈                    │
├─────────────────────────────────────────┤
│ Tauri 2.x         框架                  │
│ React 18          UI库                  │
│ TypeScript        类型安全              │
│ Zustand           状态管理              │
│ shadcn/ui         UI组件                │
│ TailwindCSS       样式                  │
│ pinyin-pro        拼音支持              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           后端技术栈                    │
├─────────────────────────────────────────┤
│ Cloudflare Workers    API层            │
│ Hono                  路由框架          │
│ Cloudflare D1         数据库(SQLite)    │
│ Cloudflare R2         对象存储          │
│ JWT                   认证              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           本地技术栈                    │
├─────────────────────────────────────────┤
│ SQLite                本地数据库        │
│ SQLite FTS5           全文搜索          │
│ Rust                  Tauri后端         │
│ Sharp/Image           图片处理          │
└─────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 开发者入口

```bash
# 1. 克隆项目
git clone <repo-url>
cd meme

# 2. 安装依赖
pnpm install

# 3. 启动开发环境
pnpm dev
```

### 阅读建议

**如果你是新加入的开发者**：
1. ⏰ 先花30分钟阅读 [ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md)
2. ⏰ 再花15分钟查看 [ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md)
3. 🎯 根据当前开发阶段，深入阅读对应的功能文档

**如果你在评估技术方案**：
1. 📖 阅读主文档的"设计原则"和"技术栈选择"
2. 🔍 对比 [ARCHITECTURE.md](./ARCHITECTURE.md)（废弃方案）了解简化理由
3. ⚖️ 查看 [ARCHITECTURE_sync_and_api.md](./ARCHITECTURE_sync_and_api.md) 的冲突处理策略

---

## 📈 开发进度

### 当前阶段：阶段1 - 本地MVP功能 🔄

- [x] 项目初始化
- [x] Cloudflare Workers基础设置
- [x] 认证系统
- [ ] 本地SQLite实现 ← **当前进行中**
- [ ] 导入功能
- [ ] 搜索引擎
- [ ] UI界面

详见 [ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md)

---

## ❓ 常见问题

### Q1: 为什么放弃原来的复杂方案？
**A**: 原方案使用事件溯源、CRDT等企业级技术，适合多用户高并发场景。但本工具主要面向**个人使用**，这些复杂机制是过度设计，会大幅增加开发和维护成本。

### Q2: 简化后是否影响功能？
**A**: 不影响。所有核心功能（导入、搜索、同步、分享）都得到保留。只是同步机制从复杂的事件溯源简化为时间戳对比，更易理解和维护。

### Q3: 如何处理同步冲突？
**A**: 采用 **Last Write Wins (LWW)** 策略。个人使用场景下，真正的冲突极少发生。详见 [ARCHITECTURE_sync_and_api.md](./ARCHITECTURE_sync_and_api.md)。

### Q4: 为什么选择Cloudflare？
**A**: 
- ✅ 免费额度充足（R2 10GB、D1 5GB、Workers 10万请求/天）
- ✅ 全球边缘网络加速
- ✅ SQLite兼容，本地和云端统一
- ✅ 个人使用成本几乎为零

### Q5: 如何贡献代码？
**A**: 
1. Fork项目
2. 查看 [ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md) 认领任务
3. 遵循相应功能文档的实现方案
4. 提交PR

---

## 📝 文档更新记录

- **2025-01-14**: 创建拆分文档，采用简化方案A
- **2024-12-12**: 初始复杂方案（已废弃）

---

## 📞 联系方式

- **GitHub Issues**: 提交Bug和功能建议
- **Discussions**: 技术讨论和问答

---

**提示**: 本文档作为导航索引，不包含具体技术实现。请根据需要查看对应的详细文档。

*最后更新：2025-01-14*
