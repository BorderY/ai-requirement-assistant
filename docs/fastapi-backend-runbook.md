# FastAPI 后端接入说明

## 目标

- 保留 `Next.js` 页面和 `useCompletion()` 调用方式
- 把 `/api/*` 迁到 `FastAPI`
- 继续使用 `SQLite`
- 保持 `POST /api/chat` 返回 `text/plain` 流

## 当前目录

```text
backend/
  app/
    main.py
    schemas.py
    routers/
      chat.py
      conversations.py
      health.py
    services/
      chat_store.py
      packycode_client.py
      settings.py
```

## 启动顺序

1. `python -m pip install -r backend/requirements.txt`
2. `npm run dev:backend`
3. `npm run dev`

## 联调建议

1. 先直连 `http://127.0.0.1:8000/api/conversations`
2. 再测 `http://127.0.0.1:8000/api/chat`
3. 最后确认 `Next` 通过 `next.config.ts` 代理 `/api/:path*`

## 保留的接口契约

- `POST /api/chat`
  - 请求：`{ prompt, conversationId }`
  - 响应：`text/plain; charset=utf-8`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}`
- `GET /api/health/network`

## 关键实现

- `backend/app/routers/chat.py`
  - 先写入 user message
  - 流式调用 Packycode
  - 流结束后再写 assistant message
- `backend/app/services/chat_store.py`
  - 建表
  - 建索引
  - 会话与消息 CRUD
- `next.config.ts`
  - 代理浏览器侧 `/api/*` 到 `FASTAPI_BASE_URL`
