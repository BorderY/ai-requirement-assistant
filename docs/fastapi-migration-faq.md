---
title: FastAPI 迁移 FAQ：为什么这样改，以及常见坑
date: 2026-03-22
tags: [faq, fastapi, nextjs, knowledge-base]
---

# FastAPI 迁移 FAQ：为什么这样改，以及常见坑

## Scope

- Scope: 回答这次 [[Next.js App Router]] 到 [[FastAPI]] 迁移方案里最容易卡住的判断题和常见坑。
- Related topics: [[Streaming Response]] [[SQLite]] [[api-chat-timeout-debug-playbook]] [[从 Next.js Route Handler 到 FastAPI：AI Requirement Assistant 迁移实战教程]]

## Questions

### Q1. 为什么保留 Next 前端，不直接全改 Python？
**Short answer:** 因为这次主要想替换 API 层，而不是同时重写页面、协议和联调方式。  
**Details:**
- 当前页面已经能稳定消费 `text/plain` 流。
- 如果连页面一起重写，出了问题很难判断是 UI、协议还是后端造成的。
- 当你的目标是“低风险迁移 + 顺便学清楚链路”时，保留 Next 前端是更稳的起点。

### Q2. 为什么先不升级到 Responses API 或 SSE？
**Short answer:** 因为这会把“后端框架迁移”变成“后端框架迁移 + 前端协议迁移”。  
**Details:**
- 当前前端已经依赖 `useCompletion({ streamProtocol: "text" })`。
- 只要你还想维持这套消费方式，FastAPI 最自然的返回就是 `text/plain` 流。
- 只有当你明确需要 `responseId`、`usage`、结构化状态时，才值得继续升级协议。

### Q3. `useCompletion` 和 FastAPI 到底怎么配合？
**Short answer:** 前端继续调 `/api/chat`，FastAPI 返回 `StreamingResponse(text/plain)`，两边就能继续对接。  
**Details:**
- `useCompletion` 不是随便收什么都行，它依赖后端返回正确的流式文本。
- 判断是否配合正确，最直接的方法是看 assistant 内容是不是边生成边显示。
- 如果页面最后才一次性出现完整文本，优先怀疑返回协议或代理缓冲。

### Q4. 为什么浏览器请求还写 `/api/chat`，却已经不是 Next Route Handler 了？
**Short answer:** 因为请求路径没变，但实现已经被 Next rewrites 转发到了 FastAPI。  
**Details:**
- 浏览器只关心它请求了哪个 URL。
- 如果 Next 把 `/api/:path*` 转发给 FastAPI，前端代码就不用改绝对地址。
- 判断是否已经走到 FastAPI，最简单的方法是看 FastAPI 终端是否收到了请求。

### Q5. 为什么 SQLite 先不换 PostgreSQL？
**Short answer:** 因为当前项目还是原型阶段，先保留数据层稳定比顺手升级数据库更重要。  
**Details:**
- 现在的持久化需求只有会话和消息，SQLite 足够支撑。
- 迁移 FastAPI 时如果再顺手换数据库，会同时增加 schema、连接、部署三类变量。
- 只有在你明确需要多实例、共享数据库或更复杂查询时，才值得升级。

### Q6. 为什么开发期推荐 Next 反向代理？
**Short answer:** 因为它能让你先专注 FastAPI 本身，不被 CORS 和多环境地址切换分散注意力。  
**Details:**
- 代理后，浏览器仍然只请求本站 `/api/*`。
- 页面代码几乎不用改，学习曲线更平。
- 如果 FastAPI 直连可以、页面不行，再去查代理层，这是更好排的顺序。

### Q7. 什么叫“协议不匹配”？
**Short answer:** 就是前后端对“请求长什么样、响应长什么样”理解不一致。  
**Details:**
- 例如前端按 `text` 流消费，后端却返回 JSON。
- 或者前端传 `prompt + conversationId`，后端却读成别的字段。
- 判断方法是先看网络面板里的请求体和响应头，再看 FastAPI 实际读取的字段。

### Q8. 为什么 user message 先入库，assistant message 后入库？
**Short answer:** 因为用户输入是确定发生的，而 assistant 输出只有在流完整结束后才算稳定结果。  
**Details:**
- 先写 user message，可以保留真实输入记录。
- assistant 如果一边流一边写，容易留下半截文本。
- 判断当前策略是否正确，看报错中断时数据库里是否只保留 user message，而没有脏的 assistant 记录。

### Q9. 如果流式内容不显示，是前端问题还是后端问题？
**Short answer:** 先不要猜，按“FastAPI 直连是否正常”来分层判断。  
**Details:**
- 如果 FastAPI 直连也不流，先查后端返回协议和上游模型调用。
- 如果 FastAPI 直连正常，但页面不流，优先查 Next 代理或前端消费方式。
- 如果页面收到了响应但内容最后一次性出现，优先查代理缓冲或 `Content-Type`。

### Q10. 什么时候才值得继续升级成结构化消息流？
**Short answer:** 当你明确需要元数据而不是只要“显示文本”时。  
**Details:**
- 例如你要展示 `usage`、`finish reason`、`responseId`。
- 或者你要把工具调用、中间状态、阶段性事件单独渲染。
- 在这之前，坚持纯文本流通常更简单，也更适合原型阶段。

## Common mistakes

- 把 FastAPI 迁移理解成“所有层都一起重写” -> 先替换 API 层，先保留前端和协议。
- FastAPI 已经接管了 API，却把前端请求地址也全部改成硬编码绝对路径 -> 第一阶段先用 Next 代理更稳。
- `useCompletion` 还在按文本流消费，后端却改成 JSON 或 SSE -> 先把协议对齐。
- 聊天能显示，但历史恢复为空 -> 检查 assistant 是否真的在流结束后写库。
- FastAPI 直连都没通，就直接在页面上排半天 -> 先独立验证后端接口。

## Related notes

- [[从 Next.js Route Handler 到 FastAPI：AI Requirement Assistant 迁移实战教程]]
- [[api-chat-route-explanation]]
- [[api-chat-timeout-debug-playbook]]
- [[api-health-network-route-explanation]]
