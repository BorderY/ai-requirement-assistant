from __future__ import annotations

from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .settings import settings

client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global client

    if client is None:
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

        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta
