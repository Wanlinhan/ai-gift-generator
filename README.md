# AI 图片礼物生成器

一个本地可运行的 AI 图片礼物生成网站。前端负责输入提示词、展示状态和预览结果；后端读取本地 `.env` 中的火山引擎 Ark API Key 并代理图片生成请求，避免把密钥暴露到浏览器。

## 本地运行

前提：安装 Docker Desktop。

```bash
git clone https://github.com/你的用户名/你的项目名.git
cd 你的项目名
cp .env.example .env
```

编辑 `.env`，填入自己的火山引擎 Ark API Key：

```env
ARK_API_KEY=你的火山引擎_Ark_API_Key
ARK_BASE_URL=https://ark.cn-beijing.volces.com
ARK_MODEL=doubao-seedream-5-0-260128
```

启动：

```bash
docker compose up --build
```

打开：

```txt
http://localhost:3000
```

## 开发运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问：

```txt
http://localhost:3000
```

## 接口流程

- `POST /api/generate`：调用 Seedream 5.0 生成 AI 图片，并返回图片 URL。

浏览器只请求本项目自己的接口，真实 API Key 只存在于 `.env` 或 `.env.local`。
