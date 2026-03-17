# AI Requirement Assistant

用于练习 AI 应用开发的 Next.js 项目骨架，当前阶段目标是完成第一次模型调用，并为后续的需求拆解助手做准备。

## Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS 4
- OpenAI Responses API

## Run Locally

1. 安装依赖

```bash
npm install
```

2. 创建环境变量文件

```bash
copy .env.example .env.local
```

3. 在 `.env.local` 中填写 `OPENAI_API_KEY`

4. 启动开发环境

```bash
npm run dev
```

如在公司网络下需要代理（Windows）：

```bash
npm run dev:proxy
```

可选：覆盖默认代理地址（默认 `http://127.0.0.1:61092`）：

```powershell
$env:LOCAL_PROXY_URL="http://127.0.0.1:7890"
npm run dev:proxy
```

5. 打开 [http://localhost:3000](http://localhost:3000)

## 公司网络/代理环境说明

- 症状：`/api/chat` 返回 500，错误为 `Request timed out.`。
- 原因：Node.js 进程默认不一定读取系统代理设置，导致 SDK 请求无法出网。
- 处理：使用 `npm run dev:proxy` 启动，自动注入：
  - `NODE_USE_ENV_PROXY=1`
  - `HTTP_PROXY=<proxy>`
  - `HTTPS_PROXY=<proxy>`

## 网络诊断接口

提供 `GET /api/health/network` 用于快速自检服务端网络连通性（基于 `PACKYCODE_BASE_URL/models`）。

返回内容包含：
- `ok`：是否联通成功
- `status`：上游 HTTP 状态码（若有）
- `durationMs`：耗时
- `proxy`：当前 Node 进程是否检测到代理环境变量

示例：

```bash
curl http://localhost:3000/api/health/network
```

## 文档

- `/api/chat` 路由说明与时序图：`docs/api-chat-route-explanation.md`
- `/api/health/network` 路由说明与时序图：`docs/api-health-network-route-explanation.md`

- 超时排查手册：`docs/api-chat-timeout-debug-playbook.md`

## Current Structure

```txt
src/
  app/
    api/
      chat/
        route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    chat/
    common/
  lib/
  types/
```

## Current Goal

- 完成服务端环境变量配置
- 打通 `POST /api/chat`
- 从页面发送输入并显示模型返回
- 记录输入、输出、错误

## 运行codex cli工具

```
codex -s danger-full-access -a never
````
