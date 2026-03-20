---
title: API Chat 超时排查实战
tags: [debug, nextjs, proxy, network, ai-sdk, packycode]
created: 2026-03-17
updated: 2026-03-19
---

# API Chat 超时排查实战（可复用）

> 场景：页面调用 `/api/chat` 报 `500`、长时间无返回，或者看起来“接口没坏但页面就是不出字”。

## 1) 先看这次排查后的最终结论

这次问题实际混在一起的是 3 类：

### 问题 A：Node 进程无法稳定出网

- 浏览器能访问，不代表 Node 进程也能访问
- 机器有系统代理，不代表 Next.js dev server 自动继承
- 所以浏览器 / PowerShell 可能正常，服务端模型请求仍然超时

### 问题 B：底层 raw `/responses` 请求体结构不匹配

- 这是历史排障阶段的重要结论
- 当时 `/responses` 的 `400` 不是 key 失效
- 关键是 `input` 结构不符合兼容层预期
- 该结论现在主要用于底层排障，不是当前仓库默认实现

### 问题 C：当前 AI SDK 路由契约不匹配

当前最终实现已经变成：

- 前端发送 `{ prompt }`
- 服务端读取 `body.prompt`
- 服务端返回 `toTextStreamResponse()` 的纯文本流

如果你还按旧思路处理：

- 服务端读 `body.input`
- 前端按 `res.json()` 读返回

页面就会表现成“像超时、像没返回、像不兼容”，但本质是协议没对齐。

### 当前最终路线

- 默认工程实现：AI SDK `streamText()` + `useCompletion()`
- 网关底层验证：raw `/responses`
- 最后兜底：raw `chat.completions`

---

## 2) 这次排查是怎么推进的

### Step A：先确认错误层级

现象：前端报 `500 (Internal Server Error)`，或页面一直没有正常显示流式文本。

判断：

- 问题不一定在页面渲染本身
- 可能在 `/api/chat` 路由内部
- 也可能在服务端出网能力
- 还可能是前后端协议没对齐

### Step B：区分“网络问题”和“协议问题”

要先区分两类错误：

- timeout / DNS / 443 连接失败 -> 网络问题
- `prompt` 字段不对 / 前端按 JSON 解析文本流 -> 协议问题

### Step C：检查当前默认契约

当前最容易错的两个点：

```ts
const prompt = String(body.prompt ?? "").trim();
return result.toTextStreamResponse();
```

你应该重点检查：

- 页面是不是还在传 `input`
- 页面是不是还在按 JSON 解析返回
- 结果区是不是绑定到了 `completion`

### Step D：确认 Node 是否真正走了代理

即使 `PACKYCODE_BASE_URL/models` 在浏览器里能访问，也不能证明 Node 进程一定能通。

要检查：

- `NODE_USE_ENV_PROXY`
- `HTTP_PROXY`
- `HTTPS_PROXY`

推荐优先使用：

```powershell
npm run dev:proxy
```

### Step E：只有在需要底层验证时，才回到 raw `/responses`

如果你要直接验证网关兼容性，再检查类似：

```ts
input: [
  {
    type: "message",
    role: "user",
    content: input,
  },
]
```

这一步是为了验证底层网关，不是当前页面 streaming 的默认实现。

---

## 3) 这次最终落实到项目里的工程结论

### 关于主实现

当前主路线：

- `useCompletion()`
- `streamText()`
- `toTextStreamResponse()`

不再默认使用 raw `chat.completions` 或手写 raw `/responses` streaming 作为主实现。

### 关于代理

开发机如果需要代理，应优先使用：

```powershell
npm run dev:proxy
```

这会自动注入：

- `NODE_USE_ENV_PROXY=1`
- `HTTP_PROXY=<proxy>`
- `HTTPS_PROXY=<proxy>`

### 关于 `PACKYCODE_TIMEOUT_MS`

当前 `route.ts` 文件里虽然还保留了 `PACKYCODE_TIMEOUT_MS` 的读取代码，但活跃的 AI SDK 调用路径并没有把它接到 `streamText()` provider 上。

因此当前排 timeout 时，优先检查：

- 网络 / 代理
- 平台运行时预算（例如 `maxDuration = 30`）
- 前后端协议是否匹配

不要先假设改这个 env 就一定生效。

---

## 4) 可直接复用的排查命令（Windows PowerShell）

### 4.1 查看系统代理

```powershell
$proxy = [System.Net.WebRequest]::GetSystemWebProxy()
$proxy.GetProxy([Uri]"https://codex-api.packycode.com/v1/models")
```

### 4.2 启用 Node 使用环境代理（当前终端生效）

```powershell
$env:NODE_USE_ENV_PROXY="1"
$env:HTTP_PROXY="http://127.0.0.1:61092"
$env:HTTPS_PROXY="http://127.0.0.1:61092"
npm run dev
```

### 4.3 快速验证 Node 是否能出网

```powershell
node -e "fetch('https://example.com',{signal:AbortSignal.timeout(8000)}).then(r=>console.log(r.status)).catch(e=>console.error(e.message))"
```

### 4.4 验证网络诊断接口

```powershell
curl http://localhost:3000/api/health/network
```

---

## 5) 通用排查模板

以后再遇到类似问题，按这个顺序走：

1. 先确认错误发生在哪一层：前端、API 路由、上游模型、网络
2. 先确认当前契约是不是 `{ prompt } -> 文本流`
3. 再区分是网络超时还是协议问题
4. 对兼容网关，只有在底层验证时才回到 raw `/responses`
5. 最后才考虑临时 fallback 到 raw `chat.completions`

---

## 6) 这次最重要的经验

- “浏览器能访问”不等于“Node 进程能访问”
- “页面没出字”不一定是模型没返回，也可能是前后端流协议不匹配
- 当前 AI SDK 路线的关键契约是：`prompt` 和纯文本流
- raw `/responses` 的消息列表 `input` 结论，主要用于底层排障

---

## 7) 当前推荐动作

如果你再次遇到 `/api/chat` 失败：

1. 先查 `/api/health/network`
2. 再查代理环境变量和 `npm run dev:proxy`
3. 再查页面是否真的发送了 `{ prompt }`
4. 再查服务端是否 `return result.toTextStreamResponse()`
5. 最后才回到底层 raw `/responses` 验证