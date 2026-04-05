from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


MessageRole = Literal["user", "assistant"]


class ChatRequest(BaseModel):
    # 给空字符串默认值的好处是：前端少字段时，错误会统一收敛到我们自己的业务校验提示。
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


