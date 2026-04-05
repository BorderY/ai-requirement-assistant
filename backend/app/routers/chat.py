from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from ..schemas import ChatRequest
from ..services.chat_store import (
    get_conversation_by_id,
    insert_message,
    touch_conversation,
)
from ..services.packycode_client import stream_chat_text
from ..services.settings import settings

router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)


def get_error_message(error: Exception) -> str:
    # 路由最终返回给前端的错误文本要尽量直接，不要把 Python 异常对象原样甩出去。
    message = str(error).strip() or "unknown error"

    if "timed out" in message.lower():
        return "Request timed out. Check proxy/network for FastAPI runtime."

    return message


@router.post("/chat")
async def post_chat(body: ChatRequest):
    try:
        # FastAPI 已经先帮我们把 JSON 解析成了 ChatRequest，
        # 这里直接像普通对象一样拿字段即可。
        prompt = body.prompt.strip()
        conversation_id = body.conversationId.strip()

        config_error = settings.missing_packycode_config()
        if config_error:
            return JSONResponse({"error": config_error}, status_code=500)

        if not prompt:
            return JSONResponse({"error": "prompt is required"}, status_code=400)

        if not conversation_id:
            return JSONResponse({"error": "conversationId is required"}, status_code=400)

        conversation = get_conversation_by_id(conversation_id)
        if not conversation:
            return JSONResponse({"error": "conversation not found"}, status_code=404)

        insert_message(conversation_id=conversation_id, role="user", content=prompt)
        touch_conversation(conversation_id)

        collected_chunks: list[str] = []

        async def event_stream():
            # 只有流完整结束后才落 assistant，避免数据库里留下半截回答。
            stream_completed = False

            try:
                # async for 表示“异步地一段一段读流”。
                # 每 yield 一次，前端就能尽快收到一小段文本。
                async for chunk in stream_chat_text(prompt):
                    collected_chunks.append(chunk)
                    yield chunk

                stream_completed = True
            except Exception:
                logger.exception("[/api/chat] stream error")
                raise
            finally:
                if stream_completed:
                    final_text = "".join(collected_chunks).strip()

                    if final_text:
                        try:
                            insert_message(
                                conversation_id=conversation_id,
                                role="assistant",
                                content=final_text,
                            )
                            touch_conversation(conversation_id)
                        except Exception:
                            logger.exception("[/api/chat] persist assistant message error")

        # StreamingResponse 是 FastAPI 里做流式输出的核心类。
        # 只要 event_stream() 持续 yield，浏览器就会持续收到文本片段。
        return StreamingResponse(
            event_stream(),
            media_type="text/plain; charset=utf-8",
        )
    except Exception as error:
        logger.exception("[/api/chat] error")
        return JSONResponse({"error": get_error_message(error)}, status_code=500)
