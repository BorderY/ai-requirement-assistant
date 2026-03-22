# AI Requirement Assistant

一个保留 `Next.js` 前端、把 `/api/*` 迁到 `FastAPI` 的最小聊天原型。

## 当前架构

- `src/app/page.tsx`：聊天页面与交互
- `next.config.ts`：把 `/api/:path*` 代理到 `FASTAPI_BASE_URL`
- `backend/app`：FastAPI 路由、Packycode 调用、SQLite 持久化
- `data/chat.db`：会话与消息存储

主链路保持不变：

`prompt + conversationId -> /api/chat -> text/plain stream -> useCompletion()`

## 启动方式

1. 安装前端依赖

```bash
npm install
```

2. 安装后端依赖

```bash
python -m pip install -r backend/requirements.txt
```

3. 复制环境变量

```powershell
Copy-Item .env.example .env.local
```

4. 填写 `.env.local`

```bash
FASTAPI_BASE_URL=http://127.0.0.1:8000
PACKYCODE_API_KEY=your_api_key
PACKYCODE_BASE_URL=https://codex-api.packycode.com/v1
PACKYCODE_MODEL=gpt-5.4
CHAT_DB_PATH=data/chat.db
```

5. 启动 FastAPI

```bash
npm run dev:backend
```

6. 启动 Next.js

```bash
npm run dev
```

7. 打开 [http://localhost:3000](http://localhost:3000)

## 关键接口

- `POST /api/chat`
  - 请求：`{ prompt, conversationId }`
  - 响应：`text/plain` 流
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}`
- `GET /api/health/network`

## 调试顺序

1. 先直连 FastAPI 接口
2. 再确认 Next rewrites 已生效
3. 最后联调页面流式输出与历史消息

## 常用命令

```bash
npm run lint
npm run build
python -m compileall backend
```
