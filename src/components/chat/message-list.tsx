import type { ChatMessage } from "@/src/types/chat";
import { formatTime } from "@/src/lib/chat/format-time";

interface MessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
}


export function MessageList({ messages, isLoading }: MessageListProps) {
    if (messages.length == 0) {
        return (
            <section className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/90 p-6 text-sm leading-7 text-stone-500">
                <p className="font-medium text-stone-700">还没有消息</p>
                <p className="mt-2">
                    先输入一段需求，例如“请帮我拆解一个后台商品列表页”，观察 user 消息、流式 assistant 气泡和最终消息落盘的完整过程。
                </p>
            </section>
        )
    }

    return (
        messages.map(message => {

            const isUser = message.role === "user";
            const isStreamingAssistant = message.id === "streaming-assistant";

            return (
                <article
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                    <div
                        className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[78%] ${isUser
                            ? "bg-stone-900 text-stone-50"
                            : "border border-stone-200 bg-stone-50 text-stone-900"
                            }`}
                    >
                        <div
                            className={`mb-2 flex items-center gap-2 text-xs ${isUser ? "text-stone-300" : "text-stone-500"
                                }`}
                        >
                            <span>{isUser ? "You" : "Assistant"}</span>
                            <span>·</span>
                            <span>{formatTime(message.createdAt)}</span>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">
                            {message.content}
                            {!isUser && isStreamingAssistant && isLoading ? (
                                <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded bg-stone-400 align-middle" />
                            ) : null}
                        </p>
                    </div>
                </article>
            )
        })
    )
}