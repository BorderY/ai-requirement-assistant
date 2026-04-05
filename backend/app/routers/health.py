from __future__ import annotations

import os
import time

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..services.settings import settings

router = APIRouter(prefix="/api", tags=["health"])


def build_proxy_state():
    # 这里复用 Node 侧同名环境变量，方便前后端联调时快速对照代理是否真的注入。
    return {
        "nodeUseEnvProxy": os.getenv("NODE_USE_ENV_PROXY", "unset"),
        "hasHttpProxy": bool(os.getenv("HTTP_PROXY")),
        "hasHttpsProxy": bool(os.getenv("HTTPS_PROXY")),
    }


@router.get("/health/network")
async def get_network_health():
    # 这个接口不是查业务状态，而是专门查“当前后端进程能不能访问上游模型网关”。
    started_at = time.perf_counter()
    proxy = build_proxy_state()

    if not settings.packycode_base_url:
        return JSONResponse(
            {
                "ok": False,
                "message": "PACKYCODE_BASE_URL is missing",
                "durationMs": int((time.perf_counter() - started_at) * 1000),
                "proxy": proxy,
            },
            status_code=500,
            headers={"Cache-Control": "no-store"},
        )

    if not settings.packycode_api_key:
        return JSONResponse(
            {
                "ok": False,
                "message": "PACKYCODE_API_KEY is missing",
                "durationMs": int((time.perf_counter() - started_at) * 1000),
                "proxy": proxy,
            },
            status_code=500,
            headers={"Cache-Control": "no-store"},
        )

    target = f"{settings.normalized_packycode_base_url}/models"

    try:
        async with httpx.AsyncClient(
            timeout=settings.packycode_health_timeout_ms / 1000,
            # 让 httpx 继承当前进程代理环境变量，便于直接复用本地代理配置。
            trust_env=True,
        ) as client:
            # 这里故意只打一个很轻量的 /models，请求足够便宜，也足够说明网络是否通。
            response = await client.get(
                target,
                headers={"Authorization": f"Bearer {settings.packycode_api_key}"},
            )

        duration_ms = int((time.perf_counter() - started_at) * 1000)
        ok = response.is_success

        return JSONResponse(
            {
                "ok": ok,
                "message": "network is reachable" if ok else "upstream returned non-2xx",
                "durationMs": duration_ms,
                "target": target,
                "status": response.status_code,
                "details": response.text[:240] or None,
                "proxy": proxy,
            },
            status_code=200 if ok else 503,
            headers={"Cache-Control": "no-store"},
        )
    except Exception as error:
        return JSONResponse(
            {
                "ok": False,
                "message": "network check failed",
                "durationMs": int((time.perf_counter() - started_at) * 1000),
                "target": target,
                "details": str(error) or "unknown error",
                "proxy": proxy,
            },
            status_code=503,
            headers={"Cache-Control": "no-store"},
        )
