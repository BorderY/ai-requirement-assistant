from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .routers import chat, conversations, health
from .services.chat_store import create_database
from .services.packycode_client import close_packycode_client


def _build_validation_message(error: RequestValidationError) -> str:
    # 前端当前只需要第一条校验错误，避免把 Pydantic 细节原样暴露出去。
    first_error = next(iter(error.errors()), None)

    if not first_error:
        return "invalid request body"

    return str(first_error.get("msg") or "invalid request body")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 启动时先确保 SQLite 表结构存在；退出时统一关闭上游 HTTP client。
    create_database()
    yield
    await close_packycode_client()


# FastAPI(...) 可以理解成“创建整个后端应用实例”。
# 路由、异常处理、启动/退出逻辑，最终都会挂到这个 app 上。
app = FastAPI(
    title="AI Requirement Assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

# include_router(...) 的作用是把不同模块下的接口注册进主应用。
# 这样 main.py 只负责组装，具体接口逻辑放在 routers/ 目录里。
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(health.router)


@app.get("/")
async def root():
    return {"ok": True, "message": "FastAPI backend is running"}


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_request, error: RequestValidationError):
    # Pydantic / FastAPI 在请求体结构不合法时，会先抛 RequestValidationError。
    # 这里统一改成前端更容易消费的 {"error": "..."} 结构。
    return JSONResponse({"error": _build_validation_message(error)}, status_code=400)


@app.exception_handler(HTTPException)
async def handle_http_exception(_request, error: HTTPException):
    # 业务层主动 raise HTTPException(...) 时，也统一收敛成同一种返回格式。
    detail = error.detail if isinstance(error.detail, str) else "request failed"
    return JSONResponse({"error": detail}, status_code=error.status_code)

