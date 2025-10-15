# 🚀 一键部署按钮配置指南

## Cloudflare Workers 一键部署

我们在 README 中添加了 Cloudflare Workers 的一键部署按钮:

```markdown
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/meme-manager/meme)
```

## 使用方法

### 用户端

用户只需要:

1. 点击 README 中的 "Deploy to Cloudflare Workers" 按钮
2. 登录 Cloudflare 账号
3. 按照向导完成部署
4. 获取 Workers URL

### 部署流程

点击按钮后,Cloudflare 会:

1. **Fork 仓库** - 自动 fork 到用户的 GitHub 账号
2. **连接 Cloudflare** - 连接用户的 Cloudflare 账号
3. **创建资源** - 自动创建 D1、R2 等资源
4. **部署 Workers** - 自动部署代码
5. **设置 CI/CD** - 配置自动部署

## 配置文件

### 1. wrangler.toml

主配置文件,定义 Workers 的基本配置:

```toml
name = "meme-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "meme-db"

[[r2_buckets]]
binding = "R2"
bucket_name = "meme-storage"
```

### 2. wrangler.json (可选)

JSON 格式的配置,用于一键部署:

```json
{
  "name": "meme-api",
  "main": "src/index.ts",
  "d1_databases": [...],
  "r2_buckets": [...]
}
```

### 3. .github/workflows/deploy.yml

GitHub Actions 配置,用于自动部署:

```yaml
name: Deploy to Cloudflare Workers
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/wrangler-action@v3
```

## 所需的 Secrets

用户需要在 GitHub 仓库设置中添加:

### CLOUDFLARE_API_TOKEN

1. 登录 Cloudflare Dashboard
2. 进入 "My Profile" → "API Tokens"
3. 点击 "Create Token"
4. 选择 "Edit Cloudflare Workers" 模板
5. 复制生成的 Token
6. 在 GitHub 仓库设置中添加 Secret: `CLOUDFLARE_API_TOKEN`

### CLOUDFLARE_ACCOUNT_ID

1. 登录 Cloudflare Dashboard
2. 在右侧找到 "Account ID"
3. 复制 Account ID
4. 在 GitHub 仓库设置中添加 Secret: `CLOUDFLARE_ACCOUNT_ID`

## 手动部署

如果一键部署不可用,用户可以使用我们的部署脚本:

```bash
cd apps/workers
./deploy.sh
```

## 部署后配置

部署完成后,用户需要:

1. **获取 Workers URL**
   ```
   https://meme-api.<subdomain>.workers.dev
   ```

2. **运行数据库迁移**
   ```bash
   npx wrangler d1 execute meme-db --file=./migrations/0001_init.sql --remote
   ```

3. **设置 JWT 密钥**
   ```bash
   echo "your-secret-key" | npx wrangler secret put JWT_SECRET
   ```

4. **在应用中配置**
   - 打开桌面应用
   - 设置 → 云同步
   - 输入 Workers URL
   - 登录并启用同步

## 自动部署

配置好 GitHub Actions 后,每次推送到 master 分支都会自动部署:

```bash
git add .
git commit -m "update: 更新功能"
git push origin master
```

GitHub Actions 会自动:
1. 检测到代码变更
2. 运行测试
3. 部署到 Cloudflare
4. 通知部署结果

## 部署状态

在 README 中可以添加部署状态徽章:

```markdown
![Deploy Status](https://github.com/meme-manager/meme/actions/workflows/deploy.yml/badge.svg)
```

## 故障排查

### 部署失败

1. **检查 Secrets** - 确保 API Token 和 Account ID 正确
2. **检查权限** - API Token 需要有 Workers 编辑权限
3. **检查配置** - wrangler.toml 配置是否正确
4. **查看日志** - 在 GitHub Actions 中查看详细日志

### 资源创建失败

1. **D1 数据库** - 确保账号有 D1 权限
2. **R2 存储桶** - 确保账号有 R2 权限
3. **配额限制** - 检查是否超出免费额度

### 迁移失败

手动运行迁移:

```bash
npx wrangler d1 execute meme-db --file=./migrations/0001_init.sql --remote
```

## 优势

### 对用户
- ✅ **一键部署** - 无需复杂配置
- ✅ **自动化** - 自动创建所有资源
- ✅ **可视化** - 清晰的部署向导
- ✅ **免费** - 使用 Cloudflare 免费额度

### 对开发者
- ✅ **降低门槛** - 用户更容易上手
- ✅ **减少支持** - 减少部署相关的问题
- ✅ **自动更新** - CI/CD 自动部署更新
- ✅ **标准化** - 统一的部署流程

## 替代方案

如果 Cloudflare 一键部署不可用,可以考虑:

### 1. Vercel 部署

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/meme-manager/meme)
```

### 2. Netlify 部署

```markdown
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/meme-manager/meme)
```

### 3. Railway 部署

```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/meme-manager/meme)
```

## 文档链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [一键部署指南](https://developers.cloudflare.com/workers/platform/deploy-button/)

## 总结

一键部署按钮让用户能够:
- 🚀 **3 分钟完成部署**
- 🔧 **零配置开始使用**
- 📊 **可视化部署流程**
- 🔄 **自动化更新部署**

这大大降低了使用门槛,让更多用户能够轻松使用云同步功能!
