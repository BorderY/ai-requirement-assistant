"use client";

import { useState } from "react";

type ChatResponse = {
  text?: string;
  responseId?: string;
  error?: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [responseId, setResponseId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      setError("请输入测试内容");
      setResult("");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setResponseId("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: trimmedInput }),
      });

      const data = (await res.json()) as ChatResponse;

      if (!res.ok) {
        throw new Error(data.error || "请求失败");
      }

      setResult(data.text || "");
      setResponseId(data.responseId || "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            AI Requirement Assistant
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            模型调用
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            当前只验证最小链路：页面输入，服务端调用模型，再把结果返回页面。
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-700" htmlFor="prompt">
              测试输入
            </label>
            <textarea
              id="prompt"
              className="min-h-40 rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-500"
              placeholder="例如：请用一句话总结前端需求拆解助手的作用"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "请求中..." : "发送到 /api/chat"}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Error</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        ) : null}

        {result ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Model Response</h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7">{result}</p>
            {responseId ? (
              <p className="mt-4 text-xs text-emerald-800">response_id: {responseId}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
