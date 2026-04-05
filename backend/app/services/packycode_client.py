from __future__ import annotations

from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .settings import settings

client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global client

    if client is None:
        # 进程内复用同一个 AsyncOpenAI client，避免每次请求都重新建连接池。
        client = AsyncOpenAI(
            api_key=settings.packycode_api_key,
            base_url=settings.normalized_packycode_base_url,
            timeout=settings.packycode_request_timeout_seconds,
        )

    return client


async def close_packycode_client():
    global client

    if client is None:
        return

    # 应用退出时主动 close，避免开发期热重载后残留未关闭连接。
    await client.close()
    client = None


async def stream_chat_text(prompt: str) -> AsyncIterator[str]:
    stream = await get_client().chat.completions.create(
        model=settings.packycode_model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue

        # 当前前端仍按纯文本流消费，所以这里只透传 assistant 的文本增量。
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta
