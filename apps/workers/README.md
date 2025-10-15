# Meme Manager - Cloudflare Workers API

表情包管理工具的云端 API，基于 Cloudflare Workers、D1 和 R2 构建。

## 功能特性

- ✅ 设备注册和 JWT 认证
- ✅ 云同步（Pull/Push）
- ✅ 分享功能（创建/查看/删除）
- ✅ 配额管理和限流
- ✅ R2 文件访问

## 技术栈

- **Cloudflare Workers** - 边缘计算
- **D1** - SQLite 数据库
- **R2** - 对象存储
- **KV** - 键值存储（限流）
- **Hono** - 轻量级 Web 框架
- **jose** - JWT 认证

## 开发环境设置

### 1. 安装依赖

```bash
cd apps/workers
npm install
```

### 2. 创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create meme-db

# 复制返回的 database_id 到 wrangler.toml
```

### 3. 运行数据库迁移

```bash
npm run db:migrate
```

### 4. 创建 R2 存储桶

```bash
# 创建生产环境存储桶
npx wrangler r2 bucket create meme-storage

# 创建预览环境存储桶
npx wrangler r2 bucket create meme-storage-preview
```

### 5. 创建 KV 命名空间

```bash
# 创建 KV 命名空间
npx wrangler kv:namespace create "KV"

# 复制返回的 id 到 wrangler.toml
```

### 6. 设置环境变量

创建 `.dev.vars` 文件：

```bash
JWT_SECRET=your-secret-key-here
```

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 7. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:8787

## API 文档

### 认证接口

#### POST /auth/device-register
设备注册/登录

**请求：**
```json
{
  "device_id": "uuid",
  "device_name": "MacBook Pro",
  "device_type": "desktop",
  "platform": "macos"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user_id": "uuid",
    "device_id": "uuid",
    "expires_at": 1234567890
  }
}
```

#### GET /auth/me
获取当前用户信息（需要认证）

### 同步接口

#### POST /sync/pull
拉取云端更新（需要认证）

**请求：**
```json
{
  "since": 1234567890
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "assets": [...],
    "tags": [...],
    "asset_tags": [...],
    "settings": [...],
    "server_timestamp": 1234567890,
    "total_count": 10
  }
}
```

#### POST /sync/push
推送本地更新（需要认证）

**请求：**
```json
{
  "assets": [...],
  "tags": [...],
  "asset_tags": [...],
  "settings": [...]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "synced_count": 10,
    "server_timestamp": 1234567890
  }
}
```

### 分享接口

#### POST /share/create
创建分享（需要认证）

**请求：**
```json
{
  "asset_ids": ["id1", "id2"],
  "title": "我的表情包",
  "description": "描述",
  "expires_in": 604800,
  "max_downloads": 100,
  "password": "可选密码"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "share_id": "abc123",
    "share_url": "https://api.meme.app/s/abc123",
    "expires_at": 1234567890
  }
}
```

#### GET /s/:shareId
查看分享

**查询参数：**
- `password` - 如果分享有密码保护

**响应：**
```json
{
  "success": true,
  "data": {
    "title": "我的表情包",
    "description": "描述",
    "assets": [
      {
        "id": "uuid",
        "file_name": "image.png",
        "mime_type": "image/png",
        "width": 500,
        "height": 500,
        "thumb_url": "https://...",
        "download_url": "https://..."
      }
    ],
    "expires_at": 1234567890,
    "view_count": 10
  }
}
```

#### GET /share/list
获取我的分享列表（需要认证）

#### DELETE /share/:shareId
删除分享（需要认证）

### 配额接口

#### GET /quota
获取配额信息（需要认证）

**响应：**
```json
{
  "success": true,
  "data": {
    "assets": {
      "used": 100,
      "limit": 2000,
      "percentage": 5
    },
    "storage": {
      "used": 104857600,
      "limit": 1073741824,
      "percentage": 10
    },
    "shares": {
      "used": 5,
      "limit": 100,
      "percentage": 5
    }
  }
}
```

### R2 文件访问

#### GET /r2/*
获取 R2 文件（公开访问）

示例：
- `/r2/shared/abc123/image.png`
- `/r2/shared/abc123/image_thumb.webp`

## 部署

### 部署到生产环境

```bash
npm run deploy
```

### 设置生产环境变量

```bash
# 设置 JWT 密钥
npx wrangler secret put JWT_SECRET
```

## 配额限制

- 每用户最多 2000 张图片
- 每用户最多 1GB 存储
- 每用户最多 100 个分享
- 每天最多创建 10 个分享
- 每 IP 每小时最多 1000 请求

## 监控

查看日志：

```bash
npm run tail
```

## 数据库管理

执行 SQL 查询：

```bash
npx wrangler d1 execute meme-db --command "SELECT * FROM users LIMIT 10"
```

## 故障排除

### 数据库迁移失败

```bash
# 查看数据库状态
npx wrangler d1 info meme-db

# 重新运行迁移
npm run db:migrate
```

### R2 访问失败

检查 wrangler.toml 中的 R2 绑定配置是否正确。

### JWT 验证失败

确保 `.dev.vars` 或生产环境的 `JWT_SECRET` 已正确设置。

## 开发提示

- 使用 `console.log` 进行调试，日志会显示在 `wrangler dev` 输出中
- 修改代码后会自动重新加载
- 使用 Postman 或 curl 测试 API

## License

MIT
