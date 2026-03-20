import { MessageRole, ChatMessage } from "@src/types/chat"

export function createMessage(role: MessageRole, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    // 创建随机uuid
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}
// 把对话内容固化的方法