---
title: API Chat 超时排查实战
tags: [debug, nextjs, openai-sdk, proxy, network]
created: 2026-03-17
---

# API Chat 超时排查实战（可复用）

> 场景：页面调用 `/api/chat` 报 `500`，后续报错为 `Request timed out.`

## 1) 先看结论（这次问题的根因）

- 根因不是前端逻辑，而是 **Node 进程无法直接连外网**。
- 机器有系统代理，但 Node 默认不自动使用系统代理。
- 所以浏览器/PowerShell 可能能通，Node SDK 仍然超时。
- 另外该网关对 `responses` 端点兼容性不好，改用 `chat.completions` 更稳。

---

## 2) 这次的排查路径（按“现象 -> 假设 -> 验证 -> 结论”）

### Step A：确认错误位置在服务端

- 现象：前端 `chat:1 500 (Internal Server Error)`。
- 假设：`/api/chat` 路由内部调用模型失败。
- 验证：阅读 `src/app/api/chat/route.ts`，发现 `catch` 里统一返回 500。
- 结论：先增强错误信息回传，避免“黑盒”。

### Step B：分离“业务参数问题”与“网络问题”

- 假设 1：模型名/API Key/BaseURL 填错。
- 验证：直接请求 `BASE_URL/models`，状态可达（200）。
- 结论：Key/BaseURL 大概率可用，不是纯配置错误。

### Step C：验证 SDK 调用链路

- 假设：SDK 对某端点不兼容或请求体格式不匹配。
- 验证：
  - `/responses` 返回 400：`Input must be a list`（网关兼容差异）。
  - `/chat/completions` 直接 HTTP 调用能成功。
- 结论：优先改为 `chat.completions`。

### Step D：确认是否 Node 网络层问题

- 现象：Node 中 `fetch('https://example.com')` 都超时。
- 假设：Node 出网被拦截/必须走代理。
- 验证：
  - `Test-NetConnection example.com -Port 443` 失败。
  - `GetSystemWebProxy().GetProxy(...)` 返回代理：`http://127.0.0.1:61092/`。
- 结论：Node 必须显式启用环境代理。

### Step E：验证最终修复

- 设置环境变量后重试成功：
  - `NODE_USE_ENV_PROXY=1`
  - `HTTP_PROXY=http://127.0.0.1:61092`
  - `HTTPS_PROXY=http://127.0.0.1:61092`
- `/api/chat` 调用恢复正常。

---

## 3) 本项目最终改动点

文件：`src/app/api/chat/route.ts`

- 增加 `timeout`（默认 30s，可通过 `PACKYCODE_TIMEOUT_MS` 覆盖）。
- 设置 `maxRetries: 0`，避免超时时间被重试拉长。
- 统一改用 `client.chat.completions.create(...)`。
- 超时错误给出更可读提示（便于快速定位到网络/代理层）。

---

## 4) 可直接复用的命令清单（Windows PowerShell）

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

---

## 5) 通用排查模板（以后照抄）

1. **先确定层级**：前端报错 vs API 路由报错 vs 上游模型报错。  
2. **先让错误可见**：服务端返回真实错误信息，不要只返回固定文案。  
3. **做最小可复现实验**：同样参数，分别用 SDK 与原生 HTTP 调。  
4. **验证网络基本盘**：DNS、443 端口、代理、证书。  
5. **最后再调业务参数**：模型名、请求格式、兼容端点。  

---

## 6) 常见误区

- 浏览器能访问 ≠ Node 能访问（代理链路经常不同）。
- PowerShell `Invoke-WebRequest` 能通 ≠ SDK 一定能通。
- 超时默认可能会重试，导致“看起来卡很久”。
- 第三方 OpenAI 兼容网关不一定完整支持 `responses`。

---

## 7) 已落地的工程化改进

### 7.1 开发机代理启动脚本（已实现）

- 新增脚本：`package.json` -> `dev:proxy`
- 执行文件：`scripts/dev-with-proxy.ps1`
- 行为：
  - 自动注入 `NODE_USE_ENV_PROXY=1`
  - 自动注入 `HTTP_PROXY` 与 `HTTPS_PROXY`
  - 默认代理地址：`http://127.0.0.1:61092`
  - 可通过 `LOCAL_PROXY_URL` 覆盖

使用方式：

```powershell
npm run dev:proxy
```

覆盖默认代理：

```powershell
$env:LOCAL_PROXY_URL="http://127.0.0.1:7890"
npm run dev:proxy
```

### 7.2 README 代理说明（已实现）

- 已在 `README.md` 增加“公司网络/代理环境说明”
- 包含症状、根因、处理方式、命令示例

### 7.3 网络诊断接口（已实现）

- 新增接口：`GET /api/health/network`
- 文件：`src/app/api/health/network/route.ts`
- 诊断内容：
  - 能否访问 `PACKYCODE_BASE_URL/models`
  - 上游状态码与耗时
  - 当前进程是否设置代理变量
- 适用场景：
  - 快速判断是“业务参数问题”还是“网络/代理问题”

调用示例：

```powershell
curl http://localhost:3000/api/health/network
```
