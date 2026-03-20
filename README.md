# AI Requirement Assistant

用于练习 AI 应用开发的 Next.js 项目骨架。

当前最小版本已经确定使用 Vercel AI SDK 做文本流输出：

- 服务端：`streamText()`
- 前端：`useCompletion()`
- 网关接入：`@ai-sdk/openai-compatible` -> PackyCode

raw `Responses API` 的兼容性已经验证过，但它现在主要保留为底层排障知识，不是当前仓库默认运行的代码路径。

## Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS 4
- `ai`
- `@ai-sdk/react`
- `@ai-sdk/openai-compatible`
- `openai`（当前主要保留给底层兼容性排查 / 历史实现）

## Run Locally

1. 安装依赖

```bash
npm install
```

2. 创建环境变量文件

```bash
copy .env.example .env.local
```

3. 在 `.env.local` 中填写：

```bash
PACKYCODE_API_KEY=你的key
PACKYCODE_BASE_URL=https://你的网关地址/v1
PACKYCODE_MODEL=gpt-5.4
```

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

## 当前 `/api/chat` 契约

当前页面通过 `useCompletion()` 调用 `/api/chat`。

### 请求体

默认发送：

```json
{
  "prompt": "请用一句话总结前端需求拆解助手的作用"
}
```

### 服务端实现

当前 `src/app/api/chat/route.ts` 的核心是：

```ts
const result = streamText({
  model: packycode.chatModel(model),
  prompt,
});

return result.toTextStreamResponse();
```

### 返回值

当前返回的是纯文本流，不是 JSON。

因此：

- 前端应该使用 `useCompletion()` 之类的文本流消费者
- 不应该再按 `res.json()` 解析返回
- 如果未来要返回 `responseId`、usage 等元数据，需要换协议

## Raw Responses API 背景

这个仓库虽然最终没有直接运行 raw `/responses` streaming，但已经确认一件事：

- PackyCode 的 raw `/responses` 可以验证
- 某些情况下 `input` 需要使用消息列表结构

也就是：

```ts
input: [
  {
    type: "message",
    role: "user",
    content: input,
  },
]
```

这段知识现在主要用于底层调试，不是当前默认实现。

## 公司网络 / 代理环境说明

- 症状：`/api/chat` 返回 500，错误为 `Request timed out.`
- 原因：Node.js 进程默认不一定读取系统代理设置，导致服务端模型请求无法出网
- 处理：使用 `npm run dev:proxy` 启动，自动注入：
  - `NODE_USE_ENV_PROXY=1`
  - `HTTP_PROXY=<proxy>`
  - `HTTPS_PROXY=<proxy>`

## 网络诊断接口

提供 `GET /api/health/network` 用于快速自检服务端网络连通性（基于 `PACKYCODE_BASE_URL/models`）。

它能帮助你判断：

- Node 进程是否能访问上游
- 代理环境变量是否注入成功
- API Key / baseURL 是否至少能完成基础连通测试

但它不能证明：

- `/api/chat` 的 `prompt` 契约一定正确
- 文本流一定已经正确返回到页面
- AI SDK provider 级行为一定没问题

示例：

```bash
curl http://localhost:3000/api/health/network
```

## 文档

- `/api/chat` 路由说明：`docs/api-chat-route-explanation.md`
- `/api/health/network` 路由说明：`docs/api-health-network-route-explanation.md`
- 代理与超时排查手册：`docs/api-chat-timeout-debug-playbook.md`
- PackyCode / Responses / AI SDK FAQ：`docs/Packycode Responses API 与 Vercel AI SDK FAQ.md`

## Current Structure

```txt
src/
  app/
    api/
      chat/
        route.ts
      health/
        network/
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

- 保持当前 AI SDK 文本流链路稳定
- 补齐更清晰的聊天 UI 和状态管理
- 继续为后续结构化输出和会话持久化做准备