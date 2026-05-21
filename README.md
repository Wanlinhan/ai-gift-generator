# AI 礼物生成器

一个本地可运行的 AI 图片/视频礼物生成网站。用户输入礼物主题提示词后，项目后端会调用火山引擎 Ark：图片模式使用 Seedream，视频模式使用 Seedance，并在页面中预览结果。

项目已经做了密钥隔离：浏览器不会直接请求火山接口，`ARK_API_KEY` 只放在本地 `.env` 或 `.env.local` 中，由 Next.js 后端接口读取。

## 功能

- 文本提示词生成图片礼物
- 文本提示词生成视频礼物
- 默认从 prompt 自动识别比例，例如 `16:9`、`9:16`、`横图`、`竖图`、`手机壁纸`、`方图`
- 图片直出预览
- 视频异步任务创建、状态轮询和预览
- 橙色卡片式双栏 UI
- 状态显示：`READY`、`GENERATING`、`QUEUED`、`RUNNING`、`SUCCESS`、`FAIL`
- 后端代理火山 Ark API，避免在前端暴露 API Key
- Docker 本地部署
- 支持本地开发模式运行

## 技术栈

- Next.js 15
- React 19
- TypeScript
- lucide-react
- Docker / Docker Compose
- 火山引擎 Ark Seedream / Seedance

## 环境变量

复制示例文件：

```bash
cp .env.example .env
```

填写自己的火山引擎 Ark API Key：

```env
ARK_API_KEY=your_volcengine_ark_api_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com
ARK_IMAGE_MODEL=doubao-seedream-5-0-260128
ARK_VIDEO_MODEL=doubao-seedance-2-0-260128
```

图片和视频模型需要分别在 Ark Console 开通。只开通图片模型时，图片模式可用；视频模式会提示视频模型未开通。

不要提交 `.env` 或 `.env.local`。项目已在 `.gitignore` 中忽略这些文件。

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


## Prompt 比例识别

页面不再提供单独的比例按钮。默认从用户 prompt 中识别比例，并转换为 Ark 的参数：

- `16:9`、`横图`、`横版`、`宽屏` -> 图片 `2560x1440`，视频 `16:9`
- `9:16`、`竖图`、`竖版`、`手机壁纸`、`手机海报` -> 图片 `1440x2560`，视频 `9:16`
- `4:3` -> 图片 `2304x1728`，视频 `4:3`
- `3:4`、`竖版海报` -> 图片 `1728x2304`，视频 `3:4`
- `1:1`、`方图`、`正方形`、`头像` -> 图片 `2048x2048`，视频 `1:1`

识别不到比例时，图片不传 `size`，视频不传 `ratio`，由 Ark 使用默认配置。

## API

### POST `/api/generate`

图片生成接口。

请求体：

```json
{
  "prompt": "黑暗主题、金色点缀、透明质感的游戏道具摆件，16:9 横图",
  "watermark": false
}
```

成功响应：

```json
{
  "status": "SUCCESS",
  "resultUrl": "https://..."
}
```

### POST `/api/video/generate`

视频生成任务创建接口。

请求体：

```json
{
  "prompt": "黑金色游戏道具缓慢旋转，16:9 横版视频",
  "duration": 5,
  "generateAudio": true
}
```

成功响应：

```json
{
  "taskId": "cgt-...",
  "status": "QUEUED"
}
```

### GET `/api/video/tasks/[taskId]`

视频任务状态查询接口。

成功响应：

```json
{
  "taskId": "cgt-...",
  "status": "RUNNING",
  "resultUrl": null
}
```

任务完成后：

```json
{
  "taskId": "cgt-...",
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

说明当前火山引擎 Ark 账号没有开通对应模型。图片模式需要开通 `ARK_IMAGE_MODEL`，视频模式需要开通 `ARK_VIDEO_MODEL`。

### 为什么 prompt 写比例仍可能不准

项目会先从 prompt 中解析比例并传给 Ark 的 `size` 或 `ratio` 参数。识别不到时不会传比例参数，最终比例由 Ark 默认配置决定。

## 当前限制

- 不包含登录系统
- 不保存生成历史
- 不包含数据库
- 不包含对象存储
- 不提供公共额度共享，使用者需要填写自己的 Ark API Key
