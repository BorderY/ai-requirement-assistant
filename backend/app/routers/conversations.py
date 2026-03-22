from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..schemas import CreateConversationRequest
from ..services.chat_store import (
    create_conversation,
    get_conversation_by_id,
    list_conversations,
    list_messages_by_conversation_id,
)

router = APIRouter(prefix="/api", tags=["conversations"])


@router.get("/conversations")
async def get_conversations():
    return {"conversations": list_conversations()}


@router.post("/conversations")
async def post_conversation(body: CreateConversationRequest):
    try:
        conversation = create_conversation(body.title)

        return {
            "conversationId": conversation["id"],
            "title": conversation["title"],
            "createdAt": conversation["createdAt"],
            "updatedAt": conversation["updatedAt"],
        }
    except Exception:
        return JSONResponse({"error": "failed to create conversation"}, status_code=500)


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(conversation_id: str):
    normalized_conversation_id = conversation_id.strip()

    if not normalized_conversation_id:
        return JSONResponse({"error": "conversationId is required"}, status_code=400)

    conversation = get_conversation_by_id(normalized_conversation_id)
    if not conversation:
        return JSONResponse({"error": "conversation not found"}, status_code=404)

    return {
        "conversation": conversation,
        "messages": list_messages_by_conversation_id(normalized_conversation_id),
    }
