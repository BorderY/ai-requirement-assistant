"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@src/types/chat";
import { createMessage } from "@src/lib/chat/create-message";
import { ErrorBanner } from "@src/components/chat/error-banner";
import { MessageList } from "@src/components/chat/message-list";
import { PromptForm } from "@src/components/chat/prompt-form";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastPrompt, setLastPrompt] = useState("");
  // 当前会话 id 是前端和持久化链路衔接的关键状态。
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  // localError 用来承接创建会话这类不在 useCompletion 内部产生的错误。
  const [localError, setLocalError] = useState<string | null>(null);
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

      // 只有流完整结束后，才把 assistant 最终内容固化进消息列表。
      setMessages(current => [...current, createMessage("assistant", finalText)]);
      setCompletion("");
    },
  });

  const visibleMessages = useMemo(() => {
    if (!completion) {
      return messages;
    }

    // completion 只代表“正在生成中的 assistant 气泡”，不直接写入正式消息列表。
    return [
      ...messages,
      {
        id: "streaming-assistant",
        role: "assistant" as const,
        content: completion,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [messages, completion]);

  // 每次消息列表、错误状态变化后，把滚动条推到底部，保证聊天阅读体验。
  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }, [visibleMessages, error, localError]);

  // 第一次发送前先创建会话；后续发送复用已有 conversationId。
  async function ensureConversationId(firstPrompt: string) {
    if (currentConversationId) {
      return currentConversationId;
    }

    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: firstPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error("failed to create conversation");
    }

    const data = (await response.json()) as { conversationId: string };
    setCurrentConversationId(data.conversationId);
    return data.conversationId;
  }

  // 发送流程现在分两段：先确保会话存在，再把 conversationId 带给 /api/chat。
  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) {
      return;
    }

    try {
      setLocalError(null);

      const conversationId = await ensureConversationId(trimmed);

      setLastPrompt(trimmed);
      setMessages(current => [...current, createMessage("user", trimmed)]);
      setInput("");

      await complete(trimmed, {
        body: {
          conversationId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      setLocalError(message);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendPrompt(input);
  }

  function onInputChange(value: string) {
    if (localError) {
      setLocalError(null);
    }

    setInput(value);
  }

  function onQuickSubmit() {
    void sendPrompt(input);
  }

  function onStop() {
    stop();
  }

  // 清空时不仅清页面消息，也清掉当前会话 id，避免误写入旧会话。
  function onClear() {
    setMessages([]);
    setCompletion("");
    setCurrentConversationId(null);
    setLocalError(null);
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
                保持当前 `useCompletion()` + text stream 链路不变，并给当前聊天补上最小会话持久化能力。
              </p>
            </div>
            <div className="hidden rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500 sm:block">
              <p>
                当前协议：<code>prompt + conversationId</code> -&gt; <code>/api/chat</code> -&gt; <code>text stream</code>
              </p>
              <p className="mt-2">
                当前会话：{currentConversationId ?? "未创建"}
              </p>
            </div>
          </div>
        </header>

        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(245,245,244,0.9),_rgba(255,255,255,1)_40%)] px-4 py-6 sm:px-6"
        >
          <MessageList messages={visibleMessages} isLoading={isLoading} />
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-4 sm:px-6">
          {error || localError ? (
            <ErrorBanner
              message={localError ?? error?.message ?? "Error"}
              canRetry={!!lastPrompt}
              onRetryClick={() => sendPrompt(lastPrompt)}
            />
          ) : null}
          <PromptForm
            onInputChange={onInputChange}
            onSubmit={handleSubmit}
            onStop={onStop}
            onQuickSubmit={onQuickSubmit}
            onClear={onClear}
            input={input}
            isLoading={isLoading}
          />
        </div>
      </div>
    </main>
  );
}