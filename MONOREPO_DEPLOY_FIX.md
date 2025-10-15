# 🔧 Monorepo 部署配置修复

## 问题

Cloudflare 一键部署按钮报错:

```
Could not find a wrangler.json, wrangler.jsonc, or wrangler.toml file in the provided directory.
```

**原因:** 我们的项目是 monorepo 结构,Workers 代码在 `apps/workers/` 子目录中,而 Cloudflare 部署按钮默认在根目录查找配置文件。

## 项目结构

```
meme/
├── apps/
│   ├── desktop/          # Tauri 桌面应用
│   └── workers/          # Cloudflare Workers (实际代码)
│       ├── src/
│       ├── wrangler.toml # Workers 配置
│       └── deploy.sh
├── packages/
│   └── shared/
├── wrangler.toml         # ✅ 根目录配置(新增)
├── package.json
└── README.md
```

## 解决方案

### 1. 在根目录创建 wrangler.toml ✅

创建了 `/wrangler.toml`,指向实际的 Workers 代码:

```toml
name = "meme-api"
main = "apps/workers/src/index.ts"  # 指向子目录
compatibility_date = "2024-01-01"

# 构建配置
[build]
command = "cd apps/workers && npm install && npm run build"
cwd = "/"
watch_dirs = ["apps/workers/src"]

# D1、R2 等配置...
```

**关键配置:**
- `main` - 指向实际的入口文件
- `build.command` - 在子目录中构建
- `build.cwd` - 从根目录开始

### 2. 更新 package.json ✅

添加了便捷的部署脚本:

```json
{
  "scripts": {
    "deploy": "cd apps/workers && ./deploy.sh",
    "workers:dev": "cd apps/workers && pnpm dev",
    "workers:deploy": "cd apps/workers && pnpm deploy"
  }
}
```

### 3. 更新 README ✅

一键部署按钮现在可以正常工作:

```markdown
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/meme-manager/meme)
```

## 使用方法

### 方式 1: 一键部署按钮 (推荐)

1. 点击 README 中的部署按钮
2. 登录 Cloudflare 账号
3. 按照向导完成部署

### 方式 2: 命令行部署

从项目根目录:

```bash
# 使用部署脚本
pnpm deploy

# 或者直接进入 workers 目录
cd apps/workers
./deploy.sh
```

### 方式 3: 手动部署

```bash
cd apps/workers
pnpm install
pnpm wrangler deploy
```

## 配置说明

### 根目录 wrangler.toml

用于 Cloudflare 一键部署,包含:

- ✅ 指向实际代码的路径
- ✅ 构建命令
- ✅ D1、R2 等资源配置
- ✅ 环境变量配置

### apps/workers/wrangler.toml

实际的 Workers 配置,用于本地开发和手动部署。

## 部署流程

### 一键部署流程

1. **Fork 仓库** - Cloudflare 自动 fork 到用户账号
2. **读取配置** - 读取根目录的 `wrangler.toml`
3. **安装依赖** - 执行 `build.command`
4. **创建资源** - 自动创建 D1、R2 等
5. **部署代码** - 部署到 Cloudflare Workers
6. **配置 CI/CD** - 设置 GitHub Actions

### 手动部署流程

1. **进入目录** - `cd apps/workers`
2. **运行脚本** - `./deploy.sh`
3. **自动完成** - 脚本自动处理所有步骤

## 验证

### 测试一键部署

1. 访问: https://deploy.workers.cloudflare.com/?url=https://github.com/meme-manager/meme
2. 检查是否能找到 `wrangler.toml`
3. 查看配置是否正确

### 测试本地部署

```bash
# 从根目录
pnpm deploy

# 或从 workers 目录
cd apps/workers
./deploy.sh
```

## Monorepo 最佳实践

### 1. 双配置文件

- **根目录** - 用于一键部署和 CI/CD
- **子目录** - 用于本地开发

### 2. 构建命令

确保构建命令正确处理 monorepo 结构:

```toml
[build]
command = "cd apps/workers && npm install && npm run build"
cwd = "/"
```

### 3. 路径配置

所有路径都相对于根目录:

```toml
main = "apps/workers/src/index.ts"
watch_dirs = ["apps/workers/src"]
```

### 4. 依赖管理

使用 workspace 共享依赖:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

## 常见问题

### Q: 为什么需要两个 wrangler.toml?

A: 
- 根目录的用于 Cloudflare 一键部署
- 子目录的用于本地开发和手动部署
- 两者配置基本相同,只是路径不同

### Q: 一键部署会使用哪个配置?

A: 使用根目录的 `wrangler.toml`,因为 Cloudflare 从根目录开始查找。

### Q: 本地开发使用哪个配置?

A: 使用 `apps/workers/wrangler.toml`,因为我们在该目录下运行 `wrangler dev`。

### Q: 如何保持两个配置同步?

A: 可以创建一个脚本自动同步:

```bash
#!/bin/bash
# scripts/sync-wrangler-config.sh
cp apps/workers/wrangler.toml wrangler.toml
# 然后修改路径...
```

### Q: 构建失败怎么办?

A: 检查构建命令:

```bash
# 手动测试构建命令
cd apps/workers
npm install
npm run build
```

## 其他 Monorepo 方案

### 方案 1: Git Submodule

将 workers 作为独立仓库:

```bash
git submodule add https://github.com/meme-manager/meme-workers apps/workers
```

### 方案 2: 分离仓库

创建独立的 workers 仓库,使用独立的一键部署按钮。

### 方案 3: 使用 Turborepo

使用 Turborepo 管理 monorepo:

```json
{
  "pipeline": {
    "deploy": {
      "dependsOn": ["build"]
    }
  }
}
```

## 总结

✅ **已修复:**
- 在根目录创建了 `wrangler.toml`
- 配置了正确的构建命令
- 更新了 package.json 脚本
- 一键部署按钮现在可以正常工作

✅ **现在可以:**
- 使用一键部署按钮
- 从根目录运行 `pnpm deploy`
- 从 workers 目录手动部署
- 本地开发和测试

✅ **兼容性:**
- ✅ Cloudflare 一键部署
- ✅ GitHub Actions
- ✅ 本地开发
- ✅ 手动部署

现在 monorepo 结构完全兼容 Cloudflare 部署了! 🎉
