from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


MessageRole = Literal["user", "assistant"]


class ChatRequest(BaseModel):
    prompt: str = ""
    conversationId: str = ""


class CreateConversationRequest(BaseModel):
    title: str = ""


class ConversationRecord(BaseModel):
    id: str
    title: str
    createdAt: str
    updatedAt: str


class MessageRecord(BaseModel):
    id: str
    conversationId: str
    role: MessageRole
    content: str
    createdAt: str
