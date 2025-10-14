# 开发任务清单

> 按照简化架构方案A进行开发，参考 ARCHITECTURE_INDEX.md

## 🎯 当前阶段：阶段1 - 本地MVP功能

### 阶段0已完成 ✅
- [x] 架构文档编写和拆分
- [x] 清理旧的复杂实现代码
- [x] 创建新的目录结构
- [x] 数据库Schema和操作封装
- [x] Tauri后端命令实现
- [x] 资产管理器和状态管理
- [x] 前端编译测试

### 当前任务 🔄

#### 1. UI组件开发（优先级：P0）✅
- [x] 基础布局组件
  - [x] `components/layout/Header.tsx` - 顶部栏
  - [x] `components/layout/Sidebar.tsx` - 侧边栏
  - [x] `components/layout/MainContent.tsx` - 主内容区
  
- [x] 资产相关组件
  - [x] `components/asset/AssetCard.tsx` - 资产卡片
  - [x] `components/asset/AssetGrid.tsx` - 网格视图
  - [x] `components/asset/DropZone.tsx` - 拖拽导入区域
  
- [x] 基础UI组件
  - [x] `components/ui/Button.tsx`
  - [ ] `components/ui/Input.tsx`
  - [ ] `components/ui/Dialog.tsx`

#### 2. 导入功能UI（优先级：P0）🔄
- [x] 拖拽导入界面
- [ ] URL导入对话框
- [ ] 剪贴板监听
- [ ] 批量导入进度显示
- [ ] 导入成功/失败提示

#### 3. 搜索功能（优先级：P1）
- [ ] 搜索框组件
- [ ] 搜索引擎实现
- [ ] 拼音搜索支持
- [ ] 高级筛选面板

---

## 📅 本周任务 (Week 1)

### 周一-周二：架构和数据库 ✅
- [x] 编写架构文档
- [x] 编写 SQLite 初始化脚本
- [x] 实现基础的 CRUD 操作
- [x] Tauri后端命令实现

### 周三-周五：UI开发 ✅
- [x] 实现基础布局组件
- [x] 实现拖拽导入UI
- [x] 实现资产网格视图
- [x] 前端构建测试
- [ ] Tauri应用运行测试

---

## 🚀 下周任务 (Week 2)

### 搜索和标签功能
- [ ] 搜索引擎完整实现
- [ ] 标签管理UI
- [ ] 关键词管理
- [ ] 集合管理基础功能

参考：ARCHITECTURE_search.md

---

## 📝 代码规范

### 文件命名
- 组件：PascalCase (例如：`AssetCard.tsx`)
- 工具函数：camelCase (例如：`calculateHash.ts`)
- 类型定义：PascalCase (例如：`Asset.ts`)

### 提交信息
遵循 Conventional Commits：
- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

### 代码注释
- 所有公开函数必须有 JSDoc 注释
- 复杂逻辑需要行内注释
- 引用架构文档的相关章节

---

## 🔗 相关文档

开发时请参考：
- [ARCHITECTURE_INDEX.md](./ARCHITECTURE_INDEX.md) - 文档导航
- [ARCHITECTURE_simplified.md](./ARCHITECTURE_simplified.md) - 核心架构
- [ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md) - 开发路线图

---

## ⚠️ 注意事项

1. **不要实现事件溯源**：已废弃，使用简单的时间戳同步
2. **不要使用KV缓存**：个人使用场景，D1直查即可
3. **优先本地功能**：云同步是可选功能，先完成本地MVP
4. **保持简单**：避免过度设计，够用就好

---

*最后更新：2025-01-14*
