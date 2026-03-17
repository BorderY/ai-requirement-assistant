# `./src/app/api/health/network/route.ts` 代码说明

## 文件定位

- 路径：`./src/app/api/health/network/route.ts`
- 类型：Next.js App Router 的 Route Handler
- 方法：`GET`
- 作用：检测服务端到上游模型网关的网络连通性，并返回代理/耗时/状态信息

---

## 1) 数据结构：`HealthPayload`

接口响应统一为 `HealthPayload`，核心字段：

- `ok`：连通性是否成功
- `message`：结果说明
- `durationMs`：本次检测耗时
- `target`：实际探测地址（`<baseURL>/models`）
- `status`：上游 HTTP 状态码（若请求成功发出）
- `details`：上游响应片段或错误信息
- `proxy`：当前 Node 进程代理环境信息

---

## 2) 代理状态采集：`buildProxyState()`

返回当前进程的代理相关环境变量状态：

- `nodeUseEnvProxy`：`NODE_USE_ENV_PROXY`，未设置则 `"unset"`
- `hasHttpProxy`：是否存在 `HTTP_PROXY`
- `hasHttpsProxy`：是否存在 `HTTPS_PROXY`

用于快速判断「Node 进程有没有正确拿到代理配置」。

---

## 3) 接口主流程：`GET()`

### 步骤 A：初始化上下文

- 记录开始时间 `startedAt`，后续用于计算 `durationMs`
- 读取环境变量：
  - `PACKYCODE_BASE_URL`
  - `PACKYCODE_API_KEY`
  - `PACKYCODE_HEALTH_TIMEOUT_MS`（默认 `8000` ms）

### 步骤 B：前置校验

1. `PACKYCODE_BASE_URL` 缺失  
   - 返回 `500` + `ok: false` + `"PACKYCODE_BASE_URL is missing"`
2. `PACKYCODE_API_KEY` 缺失  
   - 返回 `500` + `ok: false` + `"PACKYCODE_API_KEY is missing"`

两种情况都带 `Cache-Control: no-store`，避免缓存诊断结果。

### 步骤 C：发起探测请求

- 目标地址：`new URL("models", baseURL).toString()`
- 使用 `fetch(target)`，配置：
  - `method: "GET"`
  - `Authorization: Bearer <apiKey>`
  - `signal: AbortSignal.timeout(timeoutMs)`（超时中断）
  - `cache: "no-store"`

### 步骤 D：处理上游响应

- 读取响应文本并截断前 240 字符作为 `details`
- 若 `response.ok === true`：
  - 返回 `200`
  - `message: "network is reachable"`
- 若 `response.ok === false`：
  - 返回 `503`
  - `message: "upstream returned non-2xx"`

### 步骤 E：异常兜底

若 `fetch` 抛错（超时、DNS、连接失败等）：

- 返回 `503`
- `message: "network check failed"`
- `details` 填入错误消息

---

## 时序图（调用 `/api/health/network`）

```mermaid
sequenceDiagram
    autonumber
    participant Client as Browser / curl
    participant API as /api/health/network
    participant Upstream as PACKYCODE_BASE_URL/models

    Client->>API: GET /api/health/network
    API->>API: 读取 env + buildProxyState()

    alt PACKYCODE_BASE_URL 缺失
        API-->>Client: 500 { ok:false, message:"PACKYCODE_BASE_URL is missing", proxy }
    else PACKYCODE_API_KEY 缺失
        API-->>Client: 500 { ok:false, message:"PACKYCODE_API_KEY is missing", proxy }
    else 配置完整
        API->>Upstream: GET /models (Authorization: Bearer ...)
        alt 上游 2xx
            Upstream-->>API: 2xx + body
            API-->>Client: 200 { ok:true, message:"network is reachable", status, durationMs, details, proxy }
        else 上游非 2xx
            Upstream-->>API: non-2xx + body
            API-->>Client: 503 { ok:false, message:"upstream returned non-2xx", status, durationMs, details, proxy }
        end
    end

    opt 超时/网络异常
        API-->>Client: 503 { ok:false, message:"network check failed", details:error.message, proxy }
    end
```

---

## 响应示例

### 成功（200）

```json
{
  "ok": true,
  "message": "network is reachable",
  "durationMs": 327,
  "target": "https://example.com/v1/models",
  "status": 200,
  "details": "{\"object\":\"list\",\"data\":[...]}",
  "proxy": {
    "nodeUseEnvProxy": "1",
    "hasHttpProxy": true,
    "hasHttpsProxy": true
  }
}
```

### 上游异常（503）

```json
{
  "ok": false,
  "message": "upstream returned non-2xx",
  "durationMs": 291,
  "target": "https://example.com/v1/models",
  "status": 401,
  "details": "{\"error\":{\"message\":\"Invalid API key\"}}",
  "proxy": {
    "nodeUseEnvProxy": "1",
    "hasHttpProxy": true,
    "hasHttpsProxy": true
  }
}
```

### 网络失败（503）

```json
{
  "ok": false,
  "message": "network check failed",
  "durationMs": 8010,
  "target": "https://example.com/v1/models",
  "details": "The operation was aborted due to timeout",
  "proxy": {
    "nodeUseEnvProxy": "unset",
    "hasHttpProxy": false,
    "hasHttpsProxy": false
  }
}
```

