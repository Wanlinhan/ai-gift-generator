# AI 图片礼物生成器

一个本地可运行的 AI 图片礼物生成网站。用户输入礼物主题提示词后，项目后端会调用火山引擎 Ark 的 Seedream 5.0 图片生成接口，返回图片 URL 并在页面中预览。

项目已经做了密钥隔离：浏览器不会直接请求火山接口，`ARK_API_KEY` 只放在本地 `.env` 或 `.env.local` 中，由 Next.js 后端接口读取。

## 功能

- 文本提示词生成图片礼物
- 支持画幅选择：自动、1:1、16:9、9:16、4:3、3:4
- 橙色卡片式双栏 UI
- 生成状态显示：`READY`、`GENERATING`、`SUCCESS`、`FAIL`
- 图片预览和打开图片链接
- 后端代理火山 Ark API，避免在前端暴露 API Key
- Docker 本地部署
- 支持本地开发模式运行

## 技术栈

- Next.js 15
- React 19
- TypeScript
- lucide-react
- Docker / Docker Compose
- 火山引擎 Ark Seedream 5.0

## 环境变量

复制示例文件：

```bash
cp .env.example .env
```

填写自己的火山引擎 Ark API Key：

```env
ARK_API_KEY=your_volcengine_ark_api_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com
ARK_MODEL=doubao-seedream-5-0-260128
```

不要提交 `.env` 或 `.env.local`。项目已在 `.gitignore` 中忽略这些文件。

## Docker 运行

适合给别人部署和本地使用。前提是安装 Docker Desktop。

```bash
git clone https://github.com/Wanlinhan/ai-gift-generator.git
cd ai-gift-generator
cp .env.example .env
```

编辑 `.env`，填入自己的 `ARK_API_KEY`，然后启动：

```bash
docker compose up --build
```

访问：

```txt
http://localhost:3000
```

停止：

```bash
docker compose down
```

## 本地开发

前提是安装 Node.js 20 或更高版本。

```bash
git clone https://github.com/Wanlinhan/ai-gift-generator.git
cd ai-gift-generator
npm install
cp .env.example .env.local
npm run dev
```

访问：

```txt
http://localhost:3000
```

生产构建检查：

```bash
npm run build
```

## API

### POST `/api/generate`

请求体：

```json
{
  "prompt": "黑暗主题、金色点缀、透明质感的游戏道具摆件",
  "size": "2560x1440",
  "watermark": false
}
```

`size` 可选。前端选择“自动”时不传 `size`；选择具体画幅时会传对应尺寸，例如 `16:9` 对应 `2560x1440`。

成功响应：

```json
{
  "status": "SUCCESS",
  "resultUrl": "https://..."
}
```

失败响应：

```json
{
  "error": "错误信息"
}
```

## 常见问题

### 提示缺少 ARK_API_KEY

说明没有创建 `.env` 或 `.env.local`，或者里面没有填写 `ARK_API_KEY`。

### 提示模型未开通

说明当前火山引擎 Ark 账号没有开通 `doubao-seedream-5-0-260128`，需要去 Ark Console 开通 Seedream 5.0 图片生成模型。

### 为什么没有任务轮询

当前版本是图片生成器，调用图片生成接口后直接返回图片 URL，不使用视频生成任务队列，也不需要 `/api/tasks` 轮询接口。

## 当前限制

- 不包含登录系统
- 不保存生成历史
- 不包含数据库
- 不包含对象存储
- 不提供公共额度共享，使用者需要填写自己的 Ark API Key
