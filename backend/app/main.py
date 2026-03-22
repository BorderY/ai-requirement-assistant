from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .routers import chat, conversations, health
from .services.chat_store import create_database
from .services.packycode_client import close_packycode_client


def _build_validation_message(error: RequestValidationError) -> str:
    first_error = next(iter(error.errors()), None)

    if not first_error:
        return "invalid request body"

    return str(first_error.get("msg") or "invalid request body")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_database()
    yield
    await close_packycode_client()


app = FastAPI(
    title="AI Requirement Assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(health.router)


@app.get("/")
async def root():
    return {"ok": True, "message": "FastAPI backend is running"}


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_request, error: RequestValidationError):
    return JSONResponse({"error": _build_validation_message(error)}, status_code=400)


@app.exception_handler(HTTPException)
async def handle_http_exception(_request, error: HTTPException):
    detail = error.detail if isinstance(error.detail, str) else "request failed"
    return JSONResponse({"error": detail}, status_code=error.status_code)
