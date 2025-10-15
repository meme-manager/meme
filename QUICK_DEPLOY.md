# 🚀 一键部署指南

## 快速开始

只需一条命令,即可部署到 Cloudflare!

```bash
cd apps/workers
./deploy.sh
```

## 前置要求

- ✅ Node.js 18+ (已安装)
- ✅ Cloudflare 账号 (免费注册: https://dash.cloudflare.com/sign-up)
- ✅ 网络连接

## 部署步骤

### 1. 进入 workers 目录

```bash
cd apps/workers
```

### 2. 运行部署脚本

```bash
./deploy.sh
```

### 3. 按照提示操作

脚本会自动完成:

1. ✅ **检查依赖** - 确保环境正确
2. ✅ **安装依赖** - 自动安装 npm 包
3. ✅ **登录 Cloudflare** - 浏览器打开授权页面
4. ✅ **创建 D1 数据库** - 自动创建并配置
5. ✅ **运行数据库迁移** - 初始化表结构
6. ✅ **创建 R2 存储桶** - 用于存储图片
7. ✅ **生成 JWT 密钥** - 自动生成并设置
8. ✅ **部署 Workers** - 发布到 Cloudflare

### 4. 完成!

部署成功后,你会看到:

```
╔════════════════════════════════════════════════════════╗
║                  🎉 部署成功!                          ║
╚════════════════════════════════════════════════════════╝

[INFO] Workers URL: https://meme-api.your-subdomain.workers.dev

[INFO] 下一步操作:
  1. 在桌面应用的设置中配置服务器地址
  2. 输入设备名称并登录
  3. 开始使用云同步功能!
```

## 在应用中使用

### 1. 打开桌面应用

启动表情包管理工具

### 2. 打开设置

点击右上角的 ⚙️ 设置按钮

### 3. 配置云同步

在"☁️ 云同步"部分:

- **服务器地址**: 粘贴部署脚本显示的 Workers URL
- **设备名称**: 输入你的设备名称 (例如: 我的 MacBook Pro)

### 4. 登录

点击"🚀 登录并启用云同步"

### 5. 开始同步

点击"🔄 立即同步"开始同步你的表情包!

## 本地开发

如果想在本地测试:

```bash
cd apps/workers
npm run dev
```

然后在应用中使用: `http://localhost:8787`

## 更新部署

如果代码有更新,重新运行部署脚本即可:

```bash
./deploy.sh
```

脚本会自动检测已存在的资源,只更新必要的部分。

## 查看日志

实时查看 Workers 日志:

```bash
cd apps/workers
npx wrangler tail
```

## 管理资源

### 查看数据库

```bash
# 列出所有数据库
npx wrangler d1 list

# 查询数据
npx wrangler d1 execute meme-db --command="SELECT * FROM users LIMIT 10"
```

### 查看存储桶

```bash
# 列出所有存储桶
npx wrangler r2 bucket list

# 查看存储桶内容
npx wrangler r2 object list meme-storage
```

### 查看部署历史

```bash
npx wrangler deployments list
```

## 删除部署

如果需要删除所有资源:

```bash
# 删除 Workers
npx wrangler delete

# 删除 D1 数据库
npx wrangler d1 delete meme-db

# 删除 R2 存储桶
npx wrangler r2 bucket delete meme-storage
```

## 常见问题

### Q: 部署失败怎么办?

A: 检查错误信息:
1. 确保已登录 Cloudflare
2. 检查网络连接
3. 查看是否有权限问题
4. 重新运行 `./deploy.sh`

### Q: 如何更新 JWT 密钥?

A: 重新生成并设置:

```bash
# 生成新密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 设置密钥
echo "新密钥" | npx wrangler secret put JWT_SECRET
```

### Q: 如何回滚到之前的版本?

A: 查看部署历史并回滚:

```bash
# 查看历史
npx wrangler deployments list

# 回滚到指定版本
npx wrangler rollback [deployment-id]
```

### Q: 数据库迁移失败?

A: 手动执行迁移:

```bash
npx wrangler d1 execute meme-db --file=./migrations/0001_init.sql --remote
```

### Q: 如何查看配额使用情况?

A: 登录 Cloudflare Dashboard:
- D1: https://dash.cloudflare.com/d1
- R2: https://dash.cloudflare.com/r2
- Workers: https://dash.cloudflare.com/workers

## 成本说明

Cloudflare 免费额度:

- ✅ **Workers**: 100,000 请求/天
- ✅ **D1**: 5GB 存储 + 500万读/天
- ✅ **R2**: 10GB 存储 + 1000万读/月

个人使用完全免费! 🎉

## 技术支持

遇到问题?

1. 查看 [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md) 详细文档
2. 查看 [WRANGLER_SETUP_FIX.md](../../WRANGLER_SETUP_FIX.md) 常见问题
3. 提交 GitHub Issue

## 脚本说明

`deploy.sh` 脚本功能:

- 🔍 **智能检测** - 自动检测已存在的资源
- 🔄 **幂等性** - 可以重复运行,不会重复创建
- 🎨 **彩色输出** - 清晰的进度提示
- ⚠️ **错误处理** - 遇到错误自动停止
- 📝 **详细日志** - 记录每一步操作

## 下一步

部署完成后,你可以:

1. ✅ 使用云同步功能
2. ✅ 创建和分享表情包
3. ✅ 多设备同步
4. ✅ 查看配额使用情况

享受你的表情包管理工具吧! 🎉
