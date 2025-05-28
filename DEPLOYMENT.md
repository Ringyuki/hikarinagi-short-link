# 部署指南

本项目支持多种 SaaS 平台部署，以下是详细的部署说明。

## 🚀 支持的平台

### 1. Vercel（推荐）

**优点：**
- 原生支持 Next.js 15
- 部署简单快速
- 自动 HTTPS
- 全球 CDN

**限制：**
- SQLite 数据库在每次部署后会重置
- 适合演示和测试环境

**部署步骤：**
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署
vercel --prod
```

**环境变量设置：**
在 Vercel 控制台设置以下环境变量：
- `NODE_ENV=production`
- `NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app`

### 2. Railway

**优点：**
- 支持持久化存储
- SQLite 数据库不会丢失
- 适合生产环境

**部署步骤：**
1. 连接 GitHub 仓库到 Railway
2. 设置环境变量
3. 自动部署

### 3. Netlify

**部署步骤：**
```bash
# 1. 安装 Netlify CLI
npm i -g netlify-cli

# 2. 登录
netlify login

# 3. 部署
netlify deploy --prod
```

### 4. 自托管（Docker）

**Dockerfile：**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

**部署命令：**
```bash
# 构建镜像
docker build -t shortlink-app .

# 运行容器
docker run -d -p 3001:3001 -v $(pwd)/data:/app/data shortlink-app
```

## ⚠️ 重要注意事项

### 数据持久化问题

**Vercel/Netlify 等无服务器平台：**
- SQLite 文件存储在临时目录
- 每次部署会重置数据库
- 仅适合演示和测试

**解决方案：**
1. 使用 Railway 等支持持久化的平台
2. 迁移到 PostgreSQL/MySQL（需要修改代码）
3. 使用外部数据库服务

### 环境变量配置

创建 `.env.local` 文件：
```env
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 默认管理员账号

- 用户名：`admin`
- 密码：`admin123`
- **部署后请立即修改密码！**

## 🔧 生产环境优化

### 1. 安全配置
- 修改默认管理员密码
- 设置强密码策略
- 启用 HTTPS

### 2. 性能优化
- 启用数据库 WAL 模式
- 设置适当的缓存策略
- 优化数据库索引

### 3. 监控和日志
- 添加错误监控
- 设置访问日志
- 监控数据库性能

## 📝 部署检查清单

- [ ] 环境变量已设置
- [ ] 数据库路径正确
- [ ] 默认管理员账号可用
- [ ] 短链接生成功能正常
- [ ] 统计功能工作正常
- [ ] 管理后台可访问
- [ ] 密码已修改

## 🆘 常见问题

**Q: 部署后数据库为空？**
A: 检查数据库路径和权限，确保目录可写。

**Q: 管理后台无法访问？**
A: 检查路由配置和中间件设置。

**Q: 短链接无法跳转？**
A: 检查域名配置和 API 路由。

**Q: 数据在重新部署后丢失？**
A: 使用支持持久化存储的平台，或迁移到外部数据库。 