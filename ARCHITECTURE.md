# 表情包管理工具技术架构文档

## 1. 项目概述

### 1.1 项目目标

开发一个跨平台的表情包管理工具，让用户能够方便地管理、搜索和使用表情包。

### 1.2 核心功能

- 跨平台运行支持
- 表情包链接导入功能
- 表情包关键词管理
- 模糊搜索功能
- 跨应用拖拽使用

## 2. 方案A（本地优先 + 云同步）完善版

### 2.1 总体思路

- 本地优先：各端使用本地 SQLite 存储元数据与缩略图缓存，离线可用；图片二进制与定期快照备份存放于 Cloudflare
  R2。
- 云索引：云端维护“全局增量索引”（Cloud
  Index），以事件日志驱动（CRDT 风格）记录所有变更；客户端按事件合并，解决冲突。
- 同步：客户端以“拉增量事件 + 推本地事件”的双向同步模型工作，支持手动和定期触发。

### 2.2 云组件与存储选型

- Cloudflare R2
  - 存储图片原件与派生缩略图（建议 WEBP
    256/512 两档），以及周期性导出的本地 SQLite 快照（冷启动用）。
  - 对象路径建议：meme-assets/{hash-prefix}/{hash}.{ext}
- Cloudflare Workers
  - 提供鉴权、签名直传（presign）、索引读写 API、访问控制与速率限制；必要时做 R2 代理与缓存头优化。
- Cloudflare D1（SQLite 兼容，结构化元数据/事件日志）
  - 存放云索引事件日志与资产元数据物化视图（可选），设备会话、用户与权限。
- Cloudflare KV（可选）
  - 缓存热点游标与热门查询结果，降低 D1 压力。

### 2.3 数据模型（抽象）

- Asset: { id, contentHash, formats([png/webp/gif]),
  meta{width,height,size,sourceUrl?}, createdAt, updatedAt, tombstone? }
- Tag: { id, name, aliases[] }
- Keyword: { id, text, lang?, weight }
- 关系：
  - AssetTag: { assetId, tagId }
  - AssetKeyword: { assetId, keywordId, weight }
- OperationEvent（云索引事件）
  - { eventId, serverClock, deviceId, userId, ts, type, payload, deps[] }
  - type 示例：asset.create / asset.update.meta / asset.delete / tag.add /
    tag.remove / keyword.add / keyword.remove / relation.upsert /
    relation.delete / format.merge

### 2.4 云索引与冲突解决

- 时钟与排序
  - 客户端维护本地 lamportClock；提交事件时带上 deviceClock。
  - 服务端 Workers 为事件分配单调递增 serverClock；以 [serverClock, deviceClock]
    作为全序，入库 D1。
- 字段级合并策略
  - 标量字段：LWW（Last-Write-Wins），并记录字段版本，避免旧事件覆盖新值。
  - 集合字段（标签、关键词）：使用 OR-Set 语义，add/remove 事件可逆，按事件时序求和。
  - 删除优先：asset.delete 产生墓碑（tombstone）；墓碑后提交的引用类事件拒绝或进入孤立队列待清理。
- 并发编辑冲突
  - 同一字段并发修改时，以最新 serverClock 胜；同时在本地保留“冲突影子（shadow）”供用户查看/手动合并（例如提示两种描述文本）。
- 去重与合并
  - 以 contentHash 作为聚合键；首次出现 asset.create 建立资产；后续同 hash 的 create 归并为 format.merge 或引用计数增加。

### 2.5 同步协议

- 客户端状态：保存 lastSyncedClock（上次成功应用的 serverClock）。
- 拉取增量：GET /index?since={clock}&limit=1000 返回 { events[], nextClock
  }；客户端按序在本地事务中回放事件，更新 lastSyncedClock。
- 推送变更：POST
  /index/batch 提交本地新事件；服务端分配 serverClock 写入 D1，返回 { accepted:
  [eventId->serverClock], conflicts:[...]}。
- 快照加速：新设备先下载最新快照（GET
  /snapshot/latest），导入后再补拉 since=snapshotClock 的增量事件。
- 失败恢复：以事件重放幂等性保障（事件包含目标资源与字段版本），重复提交由服务端去重。

### 2.6 搜索与索引

- 本地：SQLite FTS5 构建倒排索引，支持拼音/模糊匹配；必要时做简繁转换。
- 云端（可选）：D1 维护物化视图支持基础筛选；热门结果缓存在 KV；前端列表懒加载缩略图。

### 2.7 权限与分享

- 私有库默认；集合可生成分享链接（带 token 与过期时间）。
- 通过 Workers 校验访问权限；访问缩略图/原图时由 Worker 代理或 302 到 R2 带合适缓存策略。

### 2.8 成本与性能

- 预生成多规格缩略图，首屏仅加载小图；列表分页与懒加载。
- 批量事件接口减少请求次数；R2 与 Workers 缓存头优化带宽。
- R2/D1/Workers/KV 均有免费层，原型阶段成本可控。

### 2.9 API 草案（示例）

- POST /auth/device-begin -> { deviceId, token }
- GET /index?since={clock}&limit={n} -> { events:[], nextClock }
- POST /index/batch -> { accepted:[{eventId, serverClock}], conflicts:[...] }
- POST /r2/presign-upload -> { url, headers, key }
- GET /asset/{id}/thumb -> 302 to R2 or proxy
- GET /snapshot/latest -> { url, snapshotClock }

### 2.10 D1 表结构（草案）

- events( eventId TEXT PRIMARY KEY, serverClock INTEGER UNIQUE, deviceId TEXT,
  userId TEXT, ts INTEGER, type TEXT, payload TEXT, -- JSON deps TEXT -- JSON
  array )
- devices(deviceId TEXT PRIMARY KEY, userId TEXT, createdAt INTEGER, lastSeenAt
  INTEGER)
- users(userId TEXT PRIMARY KEY, plan TEXT, createdAt INTEGER)
- asset_meta( assetId TEXT PRIMARY KEY, contentHash TEXT UNIQUE, formats TEXT,
  -- JSON array meta TEXT, -- JSON tombstone INTEGER DEFAULT 0, updatedAt
  INTEGER )
- index_state(userId TEXT PRIMARY KEY, lastServerClock INTEGER)
- 物化视图（可选）：asset_tag, asset_keyword 便于云端筛选/统计（由定时任务重建）

### 2.11 目录与对象命名约定

- R2 桶：meme-assets
- 路径分片：{hash[0:2]}/{hash[2:4]}/{hash}.{ext}
- 缩略图命名：{hash}@256.webp、{hash}@512.webp

### 2.12 客户端实现要点

- 事件队列：本地写操作先生成事件并落库，UI 立即响应；后台批量同步。
- 幂等与重试：事件含幂等键（eventId、contentHash）；网络失败自动退避重试。
- 冲突提示：当本地与云端出现字段冲突，保留 shadow 并在编辑面板展示差异，支持一键采用云端/本地版本。

## 3. 可执行任务清单（Roadmap）

说明：本清单依据本架构文档制定，后续开发严格按此执行，并在每个任务末尾用 [ ]/[/]
标注进度（空白/完成/进行中用 [~]）。

### 阶段0：项目初始化与规范

- 0.1 技术栈与仓库结构 [/]
  - Tauri + React + TypeScript（桌面端）；Cloudflare Workers（Hono）；R2/D1/KV。
  - 根工作区使用 pnpm
    workspace；目录：/apps/desktop、/apps/worker、/packages/shared。
  - 验收：Tauri 空壳启动；Workers 本地模拟提供 hello 接口。
- 0.2 工程规范与CI [/]
  - ESLint/Prettier、TypeScript、husky+lint-staged、commitlint、editorconfig、基础CI。
  - 验收：提交触发lint与build并通过。
- 0.3 环境与密钥管理 [/]
  - .env.example、wrangler.toml、R2/D1/KV 绑定占位；区分 dev/staging/prod。
  - 验收：本地/预发/生产配置可加载。

### 阶段1：数据模型与协议

- 1.1 共享类型与事件模型（packages/shared）[/]
  - 定义实体：Asset/Tag/Keyword/AssetTag/AssetKeyword。
  - 定义 OperationEvent 与事件枚举，zod 校验与类型守卫。
  - 验收：单元测试覆盖事件示例。
- 1.2 同步协议接口契约 [/]
  - DTO与错误码：/index（GET/POST）、/r2/presign-upload、/snapshot/latest、/auth/device-begin。
  - 产出：OpenAPI/TS 接口声明。
  - 验收：contract tests 通过。

### 阶段2：云端最小可用（Workers + D1 + R2）

- 2.1 D1 初始化迁移 [x] ✅
  - 建表：events、devices、users、asset_meta、index_state。
  - 验收：迁移可重复执行。
- 2.2 云索引读写 API [x] ✅
  - GET /index?since&limit（按 serverClock 有序分页）；POST
    /index/batch（去重与映射）。
  - 验收：并发下 serverClock 单调；重复提交幂等。
- 2.3 设备注册与鉴权 [x]
  - POST /auth/device-begin 发 token；中间件校验；基础限流。
  - 验收：未授权拒绝访问 ✅
  - 验收：未授权拒绝访问。
- 2.4 R2 直传与缩略图访问 [ ]
  - 预签名上传；GET /asset/{id}/thumb 代理或302；正确缓存头。
  - 验收：可上传并访问缩略图。
- 2.5 KV 缓存（可选）[ ]
  - 缓存 nextClock/热门查询；可观测命中率。
  - 验收：缓存生效与过期策略可控。

### 阶段3：客户端本地存储与同步（Tauri）

- 3.1 本地 SQLite 与迁移 [ ]
  - 表：assets、tags、keywords、relations、events_local、sync_state、shadow_conflicts。
  - 验收：CRUD与迁移回滚可用。
- 3.2 事件总线与本地写模型 [ ]
  - 写操作生成事件落库，乐观更新 UI。
  - 验收：离线可用并重启一致。
- 3.3 同步循环（拉/推）[ ]
  - 拉取回放事务；推送批量上报；处理映射与冲突。
  - 验收：双端并发编辑下游标正确推进。
- 3.4 冲突合并策略实现 [ ]
  - LWW + 字段版本；OR-Set；墓碑处理；shadow 可视化。
  - 验收：描述/标签/删除并发场景正确。
- 3.5 快照导入导出 [ ]
  - 导出紧缩 SQLite 上传 R2；新设备先快照再补事件。
  - 验收：冷启动 < 1 分钟（小数据集）。

### 阶段4：核心功能 UI

- 4.1 导入与拖拽 [ ]
  - 本地文件/链接导入；contentHash 去重；生成缩略图。
  - 验收：重复导入合并格式。
- 4.2 标签与关键词管理 [ ]
  - 列表/编辑/批量添加；权重与别名。
  - 验收：跨设备同步正确。
- 4.3 搜索与筛选 [ ]
  - FTS5 + 拼音/模糊；按格式/尺寸/最近使用过滤；懒加载缩略图。
  - 验收：1000+ 条查询 <100ms（离线）。
- 4.4 跨应用拖拽与剪贴板 [ ]
  - 桌面 MIME 拖拽；复制图片/链接。
  - 验收：常见 IM/文档可粘贴。

### 阶段5：性能与成本

- 5.1 缩略图与缓存策略 [ ]
  - 256/512 webp 预生成；Workers 缓存；客户端懒加载。
  - 验收：首屏带宽明显下降。
- 5.2 同步批量与退避重试 [ ]
  - 批量阈值；指数退避；离线队列持久化；故障注入。
  - 验收：弱网下最终一致。
- 5.3 监控与日志 [ ]
  - 客户端埋点与Workers日志；链路追踪。
  - 验收：可还原一次完整同步。

### 阶段6：安全与权限

- 6.1 访问控制与分享 [ ]
  - 私有库；分享链接 token+过期；Workers 校验。
  - 验收：过期后不可访问。
- 6.2 上传限制与输入校验 [ ]
  - 类型/大小限制，速率限制，拦截可疑内容。
  - 验收：违规请求被拒并记录。

### 阶段7：发布与文档

- 7.1 多平台打包与更新 [ ]
  - Tauri 打包 Win/macOS/Linux；自动更新（可选）。
  - 验收：三平台可安装运行。
- 7.2 部署与运维 [ ]
  - wrangler 部署；R2/D1/KV 绑定；域名与 SSL。
  - 验收：一键脚本在预发/生产可用。
- 7.3 用户文档与教程 [ ]
  - 使用指南、同步机制、冲突处理、隐私与数据导出。
  - 验收：新人可独立完成安装与同步。

里程碑

- M0：阶段0（1周）
- M1：阶段1-2（1-2周）
- M2：阶段3（1-2周）
- M3：阶段4（1-2周）
- M4：阶段5-7（2周）

进度标记约定

- [ ] 未开始 / [~] 进行中 / [/] 已完成
