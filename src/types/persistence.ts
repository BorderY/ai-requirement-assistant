import type { MessageRole } from "@src/types/chat";

// 会话级记录：用于列表展示、排序和恢复某段历史聊天。
export type ConversationRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

// 消息级记录：用于恢复某个会话里的具体聊天内容。
export type MessageRecord = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};