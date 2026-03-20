"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageRole, ChatMessage } from "@src/types/chat"
import { formatTime } from "@src/lib/chat/format-time"
import { createMessage } from "@src/lib/chat/create-message"

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 但它不是“一个 ChatMessage 类型变量”，而是“一个 ChatMessage[] 类型的状态变量”
  const [lastPrompt, setLastPrompt] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const {
    input,
    setInput,
    completion,
    setCompletion,
    complete,
    stop,
    isLoading,
    error,
  } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish(_prompt, finalText) {
      if (!finalText.trim()) {
        setCompletion("");
        return;
      }
      setMessages(current => [...current, createMessage("assistant", finalText)]);
      // 先把信息归纳为统一格式,
      // 把对话记录存入messages
      setCompletion("");
    },
  });

  const visibleMessages = useMemo(() => {
    if (!completion) {
      return messages;
    }
    return [
      ...messages,
      {
        id: "streaming-assistant",
        role: "assistant" as const,
        // 把这个值收窄成“只读的字面量类型”，不要把它放宽成普通字符串。
        content: completion,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [messages, completion]);
  // 组件第一次渲染时，执行一次函数,之后只有当依赖项变化时，才重新计算

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }, [visibleMessages, error]);
  // 处理聊天内容界面的滚动

  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();

    if (!trimmed || isLoading) {
      return;
    }

    setLastPrompt(trimmed);
    setMessages(current => [...current, createMessage("user", trimmed)]);
    setInput("");

    await complete(trimmed);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendPrompt(input);
  }


  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex h-[88vh] max-w-5xl flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(28,25,23,0.08)]">
        <header className="border-b border-stone-200 px-5 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-500">
            AI Requirement Assistant
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                最小聊天界面
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                保持当前 `useCompletion()` + text stream 链路不变，把单轮结果页升级成可连续对话的聊天 UI。
              </p>
            </div>
            <div className="hidden rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500 sm:block">
              当前协议：`prompt` → `/api/chat` → text stream
            </div>
          </div>
        </header>

        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(245,245,244,0.9),_rgba(255,255,255,1)_40%)] px-4 py-6 sm:px-6"
        >
          {visibleMessages.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/90 p-6 text-sm leading-7 text-stone-500">
              <p className="font-medium text-stone-700">还没有消息</p>
              <p className="mt-2">
                先输入一段需求，例如“请帮我拆解一个后台商品列表页”，观察 user 消息、流式 assistant 气泡和最终消息落盘的完整过程。
              </p>
            </section>
          ) : null}

          {visibleMessages.map(message => {
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
            );
          })}
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-4 sm:px-6">
          {error ? (
            <section className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex flex-wrap items-center gap-3">
                <span>{error.message}</span>
                {lastPrompt ? (
                  <button
                    className="font-medium underline underline-offset-4"
                    type="button"
                    onClick={() => void sendPrompt(lastPrompt)}
                  >
                    重试上一条
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="text-sm font-medium text-stone-700" htmlFor="prompt">
              发送内容
            </label>
            <textarea
              id="prompt"
              name="prompt"
              className="min-h-28 w-full resize-none rounded-3xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
              placeholder="例如：请帮我拆解一个后台管理系统的商品列表页需求"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendPrompt(input);
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || input.trim().length === 0}
                type="submit"
              >
                {isLoading ? "生成中..." : "发送"}
              </button>

              <button
                className="rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isLoading}
                type="button"
                onClick={() => stop()}
              >
                停止生成
              </button>

              <button
                className="rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                type="button"
                onClick={() => {
                  stop();
                  setMessages([]);
                  setCompletion("");
                }}
              >
                清空会话
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
