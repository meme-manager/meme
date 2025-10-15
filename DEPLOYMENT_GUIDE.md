# Cloudflare Workers 部署指南

本指南将帮助你从零开始部署表情包管理工具的云端 API。

## 前置要求

- Cloudflare 账号（免费）
- Node.js 18+ 和 pnpm
- Git

## 步骤 1：安装 Wrangler CLI

```bash
# 全局安装 Wrangler
pnpm add -g wrangler

# 登录 Cloudflare
wrangler login
```

浏览器会打开，授权 Wrangler 访问你的 Cloudflare 账号。

## 步骤 2：创建 D1 数据库

```bash
cd apps/workers

# 创建生产环境数据库
wrangler d1 create meme-db

# 创建开发环境数据库（可选）
wrangler d1 create meme-db-dev
```

**重要**：复制返回的 `database_id`，更新 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "meme-db"
database_id = "你的-database-id-在这里"  # 粘贴这里
```

## 步骤 3：运行数据库迁移

```bash
# 应用迁移到生产数据库
wrangler d1 migrations apply meme-db

# 验证表是否创建成功
wrangler d1 execute meme-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

应该看到以下表：
- users
- devices
- assets
- tags
- asset_tags
- user_settings
- shares
- share_assets

## 步骤 4：创建 R2 存储桶

```bash
# 创建生产环境存储桶
wrangler r2 bucket create meme-storage

# 创建开发环境存储桶
wrangler r2 bucket create meme-storage-preview
```

存储桶会自动绑定到 `wrangler.toml` 中配置的名称。

## 步骤 5：创建 KV 命名空间

```bash
# 创建生产环境 KV
wrangler kv:namespace create "KV"

# 创建预览环境 KV
wrangler kv:namespace create "KV" --preview
```

**重要**：复制返回的 `id`，更新 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "KV"
id = "你的-kv-id-在这里"  # 粘贴生产环境 ID
preview_id = "你的-preview-id-在这里"  # 粘贴预览环境 ID
```

## 步骤 6：设置环境变量

生成 JWT 密钥：

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

设置生产环境密钥：

```bash
# 设置 JWT_SECRET
wrangler secret put JWT_SECRET
# 粘贴刚才生成的密钥
```

开发环境创建 `.dev.vars` 文件：

```bash
# apps/workers/.dev.vars
JWT_SECRET=你的开发环境密钥
```

**注意**：`.dev.vars` 已在 `.gitignore` 中，不会被提交。

## 步骤 7：本地测试

```bash
# 启动开发服务器
pnpm dev
```

访问 http://localhost:8787，应该看到：

```json
{
  "name": "Meme Manager API",
  "version": "1.0.0",
  "status": "ok",
  "timestamp": 1234567890
}
```

测试 API：

```bash
# 测试设备注册
curl -X POST http://localhost:8787/auth/device-register \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Test Device",
    "device_type": "desktop",
    "platform": "macos"
  }'
```

## 步骤 8：部署到生产环境

```bash
# 部署
pnpm deploy
```

部署成功后，会显示你的 Workers URL，例如：
```
https://meme-api.your-subdomain.workers.dev
```

## 步骤 9：配置自定义域名（可选）

在 Cloudflare Dashboard 中：

1. 进入 Workers & Pages
2. 选择你的 Worker (meme-api)
3. 点击 "Settings" → "Triggers"
4. 点击 "Add Custom Domain"
5. 输入域名，如 `api.yourdomain.com`

## 步骤 10：验证部署

测试生产环境 API：

```bash
# 替换为你的 Workers URL
export API_URL="https://meme-api.your-subdomain.workers.dev"

# 健康检查
curl $API_URL/health

# 测试注册
curl -X POST $API_URL/auth/device-register \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Production Test",
    "device_type": "desktop",
    "platform": "macos"
  }'
```

## 完整的 wrangler.toml 示例

```toml
name = "meme-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

workers_dev = true

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "meme-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "meme-storage"
preview_bucket_name = "meme-storage-preview"

[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
preview_id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[env.production]
name = "meme-api-production"
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "meme-db-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[env.production.r2_buckets]]
binding = "R2"
bucket_name = "meme-storage-production"

[[env.production.kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## 监控和日志

### 查看实时日志

```bash
pnpm tail
```

### 查看 Dashboard

访问 Cloudflare Dashboard：
- Workers & Pages → 你的 Worker
- 可以看到请求数、错误率、CPU 使用等

### 查询数据库

```bash
# 查看用户数
wrangler d1 execute meme-db --command "SELECT COUNT(*) FROM users"

# 查看最近的分享
wrangler d1 execute meme-db --command "SELECT * FROM shares ORDER BY created_at DESC LIMIT 10"
```

## 故障排除

### 问题 1：数据库迁移失败

```bash
# 检查数据库状态
wrangler d1 info meme-db

# 查看迁移历史
wrangler d1 migrations list meme-db

# 强制重新应用
wrangler d1 migrations apply meme-db --force
```

### 问题 2：R2 访问失败

检查 R2 绑定是否正确：
```bash
wrangler r2 bucket list
```

### 问题 3：JWT 验证失败

确保已设置 JWT_SECRET：
```bash
wrangler secret list
```

如果没有，重新设置：
```bash
wrangler secret put JWT_SECRET
```

### 问题 4：部署失败

检查 wrangler.toml 配置是否正确：
- database_id 是否填写
- kv id 是否填写
- bucket_name 是否存在

## 更新和维护

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新部署
cd apps/workers
pnpm deploy
```

### 数据库迁移

如果有新的迁移文件：

```bash
# 创建新迁移
wrangler d1 migrations create meme-db "migration_name"

# 应用迁移
wrangler d1 migrations apply meme-db
```

### 回滚

如果部署出现问题：

```bash
# 查看部署历史
wrangler deployments list

# 回滚到之前的版本
wrangler rollback [deployment-id]
```

## 成本估算

**免费额度（每月）：**
- Workers: 100,000 请求/天
- D1: 5GB 存储 + 500万读/天
- R2: 10GB 存储 + 1000万读/月
- KV: 100,000 读/天 + 1,000 写/天

**个人使用预估：**
- 1000 张图片 ≈ 500MB
- 每天 100 次同步 ≈ 1000 请求
- 完全在免费额度内 ✅

## 安全建议

1. **定期更换 JWT 密钥**
   ```bash
   wrangler secret put JWT_SECRET
   ```

2. **启用 WAF（Web Application Firewall）**
   - 在 Cloudflare Dashboard 中配置

3. **监控异常流量**
   - 设置告警规则

4. **备份数据库**
   ```bash
   wrangler d1 export meme-db --output backup.sql
   ```

## 下一步

- ✅ 部署完成
- 📱 客户端集成（下一步）
- 🔄 配置自动同步
- 🔗 实现分享功能

---

部署遇到问题？查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/) 或提交 Issue。
