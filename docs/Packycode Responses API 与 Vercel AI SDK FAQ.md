---
title: Packycode Responses API 与 Vercel AI SDK FAQ
date: 2026-03-19
tags: [faq, nextjs, ai-sdk, packycode, knowledge-base]
---

# Packycode Responses API 与 Vercel AI SDK FAQ

## Scope
- Scope: 固化本轮关于 [[Responses API]]、[[Vercel AI SDK]]、[[Next.js Route Handler]]、[[OpenAI Compatible Provider]] 的验证结论与实操要点。
- Related topics: [[Server-Side Logging]] [[Streaming Response]] [[TypeScript Environment Variables]]

## Questions

### Q1. 如何确认 Packycode 的 API Key 是否支持 Responses API？
**Short answer:** 不能只看 `chat/completions` 是否可用，必须直接测试 `/responses`，并区分 `401`、`404`、`400` 的含义。  
**Details:**
- `POST /v1/chat/completions` 返回 `200`，只能证明 key 可用，不代表 `Responses API` 一定可用。
- `POST /v1/responses` 返回 `404`，通常表示网关没有暴露该端点。
- `POST /v1/responses` 返回 `401`，通常表示 key 无效或无权限。
- `POST /v1/responses` 返回 `400`，很多时候不是 key 问题，而是请求体格式不符合网关兼容层要求。
- 本项目在 2026-03-18 的实测结果是：Packycode 的 `/responses` 可用，但要求 `input` 为列表结构。

```python
import os
import requests

url = "https://codex-api.packycode.com/v1/responses"
headers = {
    "Authorization": f"Bearer {os.environ['PACKYCODE_API_KEY']}",
    "Content-Type": "application/json",
}
payload = {
    "model": "gpt-5.4",
    "input": [
        {
            "type": "message",
            "role": "user",
            "content": "Hello",
        }
    ],
}

response = requests.post(url, headers=headers, json=payload, timeout=15)
print(response.status_code)
print(response.text)
```

### Q2. 当前 Packycode `/responses` 的正确请求格式是什么？
**Short answer:** 顶层 `input` 要传数组，数组项建议传 `message`，`content` 可直接给字符串，或给 `input_text` 数组。  
**Details:**
- 最稳妥的写法是 `input: [{ type: "message", role: "user", content: "..." }]`。
- 也可以写成 `content` 数组，但内容类型要用 `input_text`，不要用 `text`。
- 之前报错的根因是把顶层输入写成了 `{ "type": "text", "text": "..." }`，这不是当前网关接受的输入项类型。
- 该网关当前不稳定支持官方文档里的 `input: "hello"` 简写，实测更适合统一使用数组格式。

```json
{
  "model": "gpt-5.4",
  "input": [
    {
      "type": "message",
      "role": "user",
      "content": "Are you using the new Responses API?"
    }
  ]
}
```

```json
{
  "model": "gpt-5.4",
  "input": [
    {
      "type": "message",
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Are you using the new Responses API?"
        }
      ]
    }
  ]
}
```

### Q4. 如何使用 Vercel 开发的 AI SDK 把 `/api/chat` 改成流式返回？
**Short answer:** 服务端用 `streamText()` + `toTextStreamResponse()`，前端用 `useCompletion()` 接文本流。  
**Details:**
- 先安装 `ai`、`@ai-sdk/openai-compatible`、`@ai-sdk/react`。
- 服务端不要再 `return Response.json({ text })`，而是返回 `result.toTextStreamResponse()`。
- 前端不要再 `await res.json()`，而是使用 `useCompletion({ api: "/api/chat" })`。
- `useCompletion` 默认发送 `{ prompt }`，所以后端读取的字段要从 `body.input` 改成 `body.prompt`。

```bash
cd "D:\code Files\nextjs-demo\ai-requirement-assistant"
npm i ai @ai-sdk/openai-compatible @ai-sdk/react
```

```typescript
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const apiKey = process.env.PACKYCODE_API_KEY;
const baseURL = process.env.PACKYCODE_BASE_URL;
const model = process.env.PACKYCODE_MODEL || "gpt-5.4";

if (!apiKey) {
  throw new Error("PACKYCODE_API_KEY is missing");
}

if (!baseURL) {
  throw new Error("PACKYCODE_BASE_URL is missing");
}

const packycode = createOpenAICompatible({
  name: "packycode",
  apiKey,
  baseURL,
});

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = String(body.prompt ?? "").trim();

  const result = streamText({
    model: packycode.chatModel(model),
    prompt,
  });

  return result.toTextStreamResponse();
}
```

### Q6. `maxDuration = 30` 为什么看起来没被使用？
**Short answer:** 这是 Next.js / Vercel 读取的约定导出，不需要在文件里手动引用。  
**Details:**
- `export const maxDuration = 30;` 是路由配置，不是普通业务变量。
- 它告诉平台这条路由最长可运行 30 秒，流式响应里很常见。
- 编辑器可能把它看成“未显式使用”，但框架构建过程会读取它。
- 这类约定导出还包括 `runtime`、`dynamic`、`revalidate` 等。

```typescript
export const maxDuration = 30;
```

### Q7. `page.tsx` 里 `useCompletion()` 到底帮我们做了什么？
**Short answer:** 它接管了输入状态、提交动作、流式文本接收、错误处理和 loading 状态。  
**Details:**
- `input`：当前输入框内容。
- `handleInputChange`：把 `<textarea>` 的变化同步到 `input`。
- `handleSubmit`：自动把当前输入以 `{ prompt }` 发送到 `/api/chat`。
- `completion`：服务端流式返回的文本，会边接收边更新。
- `isLoading` 和 `error`：用于控制按钮状态和错误展示。

```tsx
"use client";

import { useCompletion } from "@ai-sdk/react";

export default function Home() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useCompletion({
    api: "/api/chat",
  });

  return (
    <form onSubmit={handleSubmit}>
      <textarea name="prompt" value={input} onChange={handleInputChange} />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "流式生成中..." : "发送"}
      </button>
      {error ? <p>{error.message}</p> : null}
      <pre>{completion}</pre>
    </form>
  );
}
```

### Q8. 使用 AI SDK 做文本流时，有什么边界需要提前知道？
**Short answer:** `toTextStreamResponse()` 适合“只要文本”的场景，如果还要 `responseId` 等结构化元数据，需要换协议。  
**Details:**
- `toTextStreamResponse()` 返回的是纯文本流，前端拿到的是不断增长的文本。
- 这种方式最适合先快速跑通流式输出。
- 如果页面还要显示 `responseId`、usage、finish reason 等，就要改用 UI message stream 或手写 SSE。
- 当前文档只覆盖“文本流优先”的最小可行方案。

## Common mistakes
- 把 `/responses` 的 `input` 直接写成字符串 -> 在当前网关上优先改成数组。
- 把内容类型写成 `text` -> 在内容数组里应改成 `input_text`。
- 去浏览器 Console 找 `route.ts` 的日志 -> 应该看 `npm run dev` 的终端或 Vercel 日志。
- 服务端改成流式后，前端还在 `await res.json()` -> 应改成 `useCompletion()` 或手写 reader。
- 直接把 `process.env.xxx` 传给 provider -> 先做 `undefined` 校验。

## Related notes
- [[api-chat-route-explanation]]
- [[api-chat-timeout-debug-playbook]]
- [[api-health-network-route-explanation]]
- [[Responses API]]
- [[Vercel AI SDK]]
